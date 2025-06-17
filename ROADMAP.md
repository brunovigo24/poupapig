# 🐷 PoupaPig - Agente Financeiro - WhatsApp

Agente inteligente para controle financeiro pessoal via WhatsApp, integrado com Evolution API.

## 📱 Como Funciona

O agente permite que os usuários gerenciem suas finanças diretamente pelo WhatsApp de forma simples e intuitiva:

1. **Envie "oi"** - O bot te dá boas-vindas e explica como usar
2. **Registre gastos** - "Almoço 25", "Uber 15", "Mercado 85.50"
3. **Registre receitas** - "+Salário 3000", "+Freelance 500"
4. **Veja relatórios** - "relatório", "resumo", "gastos"
5. **Obtenha ajuda** - "ajuda" para ver todos os comandos

### Exemplo de Uso

```
Usuário: oi
Agente: 🐷 Olá João! Bem-vindo ao seu assistente financeiro pessoal!
     💰 Aqui você pode registrar gastos, receitas e ver relatórios...

Usuário: Misto quente 19
Agente: ✅ Gasto registrado!
     📝 Misto quente (Alimentação)
     💸 -R$ 19.00
     📅 27/05/2025 - #a3f5d2

Usuário: relatório
Agente: 📊 Relatório de maio 2025
     💰 Receitas: R$ 3500.00
     💸 Gastos: R$ 1250.00
     💳 Saldo: R$ 2250.00
     ...
```

## 🏗️ Estrutura do Banco de Dados

### Tabelas Principais

1. **usuarios_bot** - Usuários registrados no agente
2. **categorias** - Categorias de gastos e receitas (padrão e personalizadas)
3. **transacoes** - Registro de todas as transações financeiras
4. **configuracoes_usuario** - Configurações personalizadas de cada usuário
5. **alertas** - Sistema de alertas e notificações
6. **sessoes_conversa** - Controle de estado das conversas
7. **log_interacoes** - Log completo de interações para analytics

## 🤖 Funcionalidades da IA

### Detecção Automática de Categorias

O agente usa inteligência artificial para categorizar automaticamente os gastos baseado em palavras-chave:

- **Alimentação**: comida, lanche, almoço, misto, pizza, restaurante...
- **Transporte**: uber, taxi, ônibus, gasolina, estacionamento...
- **Saúde**: médico, remédio, farmácia, hospital, consulta...
- **Lazer**: cinema, teatro, show, jogo, diversão...

### Extração de Valores

- Reconhece valores em diferentes formatos: `25`, `25.50`, `25,50`
- Separa automaticamente a descrição do valor
- Identifica receitas com o prefixo `+`

### Processamento de Linguagem Natural

- Entende saudações: "oi", "olá", "bom dia", etc.
- Reconhece comandos: "relatório", "resumo", "ajuda"
- Interpreta diferentes formas de escrita

## 📊 Relatórios e Analytics

### Relatório Mensal
- Total de receitas e gastos
- Saldo atual
- Gastos por categoria
- Quantidade de transações

### Visualizações Futuras
- Gráficos de evolução mensal
- Comparativo de categorias
- Alertas inteligentes de gastos

## 🔮 Roadmap Futuro

### Integração com OpenAI/ChatGPT
- Análise mais inteligente de textos
- Sugestões personalizadas de economia
- Conversas mais naturais

### Funcionalidades Avançadas
- Metas de gastos com alertas
- Planejamento financeiro
- Integração com bancos via Open Banking
- Exportação de dados (PDF, Excel)
- Dashboard web para visualização

### Melhorias na IA
- Aprendizado das categorias pessoais do usuário
- Reconhecimento de padrões de gasto
- Alertas preditivos

## 🛠️ Desenvolvimento

### Estrutura de Arquivos

```
src/
├── interfaces/
│   └── FinancialBot.ts          # Interfaces TypeScript
├── services/
│   ├── financialBotService.ts   # Lógica principal do agente
│   └── messageProcessor.ts     # Processamento de mensagens
├── controllers/
│   └── financialBotController.ts # Controllers da API
└── routes/
      └── financialBotRoutes.ts    # Rotas do agente
```

### Adicionando Novas Funcionalidades

1. **Nova categoria**: Adicione no banco e no `detectarCategoria()`
2. **Novo comando**: Implemente em `messageProcessor.ts`
3. **Nova análise**: Adicione em `financialBotService.ts`


