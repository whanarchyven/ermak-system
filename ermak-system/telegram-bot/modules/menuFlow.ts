import TelegramBot from 'node-telegram-bot-api';
import { ConvexHttpClient } from 'convex/browser';
import fs from 'fs';
import path from 'path';
import { registerStep, goTo, RenderCtx } from './flow';
import { openCategory } from './category';

type Category = { _id: string; name: string };
type MenuPosition = { _id: string; name: string; price: number; weight: number };

function buildReplyKeyboard(categories: Array<Category>, cartCount: number) {
  const bottomRow = [ { text: '⬅️ Назад' }, { text: `🛒 КОРЗИНА (${cartCount})` } ];
  return {
    reply_markup: {
      keyboard: [ ...(categories || []).map((c) => [{ text: c.name }]), bottomRow ],
      resize_keyboard: true,
      one_time_keyboard: false,
      selective: true,
    },
  } as any;
}

export function registerMenuSteps(getCartCount: () => number) {
  // menu_intro
  registerStep({
    id: 'menu_intro',
    backStep: 'start',
    render: async (ctx: RenderCtx) => {
      const intro = [
        '✨ Рады представить вам меню Ermak Cafe!',
        'Свежие ингредиенты, проверенные рецепты и быстрая доставка.',
        'Выберите категорию ниже, добавляйте позиции в корзину и оформляйте заказ в пару нажатий.',
        'Если сомневаетесь — начните с наших хитов!'
      ].join('\n');

      const candidates = [
        path.join(process.cwd(), 'public', 'menu'),
        path.join(__dirname, '..', '..', 'public', 'menu'),
        path.join(__dirname, '..', 'public', 'menu'),
      ];
      const menuDir = candidates.find((p) => { try { return fs.existsSync(p); } catch { return false; } });
      const files = menuDir ? fs.readdirSync(menuDir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort() : [];
      if (files.length > 0) {
        const media = files.slice(0, 10).map((file, idx) => ({
          type: 'photo',
          media: fs.createReadStream(path.join(menuDir as string, file)),
          caption: idx === 0 ? intro : undefined,
        }));
        try {
          await (ctx.bot as any).sendMediaGroup(ctx.chatId, media);
        } catch {
          for (let i = 0; i < media.length; i++) {
            const m = media[i];
            try { await (ctx.bot as any).sendPhoto(ctx.chatId, (m as any).media, { caption: m.caption } as any); } catch {}
          }
        }
      } else {
        await ctx.bot.sendMessage(ctx.chatId, intro);
      }
      await goTo('menu_home', ctx);
    },
  });

  // menu_home
  registerStep({
    id: 'menu_home',
    backStep: 'start',
    render: async (ctx: RenderCtx) => {
      const categories: Array<Category> = await (ctx.convex as any).query('restaurant:listCategories', {});
      // динамический пересчёт корзины
      let count = 0;
      try {
        const tgId = String(ctx.chatId);
        const client = await (ctx.convex as any).query('clients:getByTelegramId', { tgId });
        count = Array.isArray(client?.cart) ? client.cart.reduce((s: number, it: any) => s + (it.quantity || 0), 0) : 0;
      } catch {}
      const kb = buildReplyKeyboard(categories || [], count);
      await ctx.bot.sendMessage(ctx.chatId, 'Выберите категорию:', kb);
    },
    onText: async (text: string, ctx: RenderCtx) => {
      const categories: Array<Category> = await (ctx.convex as any).query('restaurant:listCategories', {});
      const found = (categories || []).find((c) => c.name === text);
      if (found) {
        await goTo('category_view', ctx);
        await openCategory(ctx, found._id, 1);
        return undefined;
      }
      if (text.startsWith('🛒 КОРЗИНА')) {
        await goTo('cart_view', ctx);
        return undefined;
      }
      await ctx.bot.sendMessage(ctx.chatId, 'Пожалуйста, используйте кнопки ниже.');
      return undefined;
    },
  });

  // menu_category (пока только отображение списка, возврат ведёт в menu_home)
  registerStep({
    id: 'menu_category',
    backStep: 'menu_home',
    render: async (_ctx: RenderCtx) => {
      // контент отрисовывается в onText menu_home выше
    },
  });
}


