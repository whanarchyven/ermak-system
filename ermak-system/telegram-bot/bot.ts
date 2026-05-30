import TelegramBot from 'node-telegram-bot-api';
import { ConvexHttpClient } from 'convex/browser';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { TelegramMessage, Client } from './types';
import { registerStartStep } from './modules/start';
import { registerMenuSteps } from './modules/menuFlow';
import { registerCategoryStep, registerCategoryCallbacks } from './modules/category';
import { registerItemCallbacks, registerItemStep } from './modules/item';
import { goTo, handleText } from './modules/flow';
import { registerCartSteps, registerCartCallbacks } from './modules/cart';

// Загружаем переменные окружения
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Проверяем переменные окружения
if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  console.error('❌ NEXT_PUBLIC_CONVEX_URL не установлен!');
  console.error('Проверьте файл .env.local в корне проекта');
  process.exit(1);
}

if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN не установлен!');
  console.error('Добавьте токен бота в .env.local');
  process.exit(1);
}

console.log('✅ Переменные окружения загружены:');
console.log('Convex URL:', process.env.NEXT_PUBLIC_CONVEX_URL);
console.log('Bot Token:', process.env.TELEGRAM_BOT_TOKEN ? '***' + process.env.TELEGRAM_BOT_TOKEN.slice(-4) : 'НЕ УСТАНОВЛЕН');

// Инициализация Convex клиента
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

// Инициализация бота
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
  polling: true
});

// Типы для обработчиков команд
type CommandHandler = (msg: TelegramMessage, client: Client) => Promise<void>;

// Обработчики команд
const commandHandlers: Record<string, CommandHandler> = {
  '/start': handleStart,
};

// Регистрируем шаги
registerStartStep();
registerMenuSteps(() => 0);
registerCategoryStep();
registerCategoryCallbacks(bot, convex);
registerItemStep();
registerItemCallbacks(bot, convex);
registerCartSteps();
registerCartCallbacks(bot, convex);

// Обработка входящих сообщений
bot.on('message', async (msg: TelegramMessage) => {
  try {
    const chatId = msg.chat.id;
    const text = msg.text;
    const from = msg.from;

    if (!from) {
      console.log('Сообщение без отправителя');
      return;
    }

    console.log(`Получено сообщение от ${from.username || from.first_name}: ${text}`);

    // Сохраняем или получаем клиента
    let client = await (convex as any).query('clients:getByTelegramId', { 
      tgId: from.id.toString() 
    });

    if (!client) {
      console.log('Создаем нового клиента',chatId,"tgId",from.id.toString(),"name",from.first_name || from.username);
      const clientId = await (convex as any).mutation('clients:create', {
        tgId: from.id.toString(),
        name: from.first_name || from.username,
        username: from.username,
        firstName: from.first_name,
        lastName: from.last_name,
        chatId: String(chatId),
      });
      client = await (convex as any).query('clients:getByTelegramId', { 
        tgId: from.id.toString() 
      });
    }

    if (!client) {
      throw new Error('Не удалось создать или получить клиента');
    }

    // Обновляем активность клиента
    await (convex as any).mutation('clients:updateActivity', { clientId: client._id });
    // Сохраняем chatId при необходимости
    if (!client.chatId || client.chatId !== String(chatId)) {
      await (convex as any).mutation('clients:updateSettings', { clientId: client._id, settings: { ...(client.settings || { notifications: true, language: 'ru' }), chatId: String(chatId) } }).catch(() => {});
    }

    // (Временный минимализм) Не сохраняем все входящие сообщения, пока не подключим модуль сообщений

    // Обрабатываем команды
    if (text && text.startsWith('/')) {
      const command = text.split(' ')[0];
      const handler = commandHandlers[command];
      
      if (handler) {
        await handler(msg, client);
      } else {
        await bot.sendMessage(chatId, 'Команда недоступна. Воспользуйтесь кнопками ниже.');
      }
    } else if (text) {
      await handleText({ bot, convex, chatId }, text);
    }

  } catch (error) {
    console.error('Ошибка обработки сообщения:', error);
    
    // (Временный минимализм) Логи в Convex выключены на время модульной сборки
  }
});

// Обработчик команды /start
async function handleStart(msg: TelegramMessage, client: Client): Promise<void> {
  const chatId = msg.chat.id;
  await goTo('start', { bot, convex, chatId });
}

// (Временная очистка) Прочие командные обработчики удалены до подключения соответствующих модулей

// Обработка ошибок
bot.on('error', (error: Error) => {
  console.error('Ошибка бота:', error);
});

bot.on('polling_error', (error: Error) => {
  console.error('Ошибка polling:', error);
});

// Запуск бота
console.log('🤖 Telegram бот запущен...');

// Экспорт для использования в других модулях
export { bot, convex }; 