import { Transaction, TransactionType, Category } from '../../domain/entities/Transaction';
import { ITransactionRepository, ICategoryRepository } from '../../domain/repositories/IUserRepository';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { DomainError } from '../../domain/entities/User';
import { INotificationService, ILogger } from '../ports/INotificationService';

export interface RegisterTransactionDTO {
  userId: string;
  description: string;
  amount: number;
  type: 'expense' | 'income';
  categoryId?: string;
  categoryName?: string;
  processedByAI?: boolean;
}

export interface RegisterTransactionResult {
  transactionId: string;
  currentBalance: number;
  alertMessage?: string;
}

export class RegisterTransactionUseCase {
  constructor(
    private userRepository: IUserRepository,
    private transactionRepository: ITransactionRepository,
    private categoryRepository: ICategoryRepository,
    private notificationService: INotificationService,
    private logger: ILogger
  ) {}

  async execute(dto: RegisterTransactionDTO): Promise<RegisterTransactionResult> {
    try {
      // Validação de entrada
      this.validateInput(dto);

      // Buscar usuário
      const user = await this.userRepository.findById(dto.userId);
      if (!user) {
        throw new DomainError('User not found');
      }

      // Determinar categoria
      const category = await this.resolveCategory(dto, user.getId());

      // Criar transação
      const transaction = Transaction.create(
        user.getId(),
        dto.description,
        dto.amount,
        dto.type === 'expense' ? TransactionType.EXPENSE : TransactionType.INCOME,
        category,
        dto.processedByAI || false
      );

      // Salvar transação
      await this.transactionRepository.save(transaction);

      // Calcular saldo atual
      const monthlyExpenses = await this.transactionRepository.getMonthlySum(
        user.getId(), 
        TransactionType.EXPENSE
      );
      const monthlyIncome = await this.transactionRepository.getMonthlySum(
        user.getId(), 
        TransactionType.INCOME
      );
      const currentBalance = monthlyIncome.subtract(monthlyExpenses).getValue();

      // Verificar alertas
      let alertMessage: string | undefined;
      if (user.canReceiveAlerts() && user.getMonthlyGoal()) {
        const percentageUsed = (monthlyExpenses.getValue() / user.getMonthlyGoal()!.getValue()) * 100;
        
        if (percentageUsed >= 100) {
          alertMessage = '⚠️ Você ultrapassou sua meta mensal!';
          await this.notificationService.sendAlert(user.getId(), alertMessage);
        } else if (percentageUsed >= 80) {
          alertMessage = `⚠️ Você já usou ${percentageUsed.toFixed(0)}% da sua meta!`;
        }
      }

      // Log da operação
      await this.logger.info('Transaction registered', {
        userId: user.getId(),
        transactionId: transaction.getId(),
        amount: dto.amount,
        type: dto.type
      });

      return {
        transactionId: transaction.getId(),
        currentBalance,
        alertMessage
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logger.error('Failed to register transaction', {
        error: errorMessage,
        dto
      });
      throw error;
    }
  }

  private validateInput(dto: RegisterTransactionDTO): void {
    if (!dto.userId) {
      throw new DomainError('User ID is required');
    }
    if (!dto.description || dto.description.trim().length < 3) {
      throw new DomainError('Description must have at least 3 characters');
    }
    if (dto.amount <= 0) {
      throw new DomainError('Amount must be positive');
    }
    if (!['expense', 'income'].includes(dto.type)) {
      throw new DomainError('Invalid transaction type');
    }
  }

  private async resolveCategory(dto: RegisterTransactionDTO, userId: string): Promise<Category> {
    // Se categoryId foi fornecido
    if (dto.categoryId) {
      const category = await this.categoryRepository.findById(dto.categoryId);
      if (!category) {
        throw new DomainError('Category not found');
      }
      return category;
    }

    // Se categoryName foi fornecido (geralmente pela IA)
    if (dto.categoryName) {
      const categories = await this.categoryRepository.findByType(
        dto.type === 'expense' ? TransactionType.EXPENSE : TransactionType.INCOME,
        userId
      );
      
      const category = categories.find(
        c => c.getName().toLowerCase() === dto.categoryName!.toLowerCase()
      );
      
      if (category) {
        return category;
      }
    }

    // Usar categoria padrão
    const defaultCategories = await this.categoryRepository.findByType(
      dto.type === 'expense' ? TransactionType.EXPENSE : TransactionType.INCOME
    );
    
    const defaultCategory = defaultCategories.find(
      c => c.getName() === (dto.type === 'expense' ? 'Outros Gastos' : 'Outros Ganhos')
    );

    if (!defaultCategory) {
      throw new DomainError('No default category available');
    }

    return defaultCategory;
  }
} 