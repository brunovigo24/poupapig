export interface INotificationService {
  sendMessage(userId: string, message: string): Promise<void>;
  sendAlert(userId: string, alert: string): Promise<void>;
  sendList(userId: string, title: string, options: MessageOption[]): Promise<void>;
}

export interface MessageOption {
  id: string;
  title: string;
  description?: string;
}

export interface ILogger {
  info(message: string, meta?: any): Promise<void>;
  error(message: string, meta?: any): Promise<void>;
  warn(message: string, meta?: any): Promise<void>;
  debug(message: string, meta?: any): Promise<void>;
}

export interface IAIService {
  processMessage(message: string, context: AIContext): Promise<AIResponse>;
  detectIntent(message: string, categories: string[]): Promise<Intent>;
}

export interface AIContext {
  userId: string;
  userName: string;
  sessionState: string;
  categories: string[];
  lastSummary?: any;
}

export interface AIResponse {
  message: string;
  actions: AIAction[];
  needsConfirmation: boolean;
}

export interface AIAction {
  function: string;
  parameters: Record<string, any>;
}

export interface Intent {
  type: string;
  confidence: number;
  data?: Record<string, any>;
}

export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
} 