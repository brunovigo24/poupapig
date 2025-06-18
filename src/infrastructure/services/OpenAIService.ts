import OpenAI from 'openai';
import { IAIService, AIContext, AIResponse, Intent } from '../../application/ports/INotificationService';

export class OpenAIService implements IAIService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async processMessage(message: string, context: AIContext): Promise<AIResponse> {
    const systemPrompt = `
Você é o PoupaPig 🐷, um assistente financeiro inteligente e amigável.

Contexto atual:
- Usuário: ${context.userName} (ID: ${context.userId})
- Estado da sessão: ${context.sessionState}
- Categorias disponíveis: ${context.categories.join(', ')}

Você pode chamar funções para executar ações. Analise a mensagem e decida:
1. Quais funções chamar (se necessário)
2. Com quais parâmetros
3. Qual mensagem responder ao usuário

Seja proativo e execute ações quando o usuário pedir claramente.
`;

    const functions = [
      {
        name: "registrar_transacao",
        description: "Registra um gasto ou receita do usuário",
        parameters: {
          type: "object",
          properties: {
            valor: { type: "number", description: "Valor da transação" },
            descricao: { type: "string", description: "Descrição da transação" },
            tipo: { type: "string", enum: ["gasto", "receita"], description: "Tipo da transação" },
            categoria: { type: "string", description: "Nome da categoria" }
          },
          required: ["valor", "descricao", "tipo"]
        }
      },
      {
        name: "consultar_saldo",
        description: "Consulta o saldo e resumo financeiro do usuário",
        parameters: {
          type: "object",
          properties: {
            periodo: { type: "string", description: "Período para consulta (mes_atual, semana, etc)" }
          }
        }
      },
      {
        name: "definir_meta",
        description: "Define ou atualiza a meta mensal de gastos",
        parameters: {
          type: "object",
          properties: {
            valor: { type: "number", description: "Valor da meta mensal" }
          },
          required: ["valor"]
        }
      },
      {
        name: "gerar_relatorio",
        description: "Gera relatório detalhado das finanças",
        parameters: {
          type: "object",
          properties: {
            tipo_relatorio: { 
              type: "string", 
              enum: ["mensal", "semanal", "por_categoria", "comparativo"],
              description: "Tipo de relatório a gerar" 
            }
          }
        }
      }
    ];

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo-0613",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        functions,
        function_call: "auto",
        temperature: 0.3,
        max_tokens: 500
      });

      const choice = response.choices[0];
      const actions = [];
      let responseMessage = "";

      if (choice.message.function_call) {
        const functionName = choice.message.function_call.name;
        const parameters = JSON.parse(choice.message.function_call.arguments || '{}');
        
        actions.push({
          function: functionName,
          parameters
        });

        responseMessage = this.generateActionMessage(functionName, parameters);
      } else {
        responseMessage = choice.message.content || "Desculpe, não entendi. Pode repetir?";
      }

      return {
        message: responseMessage,
        actions,
        needsConfirmation: false
      };

    } catch (error) {
      console.error('Error calling OpenAI:', error);
      return {
        message: "Desculpe, tive um problema ao processar sua mensagem. Pode tentar novamente? 🤔",
        actions: [],
        needsConfirmation: false
      };
    }
  }

  async detectIntent(message: string, categories: string[]): Promise<Intent> {
    const prompt = `
Analise a mensagem e identifique a intenção do usuário.
Categorias disponíveis: ${categories.join(', ')}
Mensagem: "${message}"

Responda em JSON:
{
  "type": "tipo_da_intencao",
  "confidence": 0.0-1.0,
  "data": {}
}

Tipos: registrar_gasto, registrar_receita, consultar_saldo, definir_meta, gerar_relatorio, ajuda, nao_identificada
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Você é um assistente especializado em análise de intenções. Responda sempre em JSON válido."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      });

      const content = response.choices[0].message.content || '{}';
      const intent = JSON.parse(content);

      return {
        type: intent.type || 'nao_identificada',
        confidence: intent.confidence || 0,
        data: intent.data || {}
      };

    } catch (error) {
      console.error('Error detecting intent:', error);
      return {
        type: 'nao_identificada',
        confidence: 0
      };
    }
  }

  private generateActionMessage(functionName: string, parameters: any): string {
    switch (functionName) {
      case 'registrar_transacao':
        return `✅ Vou registrar ${parameters.tipo === 'gasto' ? 'o gasto' : 'a receita'} de R$ ${parameters.valor.toFixed(2)} com "${parameters.descricao}"`;
      
      case 'consultar_saldo':
        return '📊 Consultando seu saldo...';
      
      case 'definir_meta':
        return `🎯 Definindo sua meta mensal para R$ ${parameters.valor.toFixed(2)}...`;
      
      case 'gerar_relatorio':
        return `📈 Gerando relatório ${parameters.tipo_relatorio}...`;
      
      default:
        return '⏳ Processando...';
    }
  }
} 