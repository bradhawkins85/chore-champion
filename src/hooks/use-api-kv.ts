/**
 * API-based KV storage hook
 * Provides the same interface as @github/spark useKV but uses the backend API
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

// API base URL from environment or default to /api
const API_URL = import.meta.env.VITE_API_URL || '/api';

// Event emitter for auth token changes
const authTokenListeners = new Set<() => void>();

// Track if API is available
let apiAvailable: boolean | null = null;
let apiCheckTimestamp: number | null = null;
const API_RECHECK_INTERVAL_MS = 30000; // Recheck API availability every 30 seconds if it was previously unavailable
const BACKGROUND_SYNC_INTERVAL_MS = 120000; // Keep data fresh across long-lived dashboard sessions (2 minutes)
const FOCUS_SYNC_THROTTLE_MS = 5000; // Prevent a request burst when multiple hooks react to focus

// Track the most recent focus/visibility refresh by key to throttle concurrent hooks
const lastVisibilitySyncByKey = new Map<string, number>();

function resetApiAvailability() {
  apiAvailable = null;
  apiCheckTimestamp = null;
}

// Notify all listeners when auth token changes
function notifyAuthTokenChange() {
  resetApiAvailability();
  authTokenListeners.forEach(listener => listener());
}

// Get auth token from localStorage
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

// Get auth headers if token exists
function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Override localStorage.setItem to detect auth token changes
// Note: This override is specifically for the 'auth_token' key to enable
// automatic data refresh after login. It's a minimal, targeted approach that
// avoids requiring changes to AuthContext or other parts of the codebase.
// The notification is deferred with setTimeout to prevent nested calls.
const originalSetItem = localStorage.setItem.bind(localStorage);
localStorage.setItem = function(key: string, value: string) {
  originalSetItem(key, value);
  if (key === 'auth_token') {
    // Defer notification to avoid nested calls and allow setState to complete
    setTimeout(() => notifyAuthTokenChange(), 0);
  }
};

// Override localStorage.removeItem to detect auth token removal
const originalRemoveItem = localStorage.removeItem.bind(localStorage);
localStorage.removeItem = function(key: string) {
  originalRemoveItem(key);
  if (key === 'auth_token') {
    // Defer notification to avoid nested calls
    setTimeout(() => notifyAuthTokenChange(), 0);
  }
};

// Request queue to throttle concurrent API requests
interface QueuedRequest {
  execute: () => Promise<void>;
  resolve: () => void;
  reject: (error: Error) => void;
}

const requestQueue: QueuedRequest[] = [];
let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 5; // Limit concurrent requests to avoid overwhelming the server

// Process queued requests
function processQueue() {
  // Process requests to fill up to MAX_CONCURRENT_REQUESTS slots
  while (activeRequests < MAX_CONCURRENT_REQUESTS && requestQueue.length > 0) {
    const request = requestQueue.shift();
    if (!request) break; // Guard against race conditions

    activeRequests++;
    
    // Execute request without await to allow concurrent processing
    request.execute()
      .then(() => request.resolve())
      .catch((error) => request.reject(error))
      .finally(() => {
        activeRequests--;
        // Process next request from queue if available
        if (requestQueue.length > 0) {
          processQueue();
        }
      });
  }
}

// Queue an API request to avoid rate limiting
function queueRequest(execute: () => Promise<void>): Promise<void> {
  return new Promise((resolve, reject) => {
    requestQueue.push({ execute, resolve, reject });
    processQueue();
  });
}

// Check if API is available and authentication is valid
async function checkApiAvailability(forceRefresh = false): Promise<boolean> {
  const now = Date.now();
  const token = getAuthToken();

  if (!token) {
    return false;
  }
  
  // If API was previously determined to be available, trust that result
  if (apiAvailable === true) {
    return true;
  }
  
  // If API was previously unavailable, recheck after interval to handle API startup delays
  if (!forceRefresh && apiAvailable === false && apiCheckTimestamp !== null) {
    if (now - apiCheckTimestamp < API_RECHECK_INTERVAL_MS) {
      return false;
    }
    // Time to recheck - reset apiAvailable to allow retry
    console.log('Rechecking API availability after previous failure');
    apiAvailable = null;
  }
  
  // Perform the actual availability check
  if (forceRefresh) {
    apiAvailable = null;
  }

  if (apiAvailable === null) {
    try {
      // Check the /auth/me endpoint which requires valid authentication
      // This verifies both API availability and that our auth token is valid
      const response = await fetch(`${API_URL}/auth/me`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      
      // API is available if we get 200 OK
      // Auth failures (401/403) mean token is invalid/expired or view-only
      // In those cases, fall back to localStorage
      if (isAuthFailure(response.status)) {
        console.warn('API authentication failed, falling back to localStorage');
        apiAvailable = false;
        apiCheckTimestamp = now;
        return false;
      }
      
      apiAvailable = response.ok;
      apiCheckTimestamp = now;
      return apiAvailable;
    } catch (error) {
      console.warn('API not available, falling back to localStorage');
      apiAvailable = false;
      apiCheckTimestamp = now;
      return false;
    }
  }
  
  return apiAvailable;
}

/**
 * Validates that a loaded value matches the expected type based on the default value.
 * This prevents corrupted data from causing runtime errors.
 * 
 * Note: This performs shallow type checking (array vs object vs primitive).
 * It does not validate the structure or properties of complex types.
 */
