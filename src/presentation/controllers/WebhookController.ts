import { Request, Response } from 'express';
import { WebhookMessageDTO } from '../dtos/WebhookMessageDTO';
import { ProcessMessageUseCase } from '../../application/use-cases/ProcessMessageUseCase';
import { ILogger } from '../../application/ports/INotificationService';
import { ValidationError, BusinessError } from '../../shared/errors';

export class WebhookController {
  constructor(
    private processMessageUseCase: ProcessMessageUseCase,
    private logger: ILogger
  ) {}

  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      // Valida e extrai dados do webhook
      const messageDTO = this.extractMessageData(req.body);
      
      // Filtro anti-loop
      if (messageDTO.fromMe) {
        res.json({ status: 'ignored', reason: 'self-message' });
        return;
      }

      // Log da mensagem recebida
      await this.logger.info('Webhook received', {
        phone: messageDTO.phone,
        message: messageDTO.message,
        instance: messageDTO.instance
      });

      // Processa mensagem através do use case
      const result = await this.processMessageUseCase.execute({
        phone: messageDTO.phone,
        message: messageDTO.message,
        userName: messageDTO.userName,
        instance: messageDTO.instance
      });

      // Responde ao webhook
      res.json({
        status: 'processed',
        messageId: result.messageId,
        actions: result.actions.length
      });

    } catch (error) {
      await this.handleError(error, res);
    }
  }

  private extractMessageData(body: any): WebhookMessageDTO {
    try {
      const phone = body?.data?.key?.remoteJid;
      const message = body?.data?.message?.conversation || 
                      body?.data?.message?.listResponseMessage?.singleSelectReply?.selectedRowId || 
                      '';
      const userName = body?.data?.pushName || 'User';
      const instance = body?.instance || '';
      const fromMe = body?.data?.key?.fromMe || false;

      if (!phone) {
        throw new ValidationError('Phone number not provided');
      }

      return {
        phone: this.normalizePhone(phone),
        message,
        userName,
        instance,
        fromMe
      };

    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError('Invalid webhook payload');
    }
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/@s\.whatsapp\.net$/, '');
  }

  private async handleError(error: unknown, res: Response): Promise<void> {
    if (error instanceof ValidationError) {
      await this.logger.warn('Validation error in webhook', { error: error.message });
      res.status(400).json({
        status: 'error',
        error: error.message,
        code: 'VALIDATION_ERROR'
      });
      return;
    }

    if (error instanceof BusinessError) {
      await this.logger.warn('Business error in webhook', { error: error.message });
      res.status(422).json({
        status: 'error',
        error: error.message,
        code: 'BUSINESS_ERROR'
      });
      return;
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await this.logger.error('Unexpected error in webhook', { error: errorMessage });
    
    res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
} 