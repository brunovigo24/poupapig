-- SQL para criar as tabelas do sistema financeiro do bot no Supabase
-- Baseado nas interfaces TypeScript em src/interfaces/FinancialBot.ts

-- Tabela de usuários do sistema (autenticação)
CREATE TABLE public.users (
  id bigint NOT NULL DEFAULT nextval('users_id_seq'::regclass),
  username character varying NOT NULL UNIQUE,
  password character varying NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- Tabela de instâncias Evolution API
CREATE TABLE public.evolution_instances (
  id integer NOT NULL DEFAULT nextval('evolution_instances_id_seq'::regclass),
  instance_name character varying NOT NULL UNIQUE,
  instance_id character varying NOT NULL,
  hash character varying NOT NULL,
  status character varying DEFAULT 'connecting'::character varying,
  webhook_url text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT evolution_instances_pkey PRIMARY KEY (id)
);

-- Primeiro, vamos criar os tipos ENUM
CREATE TYPE status_usuario_bot AS ENUM ('novo', 'ativo', 'configurando', 'inativo');
CREATE TYPE estado_conversa AS ENUM ('aguardando_comando', 'processando_gasto', 'configurando', 'gerando_relatorio');
CREATE TYPE tipo_transacao AS ENUM ('gasto', 'receita');
CREATE TYPE tipo_alerta AS ENUM ('meta_atingida', 'limite_proximo', 'gasto_alto', 'resumo_diario', 'resumo_semanal');

-- Tabela de usuários do bot
CREATE TABLE usuarios_bot (
    id SERIAL PRIMARY KEY,
    telefone VARCHAR(20) NOT NULL UNIQUE,
    nome VARCHAR(255) NOT NULL,
    status status_usuario_bot NOT NULL DEFAULT 'novo',
    configuracao_completa BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de categorias
CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    icone VARCHAR(50) NOT NULL,
    cor VARCHAR(7) NOT NULL, -- Para códigos de cor hex
    tipo tipo_transacao NOT NULL,
    ativa BOOLEAN NOT NULL DEFAULT TRUE,
    usuario_id INTEGER REFERENCES usuarios_bot(id) ON DELETE CASCADE, -- NULL para categorias padrão
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de configurações do usuário
CREATE TABLE configuracoes_usuario (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios_bot(id) ON DELETE CASCADE,
    meta_mensal DECIMAL(10,2),
    alertas_ativados BOOLEAN NOT NULL DEFAULT TRUE,
    alerta_percentual INTEGER NOT NULL DEFAULT 80,
    moeda VARCHAR(3) NOT NULL DEFAULT 'BRL',
    fuso_horario VARCHAR(50) NOT NULL DEFAULT 'America/Sao_Paulo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(usuario_id)
);

-- Tabela de transações
CREATE TABLE transacoes (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios_bot(id) ON DELETE CASCADE,
    descricao TEXT NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    categoria_id INTEGER NOT NULL REFERENCES categorias(id),
    tipo tipo_transacao NOT NULL,
    data TIMESTAMP WITH TIME ZONE NOT NULL,
    hash_identificador VARCHAR(32) NOT NULL UNIQUE,
    processada_por_ia BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de alertas
CREATE TABLE alertas (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios_bot(id) ON DELETE CASCADE,
    tipo tipo_alerta NOT NULL,
    mensagem TEXT NOT NULL,
    enviado BOOLEAN NOT NULL DEFAULT FALSE,
    data_envio TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de sessões de conversa
CREATE TABLE sessoes_conversa (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios_bot(id) ON DELETE CASCADE,
    estado estado_conversa NOT NULL DEFAULT 'aguardando_comando',
    contexto JSONB, -- Para dados temporários da conversa
    ultima_interacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(usuario_id) -- Um usuário só pode ter uma sessão ativa
);

-- Tabela de logs de interação
CREATE TABLE logs_interacao (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios_bot(id) ON DELETE CASCADE,
    mensagem_usuario TEXT NOT NULL,
    resposta_bot TEXT NOT NULL,
    processada_com_ia BOOLEAN NOT NULL DEFAULT FALSE,
    categoria_detectada VARCHAR(100),
    valor_detectado DECIMAL(10,2),
    sucesso BOOLEAN NOT NULL DEFAULT TRUE,
    erro TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criação de índices para melhor performance

-- Índices para tabelas de sistema
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_evolution_instances_instance_name ON evolution_instances(instance_name);
CREATE INDEX idx_evolution_instances_instance_id ON evolution_instances(instance_id);
CREATE INDEX idx_evolution_instances_status ON evolution_instances(status);

-- Índices para tabelas do bot financeiro
CREATE INDEX idx_usuarios_bot_telefone ON usuarios_bot(telefone);
CREATE INDEX idx_usuarios_bot_status ON usuarios_bot(status);

CREATE INDEX idx_categorias_usuario_id ON categorias(usuario_id);
CREATE INDEX idx_categorias_tipo ON categorias(tipo);
CREATE INDEX idx_categorias_ativa ON categorias(ativa);

CREATE INDEX idx_transacoes_usuario_id ON transacoes(usuario_id);
CREATE INDEX idx_transacoes_categoria_id ON transacoes(categoria_id);
CREATE INDEX idx_transacoes_data ON transacoes(data);
CREATE INDEX idx_transacoes_tipo ON transacoes(tipo);
CREATE INDEX idx_transacoes_hash ON transacoes(hash_identificador);

CREATE INDEX idx_alertas_usuario_id ON alertas(usuario_id);
CREATE INDEX idx_alertas_enviado ON alertas(enviado);
CREATE INDEX idx_alertas_tipo ON alertas(tipo);

CREATE INDEX idx_sessoes_conversa_usuario_id ON sessoes_conversa(usuario_id);
CREATE INDEX idx_sessoes_conversa_estado ON sessoes_conversa(estado);

CREATE INDEX idx_logs_interacao_usuario_id ON logs_interacao(usuario_id);
CREATE INDEX idx_logs_interacao_timestamp ON logs_interacao(timestamp);
CREATE INDEX idx_logs_interacao_sucesso ON logs_interacao(sucesso);

-- Função para atualizar automaticamente o campo updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar automaticamente o campo updated_at
CREATE TRIGGER update_usuarios_bot_updated_at 
    BEFORE UPDATE ON usuarios_bot 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_configuracoes_usuario_updated_at 
    BEFORE UPDATE ON configuracoes_usuario 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessoes_conversa_updated_at 
    BEFORE UPDATE ON sessoes_conversa 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evolution_instances_updated_at 
    BEFORE UPDATE ON evolution_instances 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir algumas categorias padrão
INSERT INTO categorias (nome, icone, cor, tipo, ativa, usuario_id) VALUES
-- Categorias de gastos
('Alimentação', '🍽️', '#FF6B6B', 'gasto', TRUE, NULL),
('Transporte', '🚗', '#4ECDC4', 'gasto', TRUE, NULL),
('Moradia', '🏠', '#45B7D1', 'gasto', TRUE, NULL),
('Saúde', '⚕️', '#96CEB4', 'gasto', TRUE, NULL),
('Educação', '📚', '#FFEAA7', 'gasto', TRUE, NULL),
('Lazer', '🎉', '#DDA0DD', 'gasto', TRUE, NULL),
('Compras', '🛒', '#98D8C8', 'gasto', TRUE, NULL),
('Serviços', '🔧', '#F7DC6F', 'gasto', TRUE, NULL),
('Outros Gastos', '💸', '#F1948A', 'gasto', TRUE, NULL),

-- Categorias de receitas
('Salário', '💼', '#52C41A', 'receita', TRUE, NULL),
('Freelance', '💻', '#13C2C2', 'receita', TRUE, NULL),
('Investimentos', '📈', '#1890FF', 'receita', TRUE, NULL),
('Vendas', '💰', '#722ED1', 'receita', TRUE, NULL),
('Outros Ganhos', '💸', '#52C41A', 'receita', TRUE, NULL);

-- Comentários sobre o uso das tabelas:
/*
1. usuarios_bot: Armazena informações básicas dos usuários do bot
2. categorias: Categorias de gastos/receitas (padrão e personalizadas por usuário)
3. configuracoes_usuario: Configurações pessoais de cada usuário
4. transacoes: Todas as transações financeiras registradas
5. alertas: Sistema de notificações e alertas
6. sessoes_conversa: Controle de estado das conversas com o bot
7. logs_interacao: Log completo de todas as interações para auditoria

Características importantes:
- Usa JSONB para contexto de sessão (flexível para dados temporários)
- Triggers automáticos para updated_at
- Índices otimizados para consultas frequentes
- Constraints de integridade referencial
- Categorias padrão pré-inseridas
- Suporte a timestamps com timezone
*/ 