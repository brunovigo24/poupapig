import { createClient } from '@supabase/supabase-js';
import { SupabaseUserRepository } from '../repositories/SupabaseUserRepository';
import { SupabaseTransactionRepository } from '../repositories/SupabaseTransactionRepository';
import { SupabaseCategoryRepository } from '../repositories/SupabaseCategoryRepository';
import { RegisterTransactionUseCase } from '../../application/use-cases/RegisterTransactionUseCase';
import { ProcessMessageUseCase } from '../../application/use-cases/ProcessMessageUseCase';
import { GetBalanceUseCase } from '../../application/use-cases/GetBalanceUseCase';
import { SetMonthlyGoalUseCase } from '../../application/use-cases/SetMonthlyGoalUseCase';
import { GenerateReportUseCase } from '../../application/use-cases/GenerateReportUseCase';
import { WebhookController } from '../../presentation/controllers/WebhookController';
import { ConsoleLogger } from '../services/ConsoleLogger';
import { RedisCache } from '../services/RedisCache';
import { OpenAIService } from '../services/OpenAIService';
import { MockAIService } from '../services/MockAIService';
import { WhatsAppNotificationService } from '../services/WhatsAppNotificationService';
import { IAIService } from '../../application/ports/INotificationService';

// Container de dependências
export class DependencyContainer {
  private static instance: DependencyContainer;
  private dependencies: Map<string, any> = new Map();

  private constructor() {
    this.registerDependencies();
  }

  static getInstance(): DependencyContainer {
    if (!this.instance) {
      this.instance = new DependencyContainer();
    }
    return this.instance;
  }

  private registerDependencies(): void {
    // Infrastructure
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!
    );
    
    const logger = new ConsoleLogger();
    const cache = new RedisCache(process.env.REDIS_URL || 'redis://localhost:6379');
    
    // AI Service - usa OpenAI se tiver key, senão usa Mock
    let aiService: IAIService;
    if (process.env.OPENAI_API_KEY) {
      aiService = new OpenAIService(process.env.OPENAI_API_KEY);
      console.log('Using OpenAI service');
    } else {
      aiService = new MockAIService();
      console.log('OPENAI_API_KEY not found. Using mock AI service.');
    }
    
    const notificationService = new WhatsAppNotificationService();

    // Repositories
    const userRepository = new SupabaseUserRepository(supabase, logger);
    const transactionRepository = new SupabaseTransactionRepository(supabase, logger);
    const categoryRepository = new SupabaseCategoryRepository(supabase, logger);
    
    // Configure notification service with user repository
    notificationService.setUserRepository(userRepository);

    // Use Cases
    const registerTransactionUseCase = new RegisterTransactionUseCase(
      userRepository,
      transactionRepository,
      categoryRepository,
      notificationService,
      logger
    );

    const getBalanceUseCase = new GetBalanceUseCase(
      userRepository,
      transactionRepository,
      logger
    );

    const setMonthlyGoalUseCase = new SetMonthlyGoalUseCase(
      userRepository,
      logger
    );

    const generateReportUseCase = new GenerateReportUseCase(
      userRepository,
      transactionRepository,
      logger
    );

    // Process Message Use Case - sempre cria pois agora temos AI (real ou mock)
    const processMessageUseCase = new ProcessMessageUseCase(
      userRepository,
      aiService,
      notificationService,
      logger,
      registerTransactionUseCase,
      getBalanceUseCase,
      setMonthlyGoalUseCase,
      generateReportUseCase
    );

    // Controllers
    const webhookController = new WebhookController(
      processMessageUseCase,
      logger
    );

    // Registrar no container
    this.dependencies.set('logger', logger);
    this.dependencies.set('cache', cache);
    this.dependencies.set('userRepository', userRepository);
    this.dependencies.set('transactionRepository', transactionRepository);
    this.dependencies.set('categoryRepository', categoryRepository);
    this.dependencies.set('notificationService', notificationService);
    this.dependencies.set('aiService', aiService);
    this.dependencies.set('webhookController', webhookController);
    this.dependencies.set('registerTransactionUseCase', registerTransactionUseCase);
    this.dependencies.set('processMessageUseCase', processMessageUseCase);
  }

  get<T>(key: string): T {
    const dependency = this.dependencies.get(key);
    if (!dependency) {
      throw new Error(`Dependency ${key} not found`);
    }
    return dependency as T;
  }
}

// Helper para facilitar o acesso
export const container = DependencyContainer.getInstance(); 