function validateLoadedValue<T>(loadedValue: any, defaultValue: T): T {
  // If loadedValue is null or undefined, return defaultValue
  if (loadedValue === null || loadedValue === undefined) {
    return defaultValue;
  }
  
  // If defaultValue is an array, ensure loadedValue is also an array
  if (Array.isArray(defaultValue)) {
    return (Array.isArray(loadedValue) ? loadedValue : defaultValue) as T;
  }
  
  // If defaultValue is an object (but not null), ensure loadedValue is also an object (but not an array)
  if (typeof defaultValue === 'object' && defaultValue !== null) {
    const isValidObject = typeof loadedValue === 'object' && 
                          loadedValue !== null && 
                          !Array.isArray(loadedValue);
    return (isValidObject ? loadedValue : defaultValue) as T;
  }
  
  // For primitive types, validate type matches
  if (typeof loadedValue === typeof defaultValue) {
    return loadedValue as T;
  }
  
  // Type mismatch - return default value
  return defaultValue;
}

function isAuthFailure(status: number): boolean {
  return status === 401 || status === 403;
}

export function useApiKV<T>(key: string, defaultValue: T): [T, (value: T | ((prevValue: T) => T)) => Promise<void>] {
  const [value, setValue] = useState<T>(defaultValue);
  const [useApi, setUseApi] = useState<boolean>(false);
  const defaultValueRef = useRef(defaultValue);
  const useApiRef = useRef(useApi);
  // Track auth token to re-fetch data when it changes (e.g., after login)
  const [authToken, setAuthToken] = useState<string | null>(getAuthToken());

  useEffect(() => {
    defaultValueRef.current = defaultValue;
  }, [defaultValue]);

  useEffect(() => {
    useApiRef.current = useApi;
  }, [useApi]);

  // Listen for auth token changes
  useEffect(() => {
    const handleAuthTokenChange = () => {
      setAuthToken(getAuthToken());
    };

    authTokenListeners.add(handleAuthTokenChange);

    return () => {
      authTokenListeners.delete(handleAuthTokenChange);
    };
  }, []);

  // Initialize - check API and load data
  useEffect(() => {
    let mounted = true;

    async function loadValueFromStorage() {
      const stored = localStorage.getItem(key);
      if (!stored || !mounted) {
        if (mounted) {
          setValue(defaultValueRef.current);
        }
        return;
      }

      try {
        const parsedValue = JSON.parse(stored);
        if (mounted) {
          setValue(validateLoadedValue(parsedValue, defaultValueRef.current));
        }
      } catch {
        if (mounted) {
          setValue(defaultValueRef.current);
        }
      }
    }

    async function loadValueFromApi() {
      await queueRequest(async () => {
        try {
          const response = await fetch(`${API_URL}/kv/${encodeURIComponent(key)}`, {
            method: 'GET',
            headers: getAuthHeaders(),
          });

          if (response.ok) {
            const data = await response.json();
            if (mounted) {
              // validateLoadedValue handles null values by returning defaultValue
              setValue(validateLoadedValue(data.value, defaultValueRef.current));
            }
          } else if (isAuthFailure(response.status)) {
            apiAvailable = false;
            apiCheckTimestamp = Date.now();
            if (mounted) {
              setUseApi(false);
            }
            await loadValueFromStorage();
          } else if (response.status === 404) {
            // Legacy: Key not found (older API versions returned 404)
            if (mounted) {
              setValue(defaultValueRef.current);
            }
          }
        } catch (error) {
          console.error('Error loading from API:', error);
          await loadValueFromStorage();
        }
      });
    }

    async function syncValue(forceApiCheck = false) {
      const available = await checkApiAvailability(forceApiCheck);
      if (!mounted) return;

      setUseApi(available);

      if (available) {
        await loadValueFromApi();
      } else {
        await loadValueFromStorage();
      }
    }

    syncValue();

    const backgroundSyncId = window.setInterval(() => {
      syncValue();
    }, BACKGROUND_SYNC_INTERVAL_MS);

    const handleFocusOrVisible = () => {
      const now = Date.now();
      const lastSync = lastVisibilitySyncByKey.get(key) ?? 0;
      if (now - lastSync < FOCUS_SYNC_THROTTLE_MS) {
        return;
      }
      lastVisibilitySyncByKey.set(key, now);
      syncValue(true);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleFocusOrVisible();
      }
    };

    const handleStorageUpdate = (event: StorageEvent) => {
      if (event.key === key && !useApiRef.current) {
        syncValue();
      }

      if (event.key === 'auth_token') {
        notifyAuthTokenChange();
      }
    };

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('storage', handleStorageUpdate);

    return () => {
      mounted = false;
      clearInterval(backgroundSyncId);
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, [key, authToken]);

  // Update function - supports both direct values and updater functions
  const updateValue = useCallback(async (newValueOrUpdater: T | ((prevValue: T) => T)) => {
    // Compute the new value using setState's functional form to avoid race conditions
    // Initialize with defaultValue as fallback (setValue executes synchronously, so this should never be used)
    let computedValue: T = defaultValueRef.current;
    setValue(prev => {
      computedValue = typeof newValueOrUpdater === 'function' 
        ? (newValueOrUpdater as (prevValue: T) => T)(prev)
        : newValueOrUpdater;
      return computedValue;
    });
    
    // Save to API or localStorage (outside of setState to keep it pure)
    const apiIsAvailable = useApi || await checkApiAvailability(true);

    if (apiIsAvailable) {
      if (!useApi) {
        setUseApi(true);
      }

      // Save to API and await the result (queued to prevent out-of-order writes)
      try {
        await queueRequest(async () => {
          const response = await fetch(`${API_URL}/kv/${encodeURIComponent(key)}`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ value: computedValue }),
          });
          
          if (!response.ok) {
            if (isAuthFailure(response.status)) {
              apiAvailable = false;
              apiCheckTimestamp = Date.now();
              setUseApi(false);
              localStorage.setItem(key, JSON.stringify(computedValue));
              return;
            }
            throw new Error('Failed to save to API');
          }
        });
      } catch (error) {
        console.error('Error saving to API:', error);
        // Fallback to localStorage to ensure data is not lost
        try {
          localStorage.setItem(key, JSON.stringify(computedValue));
          // Display user-friendly error message after successful localStorage save
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          toast.error('Failed to save data to server', {
            description: `Unable to save to server: ${errorMessage}. Data saved locally as backup.`
          });
        } catch (localStorageError) {
          console.error('Error saving to localStorage fallback:', localStorageError);
          // Both API and localStorage failed - show more severe error
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          toast.error('Failed to save data', {
            description: `Unable to save to server: ${errorMessage}. Local storage also unavailable.`
          });
        }
      }
    } else {
      // Save to localStorage
      localStorage.setItem(key, JSON.stringify(computedValue));
    }
  }, [key, useApi]);

  return [value, updateValue];
}

// Migration utility: export all localStorage data to API
export async function migrateToApi(): Promise<boolean> {
  const available = await checkApiAvailability();
  if (!available) {
    console.error('API not available for migration');
    return false;
  }

  try {
    // Get all localStorage data
    const data: Record<string, any> = {};
    const skipped: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            data[key] = JSON.parse(value);
          } catch {
            // Skip non-JSON values
            skipped.push(key);
          }
        }
      }
    }

    if (skipped.length > 0) {
      console.warn('Migration: Skipped non-JSON values for keys:', skipped);
    }

    // Send to API
    const response = await fetch(`${API_URL}/kv`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Migration failed');
    }

    console.log('Migration completed successfully');
    return true;
  } catch (error) {
    console.error('Error during migration:', error);
    return false;
  }
}
