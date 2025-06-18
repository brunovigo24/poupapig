import OpenAI from 'openai';
import { supabaseAdmin } from '../../infrastructure/database/SupabaseClient';
import { Categoria } from '../../domain/interfaces/FinancialBot';

// Configuração do OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface IntencaoMensagem {
  tipo: 'registrar_gasto' | 'registrar_receita' | 'consultar_saldo' | 
        'consultar_categoria' | 'definir_meta' | 'gerar_relatorio' |
        'ajuda' | 'saudacao' | 'despedida' | 'nao_identificada';
  confianca: number;
  dados?: {
    valor?: number;
    descricao?: string;
    categoria?: string;
    periodo?: string;
    meta?: number;
  };
}

export interface RespostaIA {
  mensagem: string;
  precisaConfirmacao: boolean;
  opcoes?: string[];
  graphqlQuery?: string;
  acoes?: AcaoIA[];
}

export interface AcaoIA {
  funcao: string;
  parametros: any;
}

// Definição das funções disponíveis para a IA
const FUNCOES_DISPONIVEIS = [
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
    name: "buscar_transacoes",
    description: "Busca transações com filtros específicos",
    parameters: {
      type: "object",
      properties: {
        categoria: { type: "string", description: "Filtrar por categoria" },
        tipo: { type: "string", enum: ["gasto", "receita"], description: "Filtrar por tipo" },
        periodo: { type: "string", description: "Período (hoje, semana, mes)" }
      }
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

/**
 * Processa mensagem com function calling
 * A IA decide quais funções chamar baseado na mensagem do usuário
 */
export async function processarMensagemComFuncoes(
  mensagem: string,
  contexto: {
    usuarioId: number;
    usuarioNome: string;
    estadoSessao: string;
    categorias: Categoria[];
    ultimoResumo?: any;
  }
): Promise<RespostaIA> {
  const systemPrompt = `
Você é o PoupaPig 🐷, um assistente financeiro inteligente e amigável.

Contexto atual:
- Usuário: ${contexto.usuarioNome} (ID: ${contexto.usuarioId})
- Estado da sessão: ${contexto.estadoSessao}
- Categorias disponíveis: ${contexto.categorias.map(c => `${c.nome} (${c.tipo})`).join(', ')}

Você pode chamar funções para executar ações. Analise a mensagem e decida:
1. Quais funções chamar (se necessário)
2. Com quais parâmetros
3. Qual mensagem responder ao usuário

Seja proativo e execute ações quando o usuário pedir claramente.
Se faltar informação crucial, pergunte antes de executar.
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-0613",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: mensagem }
      ],
      functions: FUNCOES_DISPONIVEIS,
      function_call: "auto",
      temperature: 0.3,
      max_tokens: 500
    });

    const message = response.choices[0].message;
    const acoes: AcaoIA[] = [];
    let mensagemResposta = "";

    // Se a IA decidiu chamar uma função
    if (message?.function_call) {
      const funcao = message.function_call.name;
      const parametros = JSON.parse(message.function_call.arguments || '{}');
      
      acoes.push({ funcao, parametros });

      // Gera mensagem baseada na função chamada
      mensagemResposta = gerarMensagemParaAcao(funcao, parametros, contexto);
    } else {
      // Resposta direta sem chamar função
      mensagemResposta = message?.content || "Desculpe, não entendi. Pode repetir?";
    }

    return {
      mensagem: mensagemResposta,
      precisaConfirmacao: false,
      acoes
    };
  } catch (error) {
    console.error('Erro ao processar com funções:', error);
    return {
      mensagem: "Ops! Tive um problema ao processar. Pode tentar novamente? 🤔",
      precisaConfirmacao: false
    };
  }
}

/**
 * Gera mensagem apropriada para cada ação
 */
function gerarMensagemParaAcao(
  funcao: string,
  parametros: any,
  contexto: any
): string {
  switch (funcao) {
    case 'registrar_transacao':
      return `✅ Vou registrar ${parametros.tipo === 'gasto' ? 'o gasto' : 'a receita'} de R$ ${parametros.valor.toFixed(2)} com "${parametros.descricao}"`;
    
    case 'consultar_saldo':
      return '📊 Consultando seu saldo...';
    
    case 'definir_meta':
      return `🎯 Definindo sua meta mensal para R$ ${parametros.valor.toFixed(2)}...`;
    
    case 'buscar_transacoes':
      return `🔍 Buscando ${parametros.tipo || 'transações'} ${parametros.categoria ? `da categoria ${parametros.categoria}` : ''}...`;
    
    case 'gerar_relatorio':
      return `📈 Gerando relatório ${parametros.tipo_relatorio}...`;
    
    default:
      return '⏳ Processando...';
  }
}

/**
 * Detecta a intenção do usuário e extrai dados relevantes
 */
export async function detectarIntencao(mensagem: string, categorias: Categoria[]): Promise<IntencaoMensagem> {
  const categoriasTexto = categorias.map(c => `${c.nome} (${c.tipo})`).join(', ');
  
  const prompt = `
Você é um assistente financeiro. Analise a mensagem do usuário e identifique a intenção.

Categorias disponíveis: ${categoriasTexto}

Mensagem do usuário: "${mensagem}"

Responda APENAS em JSON no formato:
{
  "tipo": "tipo_da_intencao",
  "confianca": 0.0-1.0,
  "dados": {
    "valor": numero_ou_null,
    "descricao": "string_ou_null",
    "categoria": "nome_categoria_ou_null",
    "periodo": "string_ou_null",
    "meta": numero_ou_null
  }
}

Tipos de intenção possíveis:
- registrar_gasto: quando o usuário quer adicionar um gasto
- registrar_receita: quando o usuário quer adicionar uma receita
- consultar_saldo: quando quer saber saldo ou resumo financeiro
- consultar_categoria: quando quer saber sobre categorias
- definir_meta: quando quer definir meta mensal
- gerar_relatorio: quando quer relatório detalhado
- ajuda: quando pede ajuda ou não sabe o que fazer
- saudacao: cumprimentos iniciais
- despedida: despedidas
- nao_identificada: quando não consegue identificar

Extraia valores monetários corretamente (ex: "50 reais" = 50, "R$ 100,50" = 100.50).
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Você é um assistente especializado em análise de intenções para um bot financeiro. Responda sempre em JSON válido."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 200
    });

    const resposta = completion.choices[0].message?.content || '{}';
    const intencao = JSON.parse(resposta);
    
    // Validação básica
    if (!intencao.tipo || !intencao.confianca) {
      throw new Error('Resposta inválida da IA');
    }

    return intencao;
  } catch (error) {
    console.error('Erro ao detectar intenção:', error);
    return {
      tipo: 'nao_identificada',
      confianca: 0
    };
  }
}

