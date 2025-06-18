// Entidade de Usuário seguindo Domain-Driven Design
export class User {
  private constructor(
    private readonly id: string,
    private readonly phone: string,
    private name: string,
    private status: UserStatus,
    private monthlyGoal?: Money,
    private readonly createdAt: Date = new Date()
  ) {
    this.validate();
  }

  // Factory method para criar novo usuário
  static create(phone: string, name: string): User {
    return new User(
      generateId(),
      phone,
      name,
      UserStatus.NEW
    );
  }

  // Factory method para reconstituir do banco
  static reconstitute(
    id: string,
    phone: string,
    name: string,
    status: UserStatus,
    monthlyGoal?: Money,
    createdAt?: Date
  ): User {
    return new User(id, phone, name, status, monthlyGoal, createdAt);
  }

  // Métodos de negócio
  setMonthlyGoal(amount: number): void {
    if (amount <= 0) {
      throw new DomainError('Monthly goal must be positive');
    }
    this.monthlyGoal = Money.fromBRL(amount);
    this.status = UserStatus.ACTIVE;
  }

  isNew(): boolean {
    return this.status === UserStatus.NEW;
  }

  canReceiveAlerts(): boolean {
    return this.status === UserStatus.ACTIVE && this.monthlyGoal !== undefined;
  }

  private validate(): void {
    if (!this.phone.match(/^\d{10,15}$/)) {
      throw new DomainError('Invalid phone number');
    }
    if (this.name.length < 2) {
      throw new DomainError('Name too short');
    }
  }

  // Getters
  getId(): string { return this.id; }
  getPhone(): string { return this.phone; }
  getName(): string { return this.name; }
  getStatus(): UserStatus { return this.status; }
  getMonthlyGoal(): Money | undefined { return this.monthlyGoal; }
}

// Value Objects
export class Money {
  private constructor(
    private readonly amount: number,
    private readonly currency: string
  ) {
    if (amount < 0) {
      throw new DomainError('Amount cannot be negative');
    }
  }

  static fromBRL(amount: number): Money {
    return new Money(amount, 'BRL');
  }

  getValue(): number {
    return this.amount;
  }

  format(): string {
    return `R$ ${this.amount.toFixed(2)}`;
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new DomainError('Cannot add different currencies');
    }
    return new Money(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new DomainError('Cannot subtract different currencies');
    }
    return new Money(this.amount - other.amount, this.currency);
  }

  isGreaterThan(other: Money): boolean {
    return this.amount > other.amount;
  }

  percentage(percent: number): Money {
    return new Money(this.amount * (percent / 100), this.currency);
  }
}

// Enums
export enum UserStatus {
  NEW = 'new',
  ACTIVE = 'active',
  INACTIVE = 'inactive'
}

// Domain Errors
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

// Helpers
function generateId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
} 