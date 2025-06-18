import { Money, DomainError } from './User';

export class Transaction {
  private constructor(
    private readonly id: string,
    private readonly userId: string,
    private readonly description: string,
    private readonly amount: Money,
    private readonly type: TransactionType,
    private readonly category: Category,
    private readonly date: Date,
    private readonly processedByAI: boolean = false
  ) {
    this.validate();
  }

  static create(
    userId: string,
    description: string,
    amount: number,
    type: TransactionType,
    category: Category,
    processedByAI: boolean = false
  ): Transaction {
    return new Transaction(
      generateTransactionId(),
      userId,
      description,
      Money.fromBRL(amount),
      type,
      category,
      new Date(),
      processedByAI
    );
  }

  private validate(): void {
    if (!this.description || this.description.trim().length < 3) {
      throw new DomainError('Transaction description too short');
    }
    if (!this.userId) {
      throw new DomainError('User ID is required');
    }
    if (!this.category.matchesType(this.type)) {
      throw new DomainError('Category type does not match transaction type');
    }
  }

  isExpense(): boolean {
    return this.type === TransactionType.EXPENSE;
  }

  isIncome(): boolean {
    return this.type === TransactionType.INCOME;
  }

  // Getters
  getId(): string { return this.id; }
  getUserId(): string { return this.userId; }
  getDescription(): string { return this.description; }
  getAmount(): Money { return this.amount; }
  getType(): TransactionType { return this.type; }
  getCategory(): Category { return this.category; }
  getDate(): Date { return this.date; }
  wasProcessedByAI(): boolean { return this.processedByAI; }
}

export class Category {
  constructor(
    private readonly id: string,
    private readonly name: string,
    private readonly icon: string,
    private readonly color: string,
    private readonly type: TransactionType,
    private readonly userId?: string // null for default categories
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.name || this.name.length < 2) {
      throw new DomainError('Category name too short');
    }
    if (!this.color.match(/^#[0-9A-F]{6}$/i)) {
      throw new DomainError('Invalid color format');
    }
  }

  matchesType(type: TransactionType): boolean {
    return this.type === type;
  }

  isDefault(): boolean {
    return this.userId === undefined;
  }

  // Getters
  getId(): string { return this.id; }
  getName(): string { return this.name; }
  getIcon(): string { return this.icon; }
  getColor(): string { return this.color; }
  getType(): TransactionType { return this.type; }
}

export enum TransactionType {
  EXPENSE = 'expense',
  INCOME = 'income'
}

function generateTransactionId(): string {
  return `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
} 