// Типы для Telegram API
export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  type?: string;
  photo?: any[];
  document?: any;
  voice?: any;
  video?: any;
}

// Типы для клиентов
export interface Client {
  _id: string;
  _creationTime: number;
  tgId: string;
  name?: string;
  phone?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  address_pool: Array<{
    label?: string;
    address: string;
    entrance?: string;
    floor?: string;
    apartment?: string;
    comment?: string;
  }>;
  cart: Array<{
    menuPositionId: string;
    quantity: number;
    notes?: string;
  }>;
  role: 'user' | 'admin';
  isActive: boolean;
  hasSeenMenuIntro: boolean;
  settings?: {
    notifications: boolean;
    language: string;
    timezone?: string;
  };
  navStack?: Array<{
    step: string;
    categoryId?: string;
    menuPositionId?: string;
  }>;
  createdAt: number;
  lastActivity: number;
} 