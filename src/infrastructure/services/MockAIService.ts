import { IAIService, AIContext, AIResponse, Intent } from '../../application/ports/INotificationService';

export class MockAIService implements IAIService {
  async processMessage(message: string, context: AIContext): Promise<AIResponse> {
    // Respostas simples baseadas em palavras-chave
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('saldo') || lowerMessage.includes('quanto')) {
      return {
        message: '📊 Para verificar seu saldo, aguarde a integração com a IA ser ativada.',
        actions: [{
          function: 'consultar_saldo',
          parameters: { periodo: 'mes_atual' }
        }],
        needsConfirmation: false
      };
    }
    
    if (lowerMessage.includes('gastei') || lowerMessage.includes('comprei')) {
      return {
        message: '💳 Para registrar gastos, aguarde a integração com a IA ser ativada.',
        actions: [],
        needsConfirmation: false
      };
    }
    
    if (lowerMessage.includes('meta')) {
      return {
        message: '🎯 Para definir metas, aguarde a integração com a IA ser ativada.',
        actions: [],
        needsConfirmation: false
      };
    }
    
    return {
      message: '🤖 Desculpe, estou operando em modo limitado. Para ter acesso completo às minhas funcionalidades, configure a OPENAI_API_KEY.',
      actions: [],
      needsConfirmation: false
    };
  }

  async detectIntent(message: string, categories: string[]): Promise<Intent> {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('saldo') || lowerMessage.includes('quanto')) {
      return { type: 'consultar_saldo', confidence: 0.8 };
    }
    
    if (lowerMessage.includes('gastei') || lowerMessage.includes('comprei')) {
      return { type: 'registrar_gasto', confidence: 0.7, data: {} };
    }
    
    if (lowerMessage.includes('recebi') || lowerMessage.includes('ganhei')) {
      return { type: 'registrar_receita', confidence: 0.7, data: {} };
    }
    
    if (lowerMessage.includes('meta')) {
      return { type: 'definir_meta', confidence: 0.7, data: {} };
    }
    
    return { type: 'nao_identificada', confidence: 0 };
  }
} 