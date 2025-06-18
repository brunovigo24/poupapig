import { Router } from 'express';
import { container } from '../../infrastructure/config/dependency-injection';
import { WebhookController } from '../controllers/WebhookController';
import { createWebhookRateLimit } from '../../infrastructure/middleware/RateLimitMiddleware';
import { ICacheService } from '../../application/ports/INotificationService';

export function createWebhookRoutes(): Router {
  const router = Router();
  
  // Obter dependências do container
  const webhookController = container.get<WebhookController>('webhookController');
  const cache = container.get<ICacheService>('cache');
  
  // Configurar rate limiting
  const rateLimiter = createWebhookRateLimit(cache);
  
  // Definir rota
  router.post(
    '/webhook',
    rateLimiter.middleware(),
    (req, res) => webhookController.handleWebhook(req, res)
  );
  
  return router;
}

// Exemplo de uso no app principal
// app.use('/api', createWebhookRoutes()); 