import TelegramBot from 'node-telegram-bot-api';
import { ConvexHttpClient } from 'convex/browser';
import { registerStep, goTo, RenderCtx } from './flow';

type CartItem = { menuPositionId: string; name: string; quantity: number; unitPrice: number; lineTotal: number };

function kb(rows: Array<Array<{ text: string }>>) {
  return { reply_markup: { keyboard: rows, resize_keyboard: true, one_time_keyboard: false, selective: true } } as any;
}

function buttonsFromList(values: string[], perRow: number = 2) {
  const rows: Array<Array<{ text: string }>> = [];
  for (let i = 0; i < values.length; i += perRow) {
    rows.push(values.slice(i, i + perRow).map((t) => ({ text: t })));
  }
  return rows;
}

async function renderCart(ctx: RenderCtx) {
  const tgId = String(ctx.chatId);
  const client = await (ctx.convex as any).query('clients:getByTelegramId', { tgId });
  if (!client) {
    await ctx.bot.sendMessage(ctx.chatId, 'Не удалось определить клиента.');
    return;
  }
  const details = await (ctx.convex as any).query('clients:getCartDetails', { clientId: client._id });
  const items: Array<CartItem> = details.items;
  if (!items.length) {
    await ctx.bot.sendMessage(ctx.chatId, 'Ваша корзина пуста. Добавьте позиции из меню.');
    await goTo('menu_home', ctx);
    return;
  }
  const lines = items.map((it, idx) => `${idx + 1}. ${it.name} ${it.quantity} шт. = ${it.lineTotal} ₽`).join('\n');
  const text = [
    'Давай проверим твой заказ:',
    lines,
    '',
    `Итого: ${details.subtotal} ₽`,
    'Всё верно?',
  ].join('\n');
  const rows = [ [ { text: '✅ Да, оформить заказ' }, { text: '✏️ Редактировать заказ' } ], [ { text: '⬅️ Назад' } ] ];
  await ctx.bot.sendMessage(ctx.chatId, text, kb(rows));
}

// Храним сопоставление индексов к позициям на шаге редактирования
const editMapByChat: Map<number, Array<{ index: number; menuPositionId: string; label: string }>> = new Map();

export function registerCartCallbacks(_bot: TelegramBot, _convex: ConvexHttpClient) {
  // В текущей версии редактирование выполняется через reply-клавиатуру, callback-и не используются
}

