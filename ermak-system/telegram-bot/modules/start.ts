import TelegramBot from 'node-telegram-bot-api';
import { ConvexHttpClient } from 'convex/browser';
import fs from 'fs';
import path from 'path';
import { registerStep, goTo } from './flow';

export function registerStartStep() {
  registerStep({
    id: 'start',
    backStep: undefined,
    render: async ({ bot, convex, chatId }) => {
      const caption = [
        '🍽️ Добро пожаловать в Ermak Cafe!',
        '',
        'Здесь вы можете быстро и удобно заказать любимые блюда.',
        '',
        'Выберите действие на клавиатуре ниже.',
      ].join('\n');

      // Динамическое количество в корзине
      let count = 0;
      try {
        const tgId = String(chatId);
        const client = await (convex as any).query('clients:getByTelegramId', { tgId });
        count = Array.isArray(client?.cart) ? client.cart.reduce((s: number, it: any) => s + (it.quantity || 0), 0) : 0;
      } catch {}

      const keyboard = {
        reply_markup: {
          keyboard: [
            [ {text: '🍽️ МЕНЮ'}, { text: `🛒 КОРЗИНА (${count})` } ],
          ],
          resize_keyboard: true,
          one_time_keyboard: false,
          selective: true,
        },
      } as any;

      const logoCandidates = [
        // Абсолютный путь (на машине пользователя)
        '/Users/ivanzaburdaev/Desktop/ermak-erp/ermak-system/public/images/logo.jpg',
        // От корня проекта
        path.join(process.cwd(), 'public', 'images', 'logo.jpg'),
        // Относительно текущего файла (выйти на два уровня вверх)
        path.join(__dirname, '..', '..', 'public', 'images', 'logo.jpg'),
        // На один уровень вверх (на случай иной структуры)
        path.join(__dirname, '..', 'public', 'images', 'logo.jpg'),
      ];
      const logoPath = logoCandidates.find((p) => { try { return fs.existsSync(p); } catch { return false; } });
      if (!logoPath) {
        console.error('start: не найдена картинка логотипа. Пробовали:', logoCandidates);
      }
      try {
        if (logoPath) {
          await (bot as any).sendPhoto(
            chatId,
            fs.createReadStream(logoPath),
            { caption, ...keyboard } as any,
            { filename: 'logo.jpg', contentType: 'image/jpeg' } as any,
          );
        } else {
          await bot.sendMessage(chatId, caption, keyboard);
        }
      } catch {
        await bot.sendMessage(chatId, caption, keyboard);
      }
    },
    onText: async (text, ctx) => {
      if (text === '🍽️ МЕНЮ') return 'menu_intro';
      if (text.startsWith('🛒')) return 'cart_view';
      return undefined;
    },
  });
}


