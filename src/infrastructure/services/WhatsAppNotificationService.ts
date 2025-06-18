import { INotificationService, MessageOption } from '../../application/ports/INotificationService';
import * as evolutionApiService from './EvolutionApiService';
import { IUserRepository } from '../../domain/repositories/IUserRepository';

export class WhatsAppNotificationService implements INotificationService {
  private userRepository: IUserRepository | null = null;

  setUserRepository(repository: IUserRepository): void {
    this.userRepository = repository;
  }

  async sendMessage(userId: string, message: string): Promise<void> {
    try {
      // Se temos o repositório, busca o telefone do usuário
      if (this.userRepository) {
        const user = await this.userRepository.findById(userId);
        if (user) {
          await evolutionApiService.enviarMensagem(user.getPhone(), message);
          return;
        }
      }

      // Fallback: assume que userId é o telefone
      await evolutionApiService.enviarMensagem(userId, message);
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      throw error;
    }
  }

  async sendAlert(userId: string, alert: string): Promise<void> {
    // Alertas são enviados como mensagens normais mas podem ter tratamento especial no futuro
    await this.sendMessage(userId, alert);
  }

  async sendList(userId: string, title: string, options: MessageOption[]): Promise<void> {
    try {
      // Converter MessageOption[] para o formato do Evolution API
      const menu = {
        titulo: title,
        descricao: 'Selecione uma opção:',
        opcoes: options.map(opt => ({
          titulo: opt.title,
          id: opt.id
        }))
      };

      // Se temos o repositório, busca o telefone do usuário
      let phone = userId;
      if (this.userRepository) {
        const user = await this.userRepository.findById(userId);
        if (user) {
          phone = user.getPhone();
        }
      }

      await evolutionApiService.enviarLista(phone, menu);
    } catch (error) {
      console.error('Error sending WhatsApp list:', error);
      throw error;
    }
  }
} 