export interface WebhookMessageDTO {
  phone: string;
  message: string;
  userName: string;
  instance: string;
  fromMe: boolean;
}

export interface ProcessMessageDTO {
  phone: string;
  message: string;
  userName: string;
  instance: string;
}

export interface MessageResponseDTO {
  messageId: string;
  actions: ActionExecutedDTO[];
  responseText: string;
}

export interface ActionExecutedDTO {
  action: string;
  success: boolean;
  result?: any;
  error?: string;
} 