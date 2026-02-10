import { Router, Request, Response } from 'express';
import { pool } from '../config/database.js';
import { deleteTenantData, getAllTenantData, getTenantData, setTenantData } from '../services/tenant-data-store.js';
import { optionalAuth, AuthRequest } from '../middleware/auth.js';
import { checkPlanLimits, updateSubscriptionQuantity } from '../services/subscription.js';

const router = Router();

// Only expose error details in development mode
const isDevelopment = process.env.NODE_ENV !== 'production';

// Keys that should always be arrays
// Centralized list to prevent "forEach is not a function" errors
const ARRAY_KEYS = [
  'chores', 'children', 'assignments', 'completions', 'rewards', 'purchases',
  'chore-history', 'dismissed-missed-chores', 'tracked-goals', 'categories',
  'point-swaps', 'bonus-completions', 'child-availability'
];
const PLAN_LIMIT_KEYS = ['children', 'chores', 'rewards'] as const;
type PlanLimitKey = (typeof PLAN_LIMIT_KEYS)[number];

/**
 * Check if the request is from Spark runtime (@github/spark useKV hook).
 * 
 * Spark runtime sends Content-Type: text/plain on GET requests to identify itself,
 * which is non-standard but is how we detect Spark requests. When detected, we return
 * raw JSON as text/plain instead of the wrapped JSON format used by the custom API client.
 */
function isSparkRequest(req: Request): boolean {
  const contentTypeHeader = req.get('content-type') || '';
  return contentTypeHeader.includes('text/plain');
}

/**
 * Send a null response in the appropriate format (Spark or standard API).
 * Used for non-existent keys to avoid 404 errors in the browser console.
 */
function sendNullResponse(req: Request, res: Response): void {
  if (isSparkRequest(req)) {
    res.type('text/plain').send('null');
  } else {
    res.json({ value: null });
  }
}

function getPlanLimitForKey(
  key: PlanLimitKey,
  limits: Awaited<ReturnType<typeof checkPlanLimits>>
): number | null {
  switch (key) {
    case 'children':
      return limits.limits.maxChildren;
    case 'chores':
      return limits.limits.maxChores;
    case 'rewards':
      return limits.limits.maxRewards;
  }
}

function isPlanLimitedKey(key: string): key is PlanLimitKey {
  return PLAN_LIMIT_KEYS.includes(key as PlanLimitKey);
}

// Get a value by key
router.get('/:key', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { key } = req.params;
    const tenantId = req.tenantId || 'legacy';
    
    let parsedValue;
    try {
      parsedValue = await getTenantData(key, tenantId);
    } catch (parseError) {
      console.error(`Error getting tenant data for key "${key}" (tenantId: ${tenantId}):`, parseError);
      console.error('Stack trace:', parseError instanceof Error ? parseError.stack : 'No stack trace available');
      return res.status(500).json({ 
        error: 'Failed to retrieve data',
        ...(isDevelopment && { details: parseError instanceof Error ? parseError.message : String(parseError) })
      });
    }

    if (parsedValue === null || parsedValue === undefined) {
      return sendNullResponse(req, res);
    }
    
    // Ensure array-like keys return arrays, not other types
    // This prevents "forEach is not a function" errors when MySQL returns unexpected data types
    if (ARRAY_KEYS.includes(key) && !Array.isArray(parsedValue)) {
      console.warn(`Key "${key}" should be an array but got:`, typeof parsedValue, parsedValue);
      // Return empty array for safety
      parsedValue = [];
    }
    
    // Send response in appropriate format (Spark runtime or standard API)
    if (isSparkRequest(req)) {
      // Spark runtime format: return raw JSON value as text/plain
      res.type('text/plain').send(JSON.stringify(parsedValue));
    } else {
      // Standard API format: return JSON with value wrapper
      res.json({ value: parsedValue });
    }
  } catch (error) {
    console.error(`Unexpected error in GET /kv/${req.params.key}:`, error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    res.status(500).json({ 
      error: 'Internal server error',
      ...(isDevelopment && { details: error instanceof Error ? error.message : String(error) })
    });
  }
});

