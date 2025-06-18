import { ILogger } from '../../application/ports/INotificationService';

export class ConsoleLogger implements ILogger {
  async info(message: string, meta?: any): Promise<void> {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta || '');
  }

  async error(message: string, meta?: any): Promise<void> {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, meta || '');
  }

  async warn(message: string, meta?: any): Promise<void> {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta || '');
  }

  async debug(message: string, meta?: any): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, meta || '');
    }
  }
} 