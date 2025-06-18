import { ICacheService } from '../../application/ports/INotificationService';

export class RedisCache implements ICacheService {
  private cache: Map<string, { value: any; expiry?: number }> = new Map();

  constructor(private redisUrl: string) {
    // TODO: Implementar conexão real com Redis
    console.log('RedisCache initialized with URL:', redisUrl);
  }

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    if (item.expiry && item.expiry < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return item.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expiry = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : undefined;
    this.cache.set(key, { value, expiry });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
} 