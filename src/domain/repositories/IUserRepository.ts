import { User } from '../entities/User';

export interface IUserRepository {
  save(user: User): Promise<void>;
  findById(id: string): Promise<User | null>;
  findByPhone(phone: string): Promise<User | null>;
  update(user: User): Promise<void>;
}

export interface ITransactionRepository {
  save(transaction: Transaction): Promise<void>;
  findById(id: string): Promise<Transaction | null>;
  findByUserId(userId: string, filters?: TransactionFilters): Promise<Transaction[]>;
  findByDateRange(userId: string, startDate: Date, endDate: Date): Promise<Transaction[]>;
  getMonthlySum(userId: string, type?: TransactionType): Promise<Money>;
}

export interface TransactionFilters {
  type?: TransactionType;
  categoryId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface ICategoryRepository {
  findAll(userId?: string): Promise<Category[]>;
  findById(id: string): Promise<Category | null>;
  findByType(type: TransactionType, userId?: string): Promise<Category[]>;
}

// Imports necessários
import { Transaction, TransactionType, Category } from '../entities/Transaction';
import { Money } from '../entities/User'; 