// Set a value by key
router.post('/:key', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    // Block write operations for view-only tokens
    if (req.viewOnly) {
      return res.status(403).json({ error: 'Write operations not allowed in view-only mode' });
    }

    const { key } = req.params;
    const tenantId = req.tenantId || 'legacy';
    let value;
    
    // Handle both Spark runtime format (text/plain with raw JSON) and standard format (application/json with {value: ...})
    const contentType = req.get('content-type') || '';
    
    if (contentType.includes('text/plain')) {
      // Spark runtime sends raw JSON as text/plain
      if (typeof req.body === 'string') {
        try {
          value = JSON.parse(req.body);
        } catch {
          // If it's not valid JSON, treat it as a string value
          value = req.body;
        }
      } else {
        value = req.body;
      }
    } else {
      // Standard format: {value: ...}
      value = req.body.value;
    }
    
    if (value === undefined) {
      return res.status(400).json({ error: 'Value is required' });
    }
    
    // Validate that array keys receive array values
    // This prevents data corruption at write time
    if (ARRAY_KEYS.includes(key) && !Array.isArray(value)) {
      console.error(`POST /kv/${key}: Attempted to set non-array value for array key:`, typeof value, value);
      return res.status(400).json({ 
        error: `Key "${key}" must be an array`,
        received: typeof value 
      });
    }

    if (isPlanLimitedKey(key)) {
      const limits = await checkPlanLimits(tenantId);
      const maxLimit = getPlanLimitForKey(key, limits);
      if (maxLimit !== null && Array.isArray(value) && value.length > maxLimit) {
        return res.status(403).json({
          error: `Plan limit reached for ${key}`,
          limit: maxLimit,
          attempted: value.length,
        });
      }
    }
    
    try {
      await setTenantData(key, tenantId, value);
    } catch (setError) {
      console.error(`Error setting tenant data for key "${key}" (tenantId: ${tenantId}):`, setError);
      console.error('Stack trace:', setError instanceof Error ? setError.stack : 'No stack trace available');
      console.error('Value type:', typeof value, 'Is array:', Array.isArray(value));
      return res.status(500).json({ 
        error: 'Failed to save data',
        ...(isDevelopment && { details: setError instanceof Error ? setError.message : String(setError) })
      });
    }

    if (key === 'children' && Array.isArray(value)) {
      try {
        await updateSubscriptionQuantity(tenantId, value.length);
      } catch (subscriptionError) {
        console.error('Error updating subscription quantity:', subscriptionError);
        console.error('Stack trace:', subscriptionError instanceof Error ? subscriptionError.stack : 'No stack trace available');
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error(`Unexpected error in POST /kv/${req.params.key}:`, error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    res.status(500).json({ 
      error: 'Internal server error',
      ...(isDevelopment && { details: error instanceof Error ? error.message : String(error) })
    });
  }
});

// Delete a value by key
router.delete('/:key', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    // Block delete operations for view-only tokens
    if (req.viewOnly) {
      return res.status(403).json({ error: 'Delete operations not allowed in view-only mode' });
    }

    const { key } = req.params;
    const tenantId = req.tenantId || 'legacy';
    await deleteTenantData(key, tenantId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting value:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all keys (for debugging/migration)
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.tenantId || 'legacy';
    let data: Record<string, any>;
    
    try {
      data = await getAllTenantData(tenantId) as Record<string, any>;
    } catch (getAllError) {
      console.error(`Error getting all tenant data (tenantId: ${tenantId}):`, getAllError);
      console.error('Stack trace:', getAllError instanceof Error ? getAllError.stack : 'No stack trace available');
      return res.status(500).json({ 
        error: 'Failed to retrieve data',
        ...(isDevelopment && { details: getAllError instanceof Error ? getAllError.message : String(getAllError) })
      });
    }

    Object.entries(data).forEach(([entryKey, parsedValue]) => {
      if (ARRAY_KEYS.includes(entryKey) && !Array.isArray(parsedValue)) {
        console.warn(`Bulk GET: Key "${entryKey}" should be an array but got:`, typeof parsedValue, parsedValue);
        data[entryKey] = [];
      }
    });
    
    res.json(data);
  } catch (error) {
    console.error('Unexpected error in GET /kv/:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    res.status(500).json({ 
      error: 'Internal server error',
      ...(isDevelopment && { details: error instanceof Error ? error.message : String(error) })
    });
  }
});

// Bulk set (for migration)
router.post('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    // Block write operations for view-only tokens
    if (req.viewOnly) {
      return res.status(403).json({ error: 'Write operations not allowed in view-only mode' });
    }

    const data = req.body;
    const tenantId = req.tenantId || 'legacy';
    
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Invalid data format' });
    }
    
    const keys = Object.keys(data);
    if (keys.length === 0) {
      return res.status(400).json({ error: 'No data provided' });
    }
    
    // Validate array keys before bulk insert
    const invalidKeys: string[] = [];
    for (const [key, value] of Object.entries(data)) {
      if (ARRAY_KEYS.includes(key) && !Array.isArray(value)) {
        invalidKeys.push(key);
        console.error(`Bulk POST: Key "${key}" must be an array, got:`, typeof value);
      }
    }
    
    if (invalidKeys.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid data types for array keys',
        invalidKeys: invalidKeys
      });
    }
    
    const limitKeys = Object.keys(data).filter(isPlanLimitedKey);
    if (limitKeys.length > 0) {
      const limits = await checkPlanLimits(tenantId);
      for (const key of limitKeys) {
        const maxLimit = getPlanLimitForKey(key, limits);
        const value = data[key];
        if (maxLimit !== null && Array.isArray(value) && value.length > maxLimit) {
          return res.status(403).json({
            error: `Plan limit reached for ${key}`,
            limit: maxLimit,
            attempted: value.length,
          });
        }
      }
    }

    let connection;
    try {
      connection = await pool.getConnection();
    } catch (connError) {
      console.error('Error getting database connection:', connError);
      console.error('Stack trace:', connError instanceof Error ? connError.stack : 'No stack trace available');
      return res.status(500).json({ 
        error: 'Database connection failed',
        ...(isDevelopment && { details: connError instanceof Error ? connError.message : String(connError) })
      });
    }
    
    try {
      await connection.beginTransaction();
      
      for (const [key, value] of Object.entries(data)) {
        try {
          await setTenantData(key, tenantId, value, connection);
        } catch (setError) {
          console.error(`Error setting tenant data for key "${key}" in bulk operation:`, setError);
          console.error('Stack trace:', setError instanceof Error ? setError.stack : 'No stack trace available');
          throw setError; // Re-throw to trigger rollback
        }
      }
      
      await connection.commit();
      res.json({ success: true, count: keys.length });
    } catch (error) {
      await connection.rollback();
      console.error('Error in bulk set transaction, rolled back:', error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Unexpected error in bulk POST /kv/:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    res.status(500).json({ 
      error: 'Internal server error',
      ...(isDevelopment && { details: error instanceof Error ? error.message : String(error) })
    });
  }
});

// Spark framework loaded endpoint
// This endpoint is called by Spark runtime when the app is loaded
// It's used for tracking and analytics purposes
// Accepts any payload format from Spark without validation
router.post('/loaded', (req: Request, res: Response) => {
  try {
    // Accept the request but don't need to do anything with it
    // Spark runtime expects a successful response
    res.json({ success: true });
  } catch (error) {
    console.error('Error handling loaded event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
