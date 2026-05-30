import TelegramBot from 'node-telegram-bot-api';
import { ConvexHttpClient } from 'convex/browser';
import fs from 'fs';
import path from 'path';
import { registerStep, goTo, RenderCtx } from './flow';
import { openCategory } from './category';

type MenuPosition = { _id: string; name: string; price: number; weight: number; structure: string; photo?: string };

export function registerItemCallbacks(bot: TelegramBot, convex: ConvexHttpClient) {
  bot.on('callback_query', async (q) => {
    const data = q.data || '';
    if (!data.startsWith('item:')) return;
    const chatId = q.message?.chat.id;
    if (!chatId) return;
    const token = data.slice(5);
    const resolved = await (convex as any).query('restaurant:resolveCallbackToken', { token });
    if (!resolved) return;
    if (resolved.kind === 'item_cat' && resolved.categoryId) {
      await openCategory({ bot, convex, chatId }, resolved.categoryId, 1);
      return;
    }
    if (resolved.kind === 'item_cart' && resolved.itemId) {
      try {
        const tgId = q.from?.id?.toString();
        if (!tgId) return;
        const client = await (convex as any).query('clients:getByTelegramId', { tgId });
        if (!client) {
          await bot.sendMessage(chatId, 'Не удалось определить клиента.');
          return;
        }
        await (convex as any).mutation('clients:addToCart', { clientId: client._id, menuPositionId: resolved.itemId, quantity: 1 });
        const updated = await (convex as any).query('clients:getByTelegramId', { tgId });
        const count = Array.isArray(updated?.cart) ? updated.cart.reduce((s: number, it: any) => s + (it.quantity || 0), 0) : 0;
        await bot.sendMessage(chatId, `Добавлено в корзину. Сейчас в корзине: ${count}`);
      } catch {
        await bot.sendMessage(chatId, 'Не удалось добавить в корзину.');
      }
      return;
    }
  });
}

const itemCtxByChat: Map<number, { itemId: string; categoryId?: string }> = new Map();

export function registerItemStep() {
  registerStep({
    id: 'item_view',
    backStep: 'menu_home',
    render: async () => {},
    onText: async (text, ctx) => {
      const st = itemCtxByChat.get(ctx.chatId);
      if (!st) return undefined;
      if (text.toLowerCase() === 'назад') {
        // Возвращаемся в категорию, из которой пришли, с восстановлением её клавиатуры
        if (st.categoryId) {
          await goTo('category_view', ctx);
          await openCategory(ctx, st.categoryId, 1);
        } else {
          await goTo('menu_home', ctx);
        }
        return undefined;
      }
      if (text === '🛒 В корзину') {
        try {
          const tgId = String(ctx.chatId);
          const client = await (ctx.convex as any).query('clients:getByTelegramId', { tgId });
          if (!client) {
            await ctx.bot.sendMessage(ctx.chatId, 'Не удалось определить клиента.');
            return undefined;
          }
          await (ctx.convex as any).mutation('clients:addToCart', { clientId: client._id, menuPositionId: st.itemId, quantity: 1 });
          const updated = await (ctx.convex as any).query('clients:getByTelegramId', { tgId });
          const count = Array.isArray(updated?.cart) ? updated.cart.reduce((s: number, it: any) => s + (it.quantity || 0), 0) : 0;
          await ctx.bot.sendMessage(ctx.chatId, `Добавлено в корзину. Сейчас в корзине: ${count}`);
        } catch {
          await ctx.bot.sendMessage(ctx.chatId, 'Не удалось добавить в корзину.');
        }
        return undefined;
      }
      return undefined;
    },
  });
}

export async function openItem(ctx: RenderCtx, itemId: string, categoryId?: string) {
  const item: MenuPosition | null = await (ctx.convex as any).query('restaurant:getMenuPosition', { menuPositionId: itemId });
  if (!item) {
    await ctx.bot.sendMessage(ctx.chatId, 'Позиция не найдена.');
    return;
  }
  itemCtxByChat.set(ctx.chatId, { itemId, categoryId });
  // Установим текущий шаг, чтобы reply-кнопки обрабатывались в onText шага item_view
  await goTo('item_view', ctx);
  const catTok: string = categoryId ? await (ctx.convex as any).mutation('restaurant:createCallbackToken', { kind: 'item_cat', categoryId }) : '';
  const cartTok: string = await (ctx.convex as any).mutation('restaurant:createCallbackToken', { kind: 'item_cart', itemId });

  const replyKeyboard = {
    reply_markup: {
      keyboard: [ [ { text: 'назад' }, { text: '🛒 В корзину' } ] ],
      resize_keyboard: true,
      one_time_keyboard: false,
      selective: true,
    },
  } as any;

  const caption = `*${item.name}*\n${item.structure}\n\n${item.weight} г — ${item.price}₽`;
  let sent = false;
  if (item.photo) {
    try {
      const imgUrl = /^https?:\/\//i.test(item.photo) ? item.photo : `${process.env.NEXT_PUBLIC_SITE_URL || ''}${item.photo}`;
      await (ctx.bot as any).sendPhoto(ctx.chatId, imgUrl, { caption, parse_mode: 'Markdown', ...replyKeyboard } as any);
      sent = true;
    } catch {}
  }
  if (!sent) {
    await ctx.bot.sendMessage(ctx.chatId, caption, { parse_mode: 'Markdown', ...replyKeyboard } as any);
  }
}