export function registerCartSteps() {
  // 1. Просмотр корзины
  registerStep({
    id: 'cart_view',
    backStep: 'menu_home',
    render: renderCart,
    onText: async (text, ctx) => {
      if (text === '✅ Да, оформить заказ') {
        const tgId = String(ctx.chatId);
        const client = await (ctx.convex as any).query('clients:getByTelegramId', { tgId });
        if (!client) return undefined;
        await (ctx.convex as any).mutation('orders:startCheckout', { clientId: client._id });
        await goTo('cart_name', ctx);
        return undefined;
      }
      if (text === '✏️ Редактировать заказ') {
        const tgId = String(ctx.chatId);
        const client = await (ctx.convex as any).query('clients:getByTelegramId', { tgId });
        if (!client) return undefined;
        const details = await (ctx.convex as any).query('clients:getCartDetails', { clientId: client._id });
        if (!details.items.length) {
          await ctx.bot.sendMessage(ctx.chatId, 'Корзина пуста.');
          return undefined;
        }
        const map: Array<{ index: number; menuPositionId: string; label: string }> = details.items.map((it: any, i: number) => ({ index: i + 1, menuPositionId: it.menuPositionId, label: `${i + 1}. ${it.name} (${it.quantity})` }));
        editMapByChat.set(ctx.chatId, map);
        const rows = buttonsFromList(map.map((m) => m.label), 2);
        rows.push([ { text: 'Подтвердить' } ]);
        rows.push([ { text: '⬅️ Назад' } ]);
        await ctx.bot.sendMessage(ctx.chatId, 'Что вы хотите убрать из заказа?', kb(rows));
        await goTo('cart_edit', ctx);
        return undefined;
      }
      return undefined;
    },
  });

  // 2. Имя
  registerStep({
    id: 'cart_name',
    backStep: 'cart_view',
    render: async (ctx) => {
      const tgId = String(ctx.chatId);
      const client = await (ctx.convex as any).query('clients:getByTelegramId', { tgId });
      const pool: string[] = (client?.name_pool as string[] | undefined) ?? [];
      const rows = buttonsFromList(pool, 2);
      rows.push([ { text: '⬅️ Назад' } ]);
      await ctx.bot.sendMessage(ctx.chatId, 'Как вас зовут?', kb(rows));
    },
    onText: async (text, ctx) => {
      if (text === '⬅️ Назад') return undefined;
      const name = text.trim();
      const tgId = String(ctx.chatId);
      const client = await (ctx.convex as any).query('clients:getByTelegramId', { tgId });
      if (!client) return undefined;
      await (ctx.convex as any).mutation('orders:setName', { clientId: client._id, name });
      await goTo('cart_phone', ctx);
      return undefined;
    },
  });

  // 3. Телефон
  registerStep({
    id: 'cart_phone',
    backStep: 'cart_name',
    render: async (ctx) => {
      const tgId = String(ctx.chatId);
      const client = await (ctx.convex as any).query('clients:getByTelegramId', { tgId });
      const pool: string[] = (client?.phone_pool as string[] | undefined) ?? [];
      const rows = buttonsFromList(pool, 2);
      rows.push([ { text: '⬅️ Назад' } ]);
      await ctx.bot.sendMessage(ctx.chatId, 'Укажите ваш номер телефона', kb(rows));
    },
    onText: async (text, ctx) => {
      if (text === '⬅️ Назад') return undefined;
      const phone = text.trim();
      const tgId = String(ctx.chatId);
      const client = await (ctx.convex as any).query('clients:getByTelegramId', { tgId });
      if (!client) return undefined;
      await (ctx.convex as any).mutation('orders:setPhone', { clientId: client._id, phone });
      await goTo('cart_type', ctx);
      return undefined;
    },
  });

  // 4. Тип заказа
  registerStep({
    id: 'cart_type',
    backStep: 'cart_phone',
    render: async (ctx) => {
      const rows = [ [ { text: '🚶‍♂️ Самовынос' } ], [ { text: '🏠 Доставка' } ], [ { text: '🍽️ В ресторане' } ], [ { text: '⬅️ Назад' } ] ];
      await ctx.bot.sendMessage(ctx.chatId, 'Укажите тип заказа', kb(rows));
    },
    onText: async (text, ctx) => {
      const tgId = String(ctx.chatId);
      const client = await (ctx.convex as any).query('clients:getByTelegramId', { tgId });
      if (!client) return undefined;
      if (text.startsWith('🚶')) {
        await (ctx.convex as any).mutation('orders:setOrderType', { clientId: client._id, type: 'self-service' });
        await goTo('cart_payment', ctx);
        return undefined;
      }
      if (text.startsWith('🏠')) {
        await (ctx.convex as any).mutation('orders:setOrderType', { clientId: client._id, type: 'delivery' });
        await goTo('cart_address', ctx);
        return undefined;
      }
      if (text.startsWith('🍽️')) {
        await (ctx.convex as any).mutation('orders:setOrderType', { clientId: client._id, type: 'restaurant' });
        await goTo('cart_payment', ctx);
        return undefined;
      }
      return undefined;
    },
  });

  // 4.1 Адрес доставки
  registerStep({
    id: 'cart_address',
    backStep: 'cart_type',
    render: async (ctx) => {
      const tgId = String(ctx.chatId);
      const client = await (ctx.convex as any).query('clients:getByTelegramId', { tgId });
      const pool: string[] = ((client?.address_pool as Array<any> | undefined) ?? []).map((a: any) => a.address);
      const rows = buttonsFromList(pool, 1);
      rows.push([ { text: '⬅️ Назад' } ]);
      await ctx.bot.sendMessage(ctx.chatId, 'Укажите адрес доставки', kb(rows));
    },
    onText: async (text, ctx) => {
      if (text === '⬅️ Назад') return undefined;
      const address = text.trim();
      const tgId = String(ctx.chatId);
      const client = await (ctx.convex as any).query('clients:getByTelegramId', { tgId });
      if (!client) return undefined;
      await (ctx.convex as any).mutation('orders:setAddress', { clientId: client._id, address });
      await goTo('cart_payment', ctx);
      return undefined;
    },
  });

  // 5. Оплата
  registerStep({
    id: 'cart_payment',
    backStep: 'cart_type',
    render: async (ctx) => {
      const rows = [ [ { text: '💵 Наличные' } ], [ { text: '💳 Безналичная оплата' } ], [ { text: '🌐 Онлайн' } ], [ { text: '⬅️ Назад' } ] ];
      await ctx.bot.sendMessage(ctx.chatId, 'Выберите тип оплаты', kb(rows));
    },
    onText: async (text, ctx) => {
      const tgId = String(ctx.chatId);
      const client = await (ctx.convex as any).query('clients:getByTelegramId', { tgId });
      if (!client) return undefined;
      if (text.startsWith('💵')) await (ctx.convex as any).mutation('orders:setPaymentMethod', { clientId: client._id, method: 'cash' });
      if (text.startsWith('💳')) await (ctx.convex as any).mutation('orders:setPaymentMethod', { clientId: client._id, method: 'card' });
      if (text.startsWith('🌐')) await (ctx.convex as any).mutation('orders:setPaymentMethod', { clientId: client._id, method: 'online' });
      await goTo('cart_preview', ctx);
      return undefined;
    },
  });

  // 6. Подтверждение + промокод
  registerStep({
    id: 'cart_preview',
    backStep: 'cart_payment',
    render: async (ctx) => {
      const tgId = String(ctx.chatId);
      const client = await (ctx.convex as any).query('clients:getByTelegramId', { tgId });
      if (!client) return;
      const prev = await (ctx.convex as any).query('orders:getPreview', { clientId: client._id });
      if (!prev) { await ctx.bot.sendMessage(ctx.chatId, 'Не удалось собрать предварительный заказ.'); return; }
      const lines = prev.items.map((it: any, idx: number) => {
        if (typeof it.discountedLineTotal === 'number' && it.discountedLineTotal < it.lineTotal) {
          return `${idx + 1}. ${it.name} ${it.qty} шт. = ${it.lineTotal} ₽ → ${it.discountedLineTotal} ₽`;
        }
        return `${idx + 1}. ${it.name} ${it.qty} шт. = ${it.lineTotal} ₽`;
      }).join('\n');
      const typeMap: Record<string, string> = { 'delivery': 'доставка', 'self-service': 'самовынос', 'restaurant': 'в ресторане' };
      const payMap: Record<string, string> = { 'cash': 'наличные', 'card': 'безналичная оплата', 'online': 'онлайн' };
      const typeRu = prev.type ? (typeMap[prev.type as string] || String(prev.type)) : '';
      const payRu = prev.payment_method ? (payMap[prev.payment_method as string] || String(prev.payment_method)) : '';
      const clientInfo = `Данные клиента: ${prev.clientInfo.name || ''}, ${prev.clientInfo.phone || ''}`;
      const orderInfo = `Данные заказа: ${typeRu}${prev.address ? `, ${prev.address}` : ''}, ${payRu}`;
      const sums = [`Итого: ${prev.subtotal} ₽`, `Скидка: ${prev.discountTotal} ₽`, `Доставка: ${prev.deliveryFee} ₽`, `К оплате: ${prev.total} ₽`].join('\n');
      const text = [ 'Давайте проверим ваш заказ:', lines, '', clientInfo, orderInfo, '', sums ].join('\n');
      const rows = [ [ { text: '✅ Всё верно, заказываю' }, { text: prev.promocode ? 'Промокод применён' : '🏷️ Применить промокод' } ], [ { text: '⬅️ Назад' } ] ];
      await ctx.bot.sendMessage(ctx.chatId, text, kb(rows));
    },
    onText: async (text, ctx) => {
      const tgId = String(ctx.chatId);
      const client = await (ctx.convex as any).query('clients:getByTelegramId', { tgId });
      if (!client) return undefined;
      if (text === '🏷️ Применить промокод') {
        await goTo('cart_promocode', ctx);
        return undefined;
      }
      if (text === '✅ Всё верно, заказываю') {
        const res = await (ctx.convex as any).mutation('orders:confirmOrder', { clientId: client._id });
        if (res?.ok) {
          await ctx.bot.sendMessage(ctx.chatId, 'Спасибо! Ваш заказ в обработке.');
          await goTo('start', ctx);
        } else {
          await ctx.bot.sendMessage(ctx.chatId, `Не удалось подтвердить заказ: ${res?.error || ''}`);
        }
        return undefined;
      }
      return undefined;
    },
  });

  // 6.1 Ввод промокода
  registerStep({
    id: 'cart_promocode',
    backStep: 'cart_preview',
    render: async (ctx) => {
      const rows = [ [ { text: '⬅️ Назад' } ] ];
      await ctx.bot.sendMessage(ctx.chatId, 'Введите промокод:', kb(rows));
    },
    onText: async (text, ctx) => {
      if (text === '⬅️ Назад') return undefined;
      const code = text.trim();
      const tgId = String(ctx.chatId);
      const client = await (ctx.convex as any).query('clients:getByTelegramId', { tgId });
      if (!client) return undefined;
      const res = await (ctx.convex as any).mutation('orders:applyPromocode', { clientId: client._id, code });
      await ctx.bot.sendMessage(ctx.chatId, res?.message || '');
      await goTo('cart_preview', ctx);
      return undefined;
    },
  });

  // Редактирование корзины (reply-клавиатура)
  registerStep({
    id: 'cart_edit',
    backStep: 'cart_view',
    render: async (ctx) => {
      const tgId = String(ctx.chatId);
      const client = await (ctx.convex as any).query('clients:getByTelegramId', { tgId });
      if (!client) return;
      const details = await (ctx.convex as any).query('clients:getCartDetails', { clientId: client._id });
      if (!details.items.length) {
        await ctx.bot.sendMessage(ctx.chatId, 'Корзина пуста.');
        await goTo('menu_home', ctx);
        return;
      }
      const map: Array<{ index: number; menuPositionId: string; label: string }> = details.items.map((it: any, i: number) => ({ index: i + 1, menuPositionId: it.menuPositionId, label: `${i + 1}. ${it.name} (${it.quantity})` }));
      editMapByChat.set(ctx.chatId, map);
      const rows = buttonsFromList(map.map((m) => m.label), 2);
      rows.push([ { text: 'Подтвердить' } ]);
      rows.push([ { text: '⬅️ Назад' } ]);
      await ctx.bot.sendMessage(ctx.chatId, 'Что вы хотите убрать из заказа?', kb(rows));
    },
    onText: async (text, ctx) => {
      if (text === 'Подтвердить') {
        await goTo('cart_view', ctx);
        return undefined;
      }
      const map = editMapByChat.get(ctx.chatId) || [];
      const byIndex = /^\s*(\d+)/.exec(text || '');
      let target = undefined as undefined | { index: number; menuPositionId: string; label: string };
      if (byIndex) {
        const idx = Number(byIndex[1]);
        target = map.find((m) => m.index === idx);
      }
      if (!target) {
        target = map.find((m) => m.label === text.trim());
      }
      if (!target) {
        // Игнорируем произвольный ввод
        return undefined;
      }
      const tgId = String(ctx.chatId);
      const client = await (ctx.convex as any).query('clients:getByTelegramId', { tgId });
      if (!client) return undefined;
      await (ctx.convex as any).mutation('clients:removeFromCart', { clientId: client._id, menuPositionId: target.menuPositionId });
      // Перерисуем клавиатуру
      const details = await (ctx.convex as any).query('clients:getCartDetails', { clientId: client._id });
      if (!details.items.length) {
        await ctx.bot.sendMessage(ctx.chatId, 'Корзина пуста.');
        await goTo('menu_home', ctx);
        return undefined;
      }
      const newMap: Array<{ index: number; menuPositionId: string; label: string }> = details.items.map((it: any, i: number) => ({ index: i + 1, menuPositionId: it.menuPositionId, label: `${i + 1}. ${it.name} (${it.quantity})` }));
      editMapByChat.set(ctx.chatId, newMap);
      const rows = buttonsFromList(newMap.map((m) => m.label), 2);
      rows.push([ { text: 'Подтвердить' } ]);
      rows.push([ { text: '⬅️ Назад' } ]);
      await ctx.bot.sendMessage(ctx.chatId, 'Хорошо, записал. Что-то ещё?', kb(rows));
      return undefined;
    },
  });
}


