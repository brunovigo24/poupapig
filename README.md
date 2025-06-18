# PoupaPig API 🐷💰
API do PoupaPig, construída com Express.js.

## 📋 Pré-requisitos

- Node.js >= 18.0.0
- npm ou yarn

## ⚙️ Scripts Disponíveis

- `npm run dev` - Inicia o servidor em modo desenvolvimento com auto-reload
- `npm run build` - Compila o projeto
- `npm start` - Inicia o servidor em modo produção

# Estrutura do Projeto - Clean Architecture

Este projeto segue os princípios da Clean Architecture, organizando o código em camadas bem definidas com responsabilidades específicas.

## 📁 Estrutura de Diretórios

```
src/
├── domain/                 # Camada de Domínio
│   ├── entities/          # Entidades de negócio
│   │   ├── User.ts       # Entidade usuário com regras de negócio
│   │   └── Transaction.ts # Entidade transação financeira
│   ├── interfaces/        # Interfaces legadas (serão refatoradas)
│   │   ├── FinancialBot.ts
│   │   ├── WebhookDados.ts
│   │   └── EvolutionInstance.ts
│   └── repositories/      # Interfaces de repositórios
│       └── IUserRepository.ts
│
├── application/           # Camada de Aplicação
│   ├── use-cases/        # Casos de uso (regras de aplicação)
│   │   └── RegisterTransactionUseCase.ts
│   └── ports/            # Interfaces para serviços externos
│       └── INotificationService.ts
│
├── infrastructure/        # Camada de Infraestrutura
│   ├── config/           # Configurações
│   │   └── dependency-injection.ts
│   ├── database/         # Configuração de banco de dados
│   │   └── SupabaseClient.ts
│   ├── middleware/       # Middlewares Express
│   │   ├── authMiddleware.ts
│   │   └── RateLimitMiddleware.ts
│   ├── repositories/     # Implementações dos repositórios
│   │   └── SupabaseUserRepository.ts
│   └── services/         # Serviços externos
│       ├── AIService.ts
│       ├── EvolutionApiService.ts
│       ├── EvolutionInstanceService.ts
│       └── EvolutionManagerService.ts
│
├── presentation/          # Camada de Apresentação
│   ├── controllers/      # Controllers HTTP
│   │   ├── AuthController.ts
│   │   ├── EvolutionController.ts
│   │   └── WebhookController.ts
│   ├── dtos/            # Data Transfer Objects
│   │   └── WebhookMessageDTO.ts
│   └── routes/          # Definição de rotas
│       ├── authRoutes.ts
│       ├── evolutionRoutes.ts
│       ├── statusRoutes.ts
│       └── webhook.routes.ts
│
├── shared/               # Código compartilhado
│   └── errors/          # Classes de erro customizadas
│       └── index.ts
│
├── app.ts               # Configuração do Express
└── index.ts             # Ponto de entrada da aplicação
```

## 🔧 Princípios da Arquitetura

### 1. **Domain Layer** (Camada de Domínio)
- Contém a lógica de negócio pura
- Entidades com validações e regras de negócio
- Value Objects (ex: Money)
- Interfaces de repositórios (sem implementação)
- Não depende de nenhuma outra camada

### 2. **Application Layer** (Camada de Aplicação)
- Contém os casos de uso da aplicação
- Orquestra o fluxo de dados entre as camadas
- Define interfaces (ports) para serviços externos
- Implementa regras de aplicação (diferente de regras de negócio)

### 3. **Infrastructure Layer** (Camada de Infraestrutura)
- Implementações concretas de repositórios
- Serviços externos (APIs, Cache, etc)
- Configurações de banco de dados
- Middlewares técnicos

### 4. **Presentation Layer** (Camada de Apresentação)
- Controllers que recebem requisições HTTP
- DTOs para validação de entrada/saída
- Definição de rotas
- Formatação de respostas

## 🔄 Fluxo de Dados

```
HTTP Request → Controller → Use Case → Domain/Repository → Database
                   ↓            ↓              ↓              ↓
                  DTO      Application      Domain      Infrastructure
                            Service        Entity
```

## 💡 Benefícios

1. **Testabilidade**: Cada camada pode ser testada isoladamente
2. **Manutenibilidade**: Responsabilidades bem definidas
3. **Escalabilidade**: Fácil adicionar novos casos de uso
4. **Independência**: Domain não depende de frameworks ou bibliotecas externas

## 🚀 Como Adicionar Novas Funcionalidades

### 1. Nova Entidade de Domínio
```typescript
// src/domain/entities/NewEntity.ts
export class NewEntity {
  // Implementar com validações e regras de negócio
}
```

### 2. Novo Caso de Uso
```typescript
// src/application/use-cases/NewUseCase.ts
export class NewUseCase {
  constructor(
    private repository: IRepository,
    private service: IService
  ) {}
  
  async execute(dto: DTO): Promise<Result> {
    // Implementar lógica
  }
}
```

### 3. Novo Controller
```typescript
// src/presentation/controllers/NewController.ts
export class NewController {
  constructor(private useCase: NewUseCase) {}
  
  async handle(req: Request, res: Response): Promise<void> {
    // Validar entrada, chamar use case, formatar resposta
  }
}
```

## 📝 Convenções

- **Nomes de arquivos**: PascalCase para classes, camelCase para outros
- **Interfaces**: Prefixo "I" (ex: IUserRepository)
- **DTOs**: Sufixo "DTO" (ex: CreateUserDTO)
- **Use Cases**: Sufixo "UseCase" (ex: RegisterUserUseCase)
- **Erros**: Classes customizadas em shared/errors 

## 📝 Licença

Este projeto está licenciado sob a Licença Apache 2.0 - veja o arquivo [LICENSE](LICENSE) para detalhes.

---

**Desenvolvido com ❤️ por [Bruno Vigo](https://www.linkedin.com/in/bruno-vigo-506026206/) para simplificar o controle financeiro pessoal.** 