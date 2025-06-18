import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { DomainError } from '../../domain/entities/User';
import { ILogger } from '../ports/INotificationService';

export interface SetMonthlyGoalDTO {
  userId: string;
  goal: number;
}

export interface SetMonthlyGoalResult {
  success: boolean;
  previousGoal?: number;
  newGoal: number;
}

export class SetMonthlyGoalUseCase {
  constructor(
    private userRepository: IUserRepository,
    private logger: ILogger
  ) {}

  async execute(dto: SetMonthlyGoalDTO): Promise<SetMonthlyGoalResult> {
    try {
      // Validar entrada
      if (dto.goal <= 0) {
        throw new DomainError('Goal must be a positive value');
      }

      // Buscar usuário
      const user = await this.userRepository.findById(dto.userId);
      if (!user) {
        throw new DomainError('User not found');
      }

      // Guardar meta anterior (se existir)
      const previousGoal = user.getMonthlyGoal()?.getValue();

      // Definir nova meta
      user.setMonthlyGoal(dto.goal);

      // Salvar alterações
      await this.userRepository.update(user);

      // Log da operação
      await this.logger.info('Monthly goal updated', {
        userId: user.getId(),
        previousGoal,
        newGoal: dto.goal
      });

      return {
        success: true,
        previousGoal,
        newGoal: dto.goal
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logger.error('Failed to set monthly goal', {
        error: errorMessage,
        dto
      });
      throw error;
    }
  }
} 