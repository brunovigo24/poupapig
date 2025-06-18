import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import { createWebhookRoutes } from './presentation/routes/webhook.routes';
import { authRoutes } from './presentation/routes/authRoutes';
import evolutionRoutes from './presentation/routes/evolutionRoutes';
import statusRoutes from './presentation/routes/statusRoutes';

// Import middleware
import { autenticarJWT as authMiddleware } from './infrastructure/middleware/authMiddleware';
import { createApiRateLimit } from './infrastructure/middleware/RateLimitMiddleware';
import { container } from './infrastructure/config/dependency-injection';
import { ICacheService } from './application/ports/INotificationService';

// Create Express app
const app: Express = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Get cache service for rate limiting
const cache = container.get<ICacheService>('cache');
const apiRateLimiter = createApiRateLimit(cache);

// Public routes (no auth required)
app.use('/api/webhook', createWebhookRoutes());
app.use('/api/auth', authRoutes);

// Protected routes (auth required)
app.use('/api/evolution', authMiddleware, apiRateLimiter.middleware(), evolutionRoutes);
app.use('/api/status', authMiddleware, statusRoutes);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Error:', err);
  
  if (err.statusCode) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code
    });
  } else {
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

export default app;
