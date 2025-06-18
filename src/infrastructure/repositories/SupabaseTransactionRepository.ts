import { ITransactionRepository, TransactionFilters } from '../../domain/repositories/IUserRepository';
import { Transaction, TransactionType, Category } from '../../domain/entities/Transaction';
import { Money } from '../../domain/entities/User';
import { SupabaseClient } from '@supabase/supabase-js';
import { ILogger } from '../../application/ports/INotificationService';

export class SupabaseTransactionRepository implements ITransactionRepository {
  constructor(
    private supabase: SupabaseClient,
    private logger: ILogger
  ) {}

  async save(transaction: Transaction): Promise<void> {
    try {
      const data = this.mapToDatabase(transaction);
      
      const { error } = await this.supabase
        .from('transacoes')
        .insert(data);

      if (error) {
        throw new Error(`Failed to save transaction: ${error.message}`);
      }

    } catch (error) {
      await this.logger.error('Failed to save transaction', {
        transactionId: transaction.getId(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async findById(id: string): Promise<Transaction | null> {
    try {
      const { data, error } = await this.supabase
        .from('transacoes')
        .select(`
          *,
          categorias (*)
        `)
        .eq('id', id)
        .single();

      if (error || !data) {
        return null;
      }

      return this.mapToDomain(data);

    } catch (error) {
      await this.logger.error('Failed to find transaction by id', {
        transactionId: id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async findByUserId(userId: string, filters?: TransactionFilters): Promise<Transaction[]> {
    try {
      let query = this.supabase
        .from('transacoes')
        .select(`
          *,
          categorias (*)
        `)
        .eq('usuario_id', userId);

      // Apply filters
      if (filters?.type) {
        query = query.eq('tipo', filters.type);
      }
      if (filters?.categoryId) {
        query = query.eq('categoria_id', filters.categoryId);
      }
      if (filters?.startDate) {
        query = query.gte('data', filters.startDate.toISOString());
      }
      if (filters?.endDate) {
        query = query.lte('data', filters.endDate.toISOString());
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
      }

      const { data, error } = await query.order('data', { ascending: false });

      if (error) {
        throw new Error(`Failed to find transactions: ${error.message}`);
      }

      return (data || []).map(t => this.mapToDomain(t));

    } catch (error) {
      await this.logger.error('Failed to find transactions by user', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async findByDateRange(userId: string, startDate: Date, endDate: Date): Promise<Transaction[]> {
    return this.findByUserId(userId, { startDate, endDate });
  }

  async getMonthlySum(userId: string, type?: TransactionType): Promise<Money> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      let query = this.supabase
        .from('transacoes')
        .select('valor')
        .eq('usuario_id', userId)
        .gte('data', startOfMonth.toISOString());

      if (type) {
        query = query.eq('tipo', type);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to get monthly sum: ${error.message}`);
      }

      const sum = (data || []).reduce((acc, t) => acc + Number(t.valor), 0);
      return Money.fromBRL(sum);

    } catch (error) {
      await this.logger.error('Failed to get monthly sum', {
        userId,
        type,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private mapToDomain(data: any): Transaction {
    const category = new Category(
      data.categorias.id,
      data.categorias.nome,
      data.categorias.icone,
      data.categorias.cor,
      data.categorias.tipo === 'gasto' ? TransactionType.EXPENSE : TransactionType.INCOME,
      data.categorias.usuario_id
    );

    return Transaction.create(
      data.usuario_id,
      data.descricao,
      Number(data.valor),
      data.tipo === 'gasto' ? TransactionType.EXPENSE : TransactionType.INCOME,
      category,
      data.processada_por_ia || false
    );
  }

  private mapToDatabase(transaction: Transaction): any {
    return {
      id: transaction.getId(),
      usuario_id: transaction.getUserId(),
      descricao: transaction.getDescription(),
      valor: transaction.getAmount().getValue(),
      categoria_id: transaction.getCategory().getId(),
      tipo: transaction.getType() === TransactionType.EXPENSE ? 'gasto' : 'receita',
      data: transaction.getDate(),
      hash_identificador: transaction.getId(),
      processada_por_ia: transaction.wasProcessedByAI()
    };
  }
} 