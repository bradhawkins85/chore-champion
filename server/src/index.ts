import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { initDatabase } from './config/database.js';
import kvRoutes from './routes/kv.js';
import updateRoutes from './routes/update.js';
import icsRoutes from './routes/ics.js';
import authRoutes from './routes/auth.js';
import deviceRoutes from './routes/devices.js';
import configRoutes from './routes/config.js';
import ipAccessRoutes from './routes/ip-access.js';
import adminRoutes from './routes/admin.js';
import subscriptionRoutes from './routes/subscriptions.js';
import wallpaperRoutes from './routes/wallpapers.js';
import weatherRoutes from './routes/weather.js';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy - required for rate limiting and getting real client IP behind nginx
app.set('trust proxy', 1);

// Middleware
// CORS configuration - restrict to localhost and container network
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
};
app.use(cors(corsOptions));
app.use(bodyParser.text({ type: 'text/plain', limit: '10mb' })); // For Spark runtime KV requests
app.use('/api/subscriptions/webhook', bodyParser.raw({ type: 'application/json' }));
app.use(bodyParser.json({
  limit: '10mb',
  type: (req) => {
    const request = req as express.Request;
    const requestUrl = request.originalUrl ?? req.url ?? '';
    if (requestUrl === '/api/subscriptions/webhook') {
      return false;
    }
    const contentType = req.headers['content-type'] || '';
    return contentType.includes('application/json') || contentType.includes('+json');
  },
}));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Rate limiting configuration - applied AFTER body parser
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // Significantly increased to handle many KV stores loading on page initialization (26+ useKV hooks)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for KV endpoints to prevent 429 errors during page load
  // The app makes many simultaneous KV requests on initialization
  skip: (req) => {
    // Skip rate limiting for all KV requests (both GET and POST)
    // to prevent 429 errors during page load and data persistence
    // Note: req.path is relative to the mount point '/api/', so we check for '/kv'
    return req.path.startsWith('/kv');
  },
});

// Apply rate limiting to all API routes
app.use('/api', limiter);

// Disable caching for all API responses
app.use('/api', (req, res, next) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  next();
});

// Database connection status
let dbReady = false;

// Health check - always responds, but indicates if DB is ready
app.get('/api/health', (req, res) => {
  res.json({ 
    status: dbReady ? 'ok' : 'starting',
    database: dbReady ? 'connected' : 'connecting',
    timestamp: new Date().toISOString() 
  });
});

// Middleware to check database readiness for routes that need it
const requireDb = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!dbReady) {
    return res.status(503).json({ 
      error: 'Service temporarily unavailable',
      message: 'Database is still initializing. Please try again in a moment.',
      status: 503
    });
  }
  next();
};

// API Routes - protected by database readiness check
app.use('/api/kv', requireDb, kvRoutes);
app.use('/api/update', requireDb, updateRoutes);
app.use('/api/ics', requireDb, icsRoutes);
app.use('/api/auth', requireDb, authRoutes);
app.use('/api/devices', requireDb, deviceRoutes);
app.use('/api/config', configRoutes);
app.use('/api/ip-access', requireDb, ipAccessRoutes);
app.use('/api/admin', requireDb, adminRoutes);
app.use('/api/subscriptions', requireDb, subscriptionRoutes);
app.use('/api/wallpapers', requireDb, wallpaperRoutes);
app.use('/api/weather', weatherRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize database and start server
async function start() {
  // Start HTTP server immediately, even if database is not ready
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });

  // Initialize database in background with retries
  let retryCount = 0;
  const maxRetries = 30; // Try for ~5 minutes with exponential backoff
  
  async function initDbWithRetry() {
    try {
      console.log('Initializing database...');
      await initDatabase();
      dbReady = true;
      console.log('Database ready - API endpoints now available');
    } catch (error) {
      retryCount++;
      console.error(`Database initialization attempt ${retryCount} failed:`, error);
      
      if (retryCount >= maxRetries) {
        console.error(`Failed to initialize database after ${maxRetries} attempts. Server will continue running but API endpoints will return 503.`);
        return;
      }
      
      // Exponential backoff starting at 2s: 2s, 4s, 8s, 16s, 32s...
      // Formula: delay = min(2000 * 2^(retryCount-1), 32000)
      // retryCount=1: 2000 * 2^0 = 2000ms (2s)
      // retryCount=2: 2000 * 2^1 = 4000ms (4s)
      // retryCount=3: 2000 * 2^2 = 8000ms (8s)
      // etc., capped at 32s
      const delay = Math.min(2000 * Math.pow(2, retryCount - 1), 32000);
      console.log(`Retrying database initialization in ${delay}ms...`);
      setTimeout(initDbWithRetry, delay);
    }
  }
  
  // Start database initialization
  initDbWithRetry();
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
}

start();
