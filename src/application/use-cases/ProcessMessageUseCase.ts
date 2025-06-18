import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { User, UserStatus, DomainError } from '../../domain/entities/User';
import { IAIService, INotificationService, ILogger, AIResponse, AIAction } from '../ports/INotificationService';
import { RegisterTransactionUseCase, RegisterTransactionDTO } from './RegisterTransactionUseCase';
import { GetBalanceUseCase } from './GetBalanceUseCase';
import { SetMonthlyGoalUseCase } from './SetMonthlyGoalUseCase';
import { GenerateReportUseCase } from './GenerateReportUseCase';

export interface ProcessMessageDTO {
  phone: string;
  message: string;
  userName: string;
  instance: string;
}

export interface ProcessMessageResult {
  messageId: string;
  responseText: string;
  actions: ActionExecuted[];
}

export interface ActionExecuted {
  action: string;
  success: boolean;
  result?: any;
  error?: string;
}

export class ProcessMessageUseCase {
  constructor(
    private userRepository: IUserRepository,
    private aiService: IAIService,
    private notificationService: INotificationService,
    private logger: ILogger,
    // Use cases que podem ser executados
    private registerTransactionUseCase: RegisterTransactionUseCase,
    private getBalanceUseCase: GetBalanceUseCase,
    private setMonthlyGoalUseCase: SetMonthlyGoalUseCase,
    private generateReportUseCase: GenerateReportUseCase
  ) {}

