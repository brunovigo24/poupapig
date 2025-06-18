import { IUserRepository, ITransactionRepository } from '../../domain/repositories/IUserRepository';
import { TransactionType } from '../../domain/entities/Transaction';
import { DomainError } from '../../domain/entities/User';
import { ILogger } from '../ports/INotificationService';

export interface GetBalanceDTO {
  userId: string;
  period?: string; // 'current_month', 'last_month', 'week', etc
}

export interface GetBalanceResult {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  goalStatus?: string;
  transactions?: TransactionSummary[];
}

export interface TransactionSummary {
  category: string;
  total: number;
  percentage: number;
  type: string;
}

export class GetBalanceUseCase {
  constructor(
    private userRepository: IUserRepository,
    private transactionRepository: ITransactionRepository,
    private logger: ILogger
  ) {}

  async execute(dto: GetBalanceDTO): Promise<GetBalanceResult> {
    try {
      // Buscar usuário
      const user = await this.userRepository.findById(dto.userId);
      if (!user) {
        throw new DomainError('User not found');
      }

      // Definir período
      const { startDate, endDate } = this.getPeriodDates(dto.period);

      // Buscar transações do período
      const transactions = await this.transactionRepository.findByDateRange(
        user.getId(),
        startDate,
        endDate
      );

      // Calcular totais
      let totalIncome = 0;
      let totalExpenses = 0;
      const categoryMap = new Map<string, { total: number; type: string }>();

      for (const transaction of transactions) {
        const amount = transaction.getAmount().getValue();
        const category = transaction.getCategory();
        
        if (transaction.isExpense()) {
          totalExpenses += amount;
        } else {
          totalIncome += amount;
        }

        // Agrupar por categoria
        const key = `${category.getName()}|${category.getType()}`;
        const current = categoryMap.get(key) || { total: 0, type: category.getType() };
        current.total += amount;
        categoryMap.set(key, current);
      }

      // Calcular status da meta
      let goalStatus: string | undefined;
      if (user.getMonthlyGoal() && dto.period !== 'last_month') {
        const goal = user.getMonthlyGoal()!.getValue();
        const percentage = (totalExpenses / goal) * 100;
        
        if (percentage >= 100) {
          goalStatus = `⚠️ Meta ultrapassada! ${percentage.toFixed(0)}% usado`;
        } else if (percentage >= 80) {
          goalStatus = `⚠️ ${percentage.toFixed(0)}% da meta usado`;
        } else {
          goalStatus = `✅ ${percentage.toFixed(0)}% da meta usado`;
        }
      }

      // Formatar resumo por categoria
      const transactionSummary: TransactionSummary[] = [];
      for (const [key, data] of categoryMap.entries()) {
        const [categoryName, type] = key.split('|');
        const total = type === TransactionType.EXPENSE ? totalExpenses : totalIncome;
        
        transactionSummary.push({
          category: categoryName,
          total: data.total,
          percentage: total > 0 ? (data.total / total) * 100 : 0,
          type: data.type
        });
      }

      // Ordenar por valor
      transactionSummary.sort((a, b) => b.total - a.total);

      await this.logger.info('Balance calculated', {
        userId: user.getId(),
        period: dto.period,
        balance: totalIncome - totalExpenses
      });

      return {
        totalIncome,
        totalExpenses,
        balance: totalIncome - totalExpenses,
        goalStatus,
        transactions: transactionSummary
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logger.error('Failed to get balance', {
        error: errorMessage,
        dto
      });
      throw error;
    }
  }

  private getPeriodDates(period?: string): { startDate: Date; endDate: Date } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date();

    switch (period) {
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      
      case 'week':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      
      case 'current_month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    return { startDate, endDate };
  }
} 