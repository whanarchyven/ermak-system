import TelegramBot from 'node-telegram-bot-api';
import { ConvexHttpClient } from 'convex/browser';
import fs from 'fs';
import path from 'path';
import { registerStep, goTo, RenderCtx } from './flow';

type Category = { _id: string; name: string; description?: string; image?: string };
type Paged = { items: Array<any>; page: number; totalPages: number; totalItems: number };

async function buildInlineKeyboard(convex: ConvexHttpClient, categoryId: string, items: Array<any>, page: number, totalPages: number, columns: number = 1) {
  const rows: Array<Array<{ text: string; callback_data: string }>> = [];
  for (let i = 0; i < items.length; i += columns) {
    const row: Array<{ text: string; callback_data: string }> = [];
    for (let j = 0; j < columns && i + j < items.length; j++) {
      const it = items[i + j];
      const token: string = await (convex as any).mutation('restaurant:createCallbackToken', { kind: 'cat_item', categoryId, itemId: it._id, ttlSec: 3600 });
      row.push({ text: `${it.name} — ${it.price}₽`, callback_data: `cat:${token}` });
    }
    rows.push(row);
  }
  const prevTok = page > 1 ? await (convex as any).mutation('restaurant:createCallbackToken', { kind: 'cat_page', categoryId, page: page - 1, ttlSec: 3600 }) : null;
  const nextTok = page < totalPages ? await (convex as any).mutation('restaurant:createCallbackToken', { kind: 'cat_page', categoryId, page: page + 1, ttlSec: 3600 }) : null;
  rows.push([
    { text: '◀️', callback_data: prevTok ? `cat:${prevTok}` : 'cat:noop' },
    { text: `${page}/${totalPages}`, callback_data: 'cat:noop' },
    { text: '▶️', callback_data: nextTok ? `cat:${nextTok}` : 'cat:noop' },
  ]);
  return { inline_keyboard: rows };
}

export function registerCategoryStep() {
  registerStep({
    id: 'category_view',
    backStep: 'menu_home',
    render: async (ctx: RenderCtx) => {
      // Ожидаем, что перед переходом в этот шаг вы вызвали goTo('category_view', ctx) и сразу же отправили payload сообщением
      // Мы здесь будем отправлять карточку категории только по callback (см. функцию openCategory ниже)
    },
    onText: async (text, ctx) => {
      if (text.toLowerCase() === 'назад') {
        await goTo('menu_home', ctx);
        return undefined;
      }
      if (/^корзина/i.test(text)) {
        await goTo('cart_view', ctx);
        return undefined;
      }
      return undefined;
    }
  });
}

export async function openCategory(ctx: RenderCtx, categoryId: string, page: number = 1) {
  const cat: Category | null = await (ctx.convex as any).query('restaurant:getCategory', { categoryId });
  if (!cat) {
    await ctx.bot.sendMessage(ctx.chatId, 'Категория не найдена.');
    return;
  }
  const paged: Paged = await (ctx.convex as any).query('restaurant:listMenuPositionsByCategoryPaged', { categoryId, page, pageSize: 9 });
  const kb = await buildInlineKeyboard(ctx.convex, categoryId, paged.items, paged.page, paged.totalPages, 1);
  const title = `*${cat.name}*`;
  const desc = cat.description ? `\n${cat.description}` : '';
  const caption = `${title}${desc}`;
  let sent = false;
  if (cat.image) {
    try {
      const imgUrl = /^https?:\/\//i.test(cat.image)
        ? cat.image
        : `${process.env.NEXT_PUBLIC_SITE_URL || ''}${cat.image}`;
      await (ctx.bot as any).sendPhoto(ctx.chatId, imgUrl, { caption, parse_mode: 'Markdown', reply_markup: kb } as any);
      sent = true;
    } catch {}
  }
  if (!sent) {
    await ctx.bot.sendMessage(ctx.chatId, caption, { parse_mode: 'Markdown', reply_markup: kb } as any);
  }
  // Отправляем reply-клавиатуру (назад, корзина)
  try {
    const tgId = String(ctx.chatId);
    const client = await (ctx.convex as any).query('clients:getByTelegramId', { tgId });
    const count = Array.isArray(client?.cart) ? client.cart.reduce((s: number, it: any) => s + (it.quantity || 0), 0) : 0;
    const replyKeyboard = {
      reply_markup: {
        keyboard: [ [ { text: 'назад' }, { text: `Корзина (${count})` } ] ],
        resize_keyboard: true,
        one_time_keyboard: false,
        selective: true,
      },
    } as any;
    await ctx.bot.sendMessage(ctx.chatId, ' ', replyKeyboard);
  } catch {}
}

export function registerCategoryCallbacks(bot: TelegramBot, convex: ConvexHttpClient) {
  bot.on('callback_query', async (q) => {
    const data = q.data || '';
    if (!data.startsWith('cat:')) return;
    const chatId = q.message?.chat.id;
    if (!chatId) return;
    const ctx: RenderCtx = { bot, convex, chatId };
    if (data.startsWith('cat:')) {
      const token = data.slice(4);
      const resolved = await (convex as any).query('restaurant:resolveCallbackToken', { token });
      if (!resolved) return;
      if (resolved.kind === 'cat_page' && resolved.categoryId && resolved.page) {
        const paged: Paged = await (convex as any).query('restaurant:listMenuPositionsByCategoryPaged', { categoryId: resolved.categoryId, page: resolved.page, pageSize: 9 });
        const kb = await buildInlineKeyboard(convex, resolved.categoryId, paged.items, paged.page, paged.totalPages, 1);
      try {
        await bot.editMessageReplyMarkup(kb as any, { chat_id: chatId, message_id: q.message?.message_id } as any);
      } catch {
        await bot.sendMessage(chatId, 'Обновление страницы:', { reply_markup: kb } as any);
      }
      } else if (resolved.kind === 'cat_item' && resolved.itemId) {
        const { openItem } = await import('./item');
        await openItem(ctx, resolved.itemId, resolved.categoryId);
      }
    }
  });
}