  async execute(dto: ProcessMessageDTO): Promise<ProcessMessageResult> {
    try {
      // 1. Buscar ou criar usuário
      let user = await this.userRepository.findByPhone(dto.phone);
      
      if (!user) {
        user = User.create(dto.phone, dto.userName);
        await this.userRepository.save(user);
        await this.sendWelcomeMessage(user);
      }

      // 2. Verificar se é primeira interação (precisa configurar meta)
      if (user.isNew()) {
        return await this.handleFirstInteraction(user, dto.message);
      }

      // 3. Processar mensagem com IA
      const aiResponse = await this.aiService.processMessage(dto.message, {
        userId: user.getId(),
        userName: user.getName(),
        sessionState: user.getStatus(),
        categories: await this.getAvailableCategories(),
        lastSummary: await this.getLastSummary(user.getId())
      });

      // 4. Executar ações decididas pela IA
      const executedActions = await this.executeAIActions(user, aiResponse.actions);

      // 5. Formatar resposta final
      const responseText = this.formatResponse(aiResponse.message, executedActions);

      // 6. Enviar resposta ao usuário
      await this.notificationService.sendMessage(user.getId(), responseText);

      // 7. Log da interação
      await this.logger.info('Message processed', {
        userId: user.getId(),
        message: dto.message,
        actions: executedActions.length
      });

      return {
        messageId: this.generateMessageId(),
        responseText,
        actions: executedActions
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logger.error('Failed to process message', {
        error: errorMessage,
        dto
      });
      
      // Enviar mensagem de erro amigável ao usuário
      const errorResponse = 'Desculpe, tive um problema ao processar sua mensagem. Pode tentar novamente? 🤔';
      await this.notificationService.sendMessage(dto.phone, errorResponse);
      
      throw error;
    }
  }

  private async handleFirstInteraction(user: User, message: string): Promise<ProcessMessageResult> {
    // Tentar extrair meta da mensagem
    const goalMatch = message.match(/(\d+(?:[.,]\d+)?)/);
    
    if (goalMatch) {
      const goal = parseFloat(goalMatch[1].replace(',', '.'));
      
      await this.setMonthlyGoalUseCase.execute({
        userId: user.getId(),
        goal
      });
      
      const responseText = `
✅ Perfeito! Sua meta mensal foi definida como R$ ${goal.toFixed(2)}

Agora você pode:
• Dizer "gastei 50 no mercado" para registrar um gasto
• Dizer "recebi 1000 de salário" para registrar uma receita  
• Perguntar "qual meu saldo?" para ver seu resumo
• Pedir "relatório do mês" para análise detalhada

Como posso ajudar? 😊
      `;
      
      return {
        messageId: this.generateMessageId(),
        responseText,
        actions: [{
          action: 'set_monthly_goal',
          success: true,
          result: { goal }
        }]
      };
    }
    
    const responseText = "Por favor, me diga qual é sua meta mensal de gastos. Por exemplo: 'minha meta é 2500 reais' 💰";
    
    return {
      messageId: this.generateMessageId(),
      responseText,
      actions: []
    };
  }

  private async executeAIActions(user: User, actions: AIAction[]): Promise<ActionExecuted[]> {
    const results: ActionExecuted[] = [];

    for (const action of actions) {
      try {
        const result = await this.executeAction(user, action);
        results.push({
          action: action.function,
          success: true,
          result
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          action: action.function,
          success: false,
          error: errorMessage
        });
      }
    }

    return results;
  }

  private async executeAction(user: User, action: AIAction): Promise<any> {
    switch (action.function) {
      case 'registrar_transacao':
        return await this.registerTransactionUseCase.execute({
          userId: user.getId(),
          description: action.parameters.descricao,
          amount: action.parameters.valor,
          type: action.parameters.tipo,
          categoryName: action.parameters.categoria,
          processedByAI: true
        } as RegisterTransactionDTO);

      case 'consultar_saldo':
        return await this.getBalanceUseCase.execute({
          userId: user.getId(),
          period: action.parameters.periodo
        });

      case 'definir_meta':
        return await this.setMonthlyGoalUseCase.execute({
          userId: user.getId(),
          goal: action.parameters.valor
        });

      case 'gerar_relatorio':
        return await this.generateReportUseCase.execute({
          userId: user.getId(),
          reportType: action.parameters.tipo_relatorio
        });

      default:
        throw new DomainError(`Unknown action: ${action.function}`);
    }
  }

  private formatResponse(aiMessage: string, actions: ActionExecuted[]): string {
    let response = aiMessage;

    // Adicionar resultados das ações executadas
    for (const action of actions) {
      if (action.success && action.result) {
        switch (action.action) {
          case 'registrar_transacao':
            if (action.result.alertMessage) {
              response += '\n\n' + action.result.alertMessage;
            }
            break;
          
          case 'consultar_saldo':
            response += '\n\n' + this.formatBalanceResult(action.result);
            break;
          
          case 'gerar_relatorio':
            response += '\n\n' + action.result.report;
            break;
        }
      } else if (!action.success) {
        response += `\n\n❌ Erro ao ${action.action}: ${action.error}`;
      }
    }

    return response;
  }

  private formatBalanceResult(balance: any): string {
    return `
💰 RESUMO FINANCEIRO
• Receitas: R$ ${balance.totalIncome.toFixed(2)}
• Gastos: R$ ${balance.totalExpenses.toFixed(2)}
• Saldo: R$ ${balance.balance.toFixed(2)}
${balance.goalStatus ? `• ${balance.goalStatus}` : ''}
    `;
  }

  private async sendWelcomeMessage(user: User): Promise<void> {
    const welcomeMessage = `
🐷 Olá ${user.getName()}! Eu sou o PoupaPig, seu assistente financeiro pessoal!

Posso te ajudar a:
📊 Registrar gastos e receitas
💰 Controlar seu orçamento
📈 Gerar relatórios financeiros
🎯 Definir e acompanhar metas

Para começar, me diga: qual é sua meta de gastos mensais? 
Por exemplo: "Minha meta é 3000 reais"
    `;
    
    await this.notificationService.sendMessage(user.getId(), welcomeMessage);
  }

  private async getAvailableCategories(): Promise<string[]> {
    // TODO: Implementar busca de categorias
    return [
      'Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Educação',
      'Lazer', 'Compras', 'Serviços', 'Outros Gastos', 'Salário',
      'Freelance', 'Investimentos', 'Vendas', 'Outros Ganhos'
    ];
  }

  private async getLastSummary(userId: string): Promise<any> {
    // TODO: Implementar busca do último resumo
    return null;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
} 