/**
 * Gera resposta adequada baseada na intenção e contexto
 */
export async function gerarResposta(
  intencao: IntencaoMensagem,
  contexto: {
    usuarioNome: string;
    primeiraInteracao: boolean;
    ultimoResumo?: any;
    categorias?: Categoria[];
  }
): Promise<RespostaIA> {
  const prompt = `
Você é o PoupaPig 🐷, um assistente financeiro amigável e eficiente.

Contexto:
- Nome do usuário: ${contexto.usuarioNome}
- Primeira interação: ${contexto.primeiraInteracao ? 'Sim' : 'Não'}
- Intenção detectada: ${intencao.tipo}
- Dados extraídos: ${JSON.stringify(intencao.dados || {})}

${contexto.ultimoResumo ? `Resumo financeiro atual:
- Total de gastos: R$ ${contexto.ultimoResumo.totalGastos}
- Total de receitas: R$ ${contexto.ultimoResumo.totalReceitas}
- Saldo: R$ ${contexto.ultimoResumo.saldo}` : ''}

Gere uma resposta apropriada em JSON:
{
  "mensagem": "sua resposta aqui",
  "precisaConfirmacao": true/false,
  "opcoes": ["opção1", "opção2"] ou null
}

Use emojis para tornar a conversa mais amigável.
Seja conciso mas educado.
Se for registrar transação e faltarem dados, peça confirmação.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Você é o PoupaPig, um assistente financeiro. Responda sempre em JSON válido e seja amigável."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 300
    });

    const resposta = completion.choices[0].message?.content || '{}';
    return JSON.parse(resposta);
  } catch (error) {
    console.error('Erro ao gerar resposta:', error);
    return {
      mensagem: "Desculpe, tive um problema ao processar sua mensagem. Pode tentar novamente? 🤔",
      precisaConfirmacao: false
    };
  }
}

/**
 * Gera query GraphQL para consultas complexas
 */
export async function gerarGraphQLQuery(
  tipo: string,
  parametros: any
): Promise<string> {
  const queries: Record<string, string> = {
    resumo_mensal: `
      query ResumoMensal($usuarioId: Int!, $mes: String!) {
        transacoes(
          where: {
            usuario_id: {_eq: $usuarioId},
            data: {_gte: $mes}
          }
        ) {
          id
          descricao
          valor
          tipo
          data
          categoria {
            nome
            icone
          }
        }
      }
    `,
    gastos_por_categoria: `
      query GastosPorCategoria($usuarioId: Int!, $inicio: String!, $fim: String!) {
        transacoes_aggregate(
          where: {
            usuario_id: {_eq: $usuarioId},
            tipo: {_eq: "gasto"},
            data: {_gte: $inicio, _lte: $fim}
          }
          group_by: {categoria_id}
        ) {
          aggregate {
            sum {
              valor
            }
          }
          nodes {
            categoria {
              nome
              icone
              cor
            }
          }
        }
      }
    `
  };

  return queries[tipo] || '';
}

/**
 * Registra log de interação
 */
export async function registrarLogInteracao(
  usuarioId: number,
  mensagemUsuario: string,
  respostaBot: string,
  sucesso: boolean,
  erro?: string,
  dadosExtras?: {
    categoriaDetectada?: string;
    valorDetectado?: number;
    processadaComIA: boolean;
  }
): Promise<void> {
  await supabaseAdmin
    .from('logs_interacao')
    .insert({
      usuario_id: usuarioId,
      mensagem_usuario: mensagemUsuario,
      resposta_bot: respostaBot,
      processada_com_ia: dadosExtras?.processadaComIA || false,
      categoria_detectada: dadosExtras?.categoriaDetectada,
      valor_detectado: dadosExtras?.valorDetectado,
      sucesso,
      erro
    });
} 