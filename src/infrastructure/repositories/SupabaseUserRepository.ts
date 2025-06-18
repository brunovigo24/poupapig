import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { User, UserStatus, Money } from '../../domain/entities/User';
import { SupabaseClient } from '@supabase/supabase-js';
import { NotFoundError } from '../../shared/errors';
import { ILogger } from '../../application/ports/INotificationService';

export class SupabaseUserRepository implements IUserRepository {
  constructor(
    private supabase: SupabaseClient,
    private logger: ILogger
  ) {}

  async save(user: User): Promise<void> {
    try {
      const userData = this.mapToDatabase(user);
      
      const { error } = await this.supabase
        .from('usuarios_bot')
        .insert(userData);

      if (error) {
        throw new Error(`Failed to save user: ${error.message}`);
      }

      // Criar configuração padrão
      await this.createDefaultConfig(user.getId());

    } catch (error) {
      await this.logger.error('Failed to save user', {
        userId: user.getId(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      const { data, error } = await this.supabase
        .from('usuarios_bot')
        .select(`
          *,
          configuracoes_usuario (
            meta_mensal
          )
        `)
        .eq('id', id)
        .single();

      if (error || !data) {
        return null;
      }

      return this.mapToDomain(data);

    } catch (error) {
      await this.logger.error('Failed to find user by id', {
        userId: id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async findByPhone(phone: string): Promise<User | null> {
    try {
      const cleanPhone = phone.replace(/@s\.whatsapp\.net$/, '');
      
      const { data, error } = await this.supabase
        .from('usuarios_bot')
        .select(`
          *,
          configuracoes_usuario (
            meta_mensal
          )
        `)
        .eq('telefone', cleanPhone)
        .single();

      if (error || !data) {
        return null;
      }

      return this.mapToDomain(data);

    } catch (error) {
      await this.logger.error('Failed to find user by phone', {
        phone,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async update(user: User): Promise<void> {
    try {
      const userData = this.mapToDatabase(user);
      
      const { error } = await this.supabase
        .from('usuarios_bot')
        .update({
          nome: userData.nome,
          status: userData.status,
          configuracao_completa: userData.configuracao_completa
        })
        .eq('id', userData.id);

      if (error) {
        throw new Error(`Failed to update user: ${error.message}`);
      }

      // Atualizar meta se existir
      if (user.getMonthlyGoal()) {
        await this.updateMonthlyGoal(user.getId(), user.getMonthlyGoal()!.getValue());
      }

    } catch (error) {
      await this.logger.error('Failed to update user', {
        userId: user.getId(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private async createDefaultConfig(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('configuracoes_usuario')
      .insert({
        usuario_id: userId,
        meta_mensal: null,
        alertas_ativados: true,
        alerta_percentual: 80,
        moeda: 'BRL',
        fuso_horario: 'America/Sao_Paulo'
      });

    if (error) {
      throw new Error(`Failed to create user config: ${error.message}`);
    }
  }

  private async updateMonthlyGoal(userId: string, goal: number): Promise<void> {
    const { error } = await this.supabase
      .from('configuracoes_usuario')
      .update({ meta_mensal: goal })
      .eq('usuario_id', userId);

    if (error) {
      throw new Error(`Failed to update monthly goal: ${error.message}`);
    }
  }

  private mapToDomain(data: any): User {
    const monthlyGoal = data.configuracoes_usuario?.[0]?.meta_mensal
      ? Money.fromBRL(data.configuracoes_usuario[0].meta_mensal)
      : undefined;

    return User.reconstitute(
      data.id,
      data.telefone,
      data.nome,
      data.status as UserStatus,
      monthlyGoal,
      new Date(data.created_at)
    );
  }

  private mapToDatabase(user: User): any {
    return {
      id: user.getId(),
      telefone: user.getPhone(),
      nome: user.getName(),
      status: user.getStatus(),
      configuracao_completa: user.getStatus() === UserStatus.ACTIVE
    };
  }
} 