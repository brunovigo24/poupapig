import { IUserRepository, ITransactionRepository } from '../../domain/repositories/IUserRepository';
import { TransactionType } from '../../domain/entities/Transaction';
import { DomainError } from '../../domain/entities/User';
import { ILogger } from '../ports/INotificationService';

export interface GenerateReportDTO {
  userId: string;
  reportType: 'mensal' | 'semanal' | 'por_categoria' | 'comparativo';
}

export interface GenerateReportResult {
  report: string;
  data: ReportData;
}

export interface ReportData {
  period: string;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  topCategories: CategoryData[];
  insights: string[];
}

export interface CategoryData {
  name: string;
  total: number;
  percentage: number;
  icon: string;
}

export class GenerateReportUseCase {
  constructor(
    private userRepository: IUserRepository,
    private transactionRepository: ITransactionRepository,
    private logger: ILogger
  ) {}

  async execute(dto: GenerateReportDTO): Promise<GenerateReportResult> {
    try {
      // Buscar usuário
      const user = await this.userRepository.findById(dto.userId);
      if (!user) {
        throw new DomainError('User not found');
      }

      // Gerar relatório baseado no tipo
      let reportData: ReportData;
      let report: string;

      switch (dto.reportType) {
        case 'mensal':
          reportData = await this.generateMonthlyReport(user.getId());
          report = this.formatMonthlyReport(reportData, user);
          break;
        
        case 'semanal':
          reportData = await this.generateWeeklyReport(user.getId());
          report = this.formatWeeklyReport(reportData);
          break;
        
        case 'por_categoria':
          reportData = await this.generateCategoryReport(user.getId());
          report = this.formatCategoryReport(reportData);
          break;
        
        case 'comparativo':
          reportData = await this.generateComparativeReport(user.getId());
          report = this.formatComparativeReport(reportData);
          break;
        
        default:
          throw new DomainError('Invalid report type');
      }

      await this.logger.info('Report generated', {
        userId: user.getId(),
        reportType: dto.reportType
      });

      return { report, data: reportData };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logger.error('Failed to generate report', {
        error: errorMessage,
        dto
      });
      throw error;
    }
  }

  private async generateMonthlyReport(userId: string): Promise<ReportData> {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const transactions = await this.transactionRepository.findByDateRange(
      userId,
      startDate,
      endDate
    );

    // Processar dados
    let totalIncome = 0;
    let totalExpenses = 0;
    const categoryMap = new Map<string, CategoryData>();

    for (const transaction of transactions) {
      const amount = transaction.getAmount().getValue();
      const category = transaction.getCategory();
      
      if (transaction.isExpense()) {
        totalExpenses += amount;
      } else {
        totalIncome += amount;
      }

      // Agrupar por categoria
      const key = category.getName();
      const existing = categoryMap.get(key) || {
        name: category.getName(),
        total: 0,
        percentage: 0,
        icon: category.getIcon()
      };
      existing.total += amount;
      categoryMap.set(key, existing);
    }

    // Calcular percentuais e ordenar
    const topCategories = Array.from(categoryMap.values())
      .map(cat => ({
        ...cat,
        percentage: totalExpenses > 0 ? (cat.total / totalExpenses) * 100 : 0
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Gerar insights
    const insights = this.generateInsights(totalIncome, totalExpenses, topCategories);

    return {
      period: `${now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      topCategories,
      insights
    };
  }

  private async generateWeeklyReport(userId: string): Promise<ReportData> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    // Similar ao monthly mas com período semanal
    // ... implementação similar
    
    return {
      period: 'Última semana',
      totalIncome: 0,
      totalExpenses: 0,
      balance: 0,
      topCategories: [],
      insights: []
    };
  }

  private async generateCategoryReport(userId: string): Promise<ReportData> {
    // Implementação focada em análise por categoria
    return {
      period: 'Mês atual',
      totalIncome: 0,
      totalExpenses: 0,
      balance: 0,
      topCategories: [],
      insights: []
    };
  }

  private async generateComparativeReport(userId: string): Promise<ReportData> {
    // Implementação comparando mês atual com anterior
    return {
      period: 'Comparativo mensal',
      totalIncome: 0,
      totalExpenses: 0,
      balance: 0,
      topCategories: [],
      insights: []
    };
  }

  private formatMonthlyReport(data: ReportData, user: any): string {
    let report = `
📈 RELATÓRIO FINANCEIRO DETALHADO
📅 ${data.period.toUpperCase()}

💰 RESUMO GERAL:
• Total de Receitas: R$ ${data.totalIncome.toFixed(2)}
• Total de Gastos: R$ ${data.totalExpenses.toFixed(2)}
• Saldo do Mês: R$ ${data.balance.toFixed(2)}
`;

    if (user.getMonthlyGoal()) {
      const goal = user.getMonthlyGoal()!.getValue();
      const percentage = (data.totalExpenses / goal) * 100;
      report += `• Meta Mensal: R$ ${goal.toFixed(2)} (${percentage.toFixed(0)}% usado)\n`;
    }

    if (data.topCategories.length > 0) {
      report += '\n📊 TOP CATEGORIAS DE GASTOS:\n';
      data.topCategories.forEach((cat, idx) => {
        report += `${idx + 1}. ${cat.icon} ${cat.name}: R$ ${cat.total.toFixed(2)} (${cat.percentage.toFixed(1)}%)\n`;
      });
    }

    if (data.insights.length > 0) {
      report += '\n💡 INSIGHTS:\n';
      data.insights.forEach(insight => {
        report += `• ${insight}\n`;
      });
    }

    return report;
  }

  private formatWeeklyReport(data: ReportData): string {
    return `
📊 RELATÓRIO SEMANAL
📅 ${data.period}

• Receitas: R$ ${data.totalIncome.toFixed(2)}
• Gastos: R$ ${data.totalExpenses.toFixed(2)}
• Saldo: R$ ${data.balance.toFixed(2)}
    `;
  }

  private formatCategoryReport(data: ReportData): string {
    return '📊 Relatório por categoria em construção...';
  }

  private formatComparativeReport(data: ReportData): string {
    return '📊 Relatório comparativo em construção...';
  }

  private generateInsights(
    totalIncome: number, 
    totalExpenses: number, 
    topCategories: CategoryData[]
  ): string[] {
    const insights: string[] = [];

    if (totalExpenses > totalIncome) {
      insights.push('🔴 Seus gastos superaram suas receitas este mês');
    } else if (totalIncome > totalExpenses * 2) {
      insights.push('🟢 Excelente! Você economizou mais de 50% da sua receita');
    } else {
      insights.push('🟢 Suas receitas cobrem seus gastos');
    }

    if (topCategories.length > 0) {
      const topCategory = topCategories[0];
      if (topCategory.percentage > 40) {
        insights.push(`📈 ${topCategory.name} representa ${topCategory.percentage.toFixed(0)}% dos seus gastos`);
      }
    }

    return insights;
  }
} 