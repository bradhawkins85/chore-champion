import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { initDatabase } from './config/database.js';
import kvRoutes from './routes/kv.js';
import updateRoutes from './routes/update.js';
import icsRoutes from './routes/ics.js';

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
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

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
app.use('/api/', limiter);

// Disable caching for all API responses
app.use('/api', (req, res, next) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api', kvRoutes);
app.use('/api', updateRoutes);
app.use('/api', icsRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize database and start server
async function start() {
  try {
    console.log('Initializing database...');
    await initDatabase();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
