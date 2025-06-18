import { ICategoryRepository } from '../../domain/repositories/IUserRepository';
import { Category, TransactionType } from '../../domain/entities/Transaction';
import { SupabaseClient } from '@supabase/supabase-js';
import { ILogger } from '../../application/ports/INotificationService';

export class SupabaseCategoryRepository implements ICategoryRepository {
  constructor(
    private supabase: SupabaseClient,
    private logger: ILogger
  ) {}

  async findAll(userId?: string): Promise<Category[]> {
    try {
      let query = this.supabase
        .from('categorias')
        .select('*')
        .eq('ativa', true);

      // Se userId fornecido, busca categorias do usuário + padrões
      if (userId) {
        query = query.or(`usuario_id.eq.${userId},usuario_id.is.null`);
      } else {
        // Senão, busca apenas categorias padrão
        query = query.is('usuario_id', null);
      }

      const { data, error } = await query.order('nome');

      if (error) {
        throw new Error(`Failed to find categories: ${error.message}`);
      }

      return (data || []).map(c => this.mapToDomain(c));

    } catch (error) {
      await this.logger.error('Failed to find all categories', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async findById(id: string): Promise<Category | null> {
    try {
      const { data, error } = await this.supabase
        .from('categorias')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        return null;
      }

      return this.mapToDomain(data);

    } catch (error) {
      await this.logger.error('Failed to find category by id', {
        categoryId: id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async findByType(type: TransactionType, userId?: string): Promise<Category[]> {
    try {
      let query = this.supabase
        .from('categorias')
        .select('*')
        .eq('ativa', true)
        .eq('tipo', type === TransactionType.EXPENSE ? 'gasto' : 'receita');

      // Se userId fornecido, busca categorias do usuário + padrões
      if (userId) {
        query = query.or(`usuario_id.eq.${userId},usuario_id.is.null`);
      } else {
        // Senão, busca apenas categorias padrão
        query = query.is('usuario_id', null);
      }

      const { data, error } = await query.order('nome');

      if (error) {
        throw new Error(`Failed to find categories by type: ${error.message}`);
      }

      return (data || []).map(c => this.mapToDomain(c));

    } catch (error) {
      await this.logger.error('Failed to find categories by type', {
        type,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private mapToDomain(data: any): Category {
    return new Category(
      data.id,
      data.nome,
      data.icone,
      data.cor,
      data.tipo === 'gasto' ? TransactionType.EXPENSE : TransactionType.INCOME,
      data.usuario_id
    );
  }
} 