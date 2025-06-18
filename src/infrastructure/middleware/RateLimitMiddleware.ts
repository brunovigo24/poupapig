import { Request, Response, NextFunction } from 'express';
import { RateLimitError } from '../../shared/errors';
import { ICacheService } from '../../application/ports/INotificationService';

interface RateLimitOptions {
  windowMs: number;      // Janela de tempo em ms
  maxRequests: number;   // Máximo de requisições na janela
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export class RateLimitMiddleware {
  constructor(
    private cache: ICacheService,
    private options: RateLimitOptions
  ) {}

  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const key = this.generateKey(req);
        const currentCount = await this.getCurrentCount(key);

        if (currentCount >= this.options.maxRequests) {
          throw new RateLimitError(
            `Too many requests. Limit is ${this.options.maxRequests} per ${this.options.windowMs / 1000} seconds`
          );
        }

        // Incrementa contador
        await this.incrementCount(key);

        // Se configurado, decrementa em caso de sucesso/falha
        if (this.options.skipSuccessfulRequests || this.options.skipFailedRequests) {
          res.on('finish', async () => {
            if (
              (this.options.skipSuccessfulRequests && res.statusCode < 400) ||
              (this.options.skipFailedRequests && res.statusCode >= 400)
            ) {
              await this.decrementCount(key);
            }
          });
        }

        next();
      } catch (error) {
        if (error instanceof RateLimitError) {
          res.status(429).json({
            error: error.message,
            code: error.code,
            retryAfter: Math.ceil(this.options.windowMs / 1000)
          });
        } else {
          next(error);
        }
      }
    };
  }

  private generateKey(req: Request): string {
    if (this.options.keyGenerator) {
      return this.options.keyGenerator(req);
    }

    // Por padrão, usa IP + rota
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const route = req.route?.path || req.path;
    return `rate_limit:${ip}:${route}`;
  }

  private async getCurrentCount(key: string): Promise<number> {
    const count = await this.cache.get<number>(key);
    return count || 0;
  }

  private async incrementCount(key: string): Promise<void> {
    const current = await this.getCurrentCount(key);
    const ttl = Math.ceil(this.options.windowMs / 1000);
    await this.cache.set(key, current + 1, ttl);
  }

  private async decrementCount(key: string): Promise<void> {
    const current = await this.getCurrentCount(key);
    if (current > 0) {
      const ttl = Math.ceil(this.options.windowMs / 1000);
      await this.cache.set(key, current - 1, ttl);
    }
  }
}

// Factory functions para diferentes tipos de rate limit
export function createWebhookRateLimit(cache: ICacheService): RateLimitMiddleware {
  return new RateLimitMiddleware(cache, {
    windowMs: 60 * 1000,        // 1 minuto
    maxRequests: 30,            // 30 requisições por minuto
    keyGenerator: (req) => {
      // Para webhook, usa o telefone como chave
      const phone = req.body?.data?.key?.remoteJid || 'unknown';
      return `rate_limit:webhook:${phone}`;
    },
    skipFailedRequests: true
  });
}

export function createApiRateLimit(cache: ICacheService): RateLimitMiddleware {
  return new RateLimitMiddleware(cache, {
    windowMs: 15 * 60 * 1000,   // 15 minutos
    maxRequests: 100,           // 100 requisições por 15 minutos
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  });
} 