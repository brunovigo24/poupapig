// Interfaces para o sistema financeiro do bot

export enum StatusUsuarioBot {
  Novo = 'novo',
  Ativo = 'ativo',
  Configurando = 'configurando',
  Inativo = 'inativo'
}

export enum EstadoConversa {
  AguardandoComando = 'aguardando_comando',
  ProcessandoGasto = 'processando_gasto',
  Configurando = 'configurando',
  GerandoRelatorio = 'gerando_relatorio',
}

export interface UsuarioBot {
  id?: number;
  telefone: string;
  nome: string;
  status: StatusUsuarioBot;
  configuracao_completa: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface Categoria {
  id?: number;
  nome: string;
  icone: string;
  cor: string;
  tipo: 'gasto' | 'receita';
  ativa: boolean;
  usuario_id?: number; // null para categorias padrão
  created_at?: Date;
}

export interface Transacao {
  id?: number;
  usuario_id: number;
  descricao: string;
  valor: number;
  categoria_id: number;
  tipo: 'gasto' | 'receita';
  data: Date;
  hash_identificador: string; // Para referência nas mensagens
  processada_por_ia: boolean;
  created_at?: Date;
}

export interface ConfiguracaoUsuario {
  id?: number;
  usuario_id: number;
  meta_mensal?: number;
  alertas_ativados: boolean;
  alerta_percentual: number; // Ex: 80 para alertar em 80% da meta
  moeda: string; // Ex: 'BRL'
  fuso_horario: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface Alerta {
  id?: number;
  usuario_id: number;
  tipo: 'meta_atingida' | 'limite_proximo' | 'gasto_alto' | 'resumo_diario' | 'resumo_semanal';
  mensagem: string;
  enviado: boolean;
  data_envio?: Date;
  created_at?: Date;
}

export interface SessaoConversa {
  id?: number;
  usuario_id: number;
  estado: EstadoConversa;
  contexto?: string; // JSON com dados temporários da conversa
  ultima_interacao: Date;
  created_at?: Date;
  updated_at?: Date;
}

export interface LogInteracao {
  id?: number;
  usuario_id: number;
  mensagem_usuario: string;
  resposta_bot: string;
  processada_com_ia: boolean;
  categoria_detectada?: string;
  valor_detectado?: number;
  sucesso: boolean;
  erro?: string;
  timestamp: Date;
} 