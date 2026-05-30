import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";

// Получить клиента по Telegram ID
export const getByTelegramId = query({
  args: { tgId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("clients"),
      _creationTime: v.number(),
      chatId: v.optional(v.string()),
      tgId: v.optional(v.string()),
      name: v.optional(v.string()),
      phone: v.optional(v.string()),
      name_pool: v.optional(v.array(v.string())),
      phone_pool: v.optional(v.array(v.string())),
      username: v.optional(v.string()),
      firstName: v.optional(v.string()),
      lastName: v.optional(v.string()),
      address_pool: v.array(v.object({
        label: v.optional(v.string()),
        address: v.string(),
        entrance: v.optional(v.string()),
        floor: v.optional(v.string()),
        apartment: v.optional(v.string()),
        comment: v.optional(v.string()),
      })),
      cart: v.array(v.object({
        menuPositionId: v.id("menuPositions"),
        quantity: v.number(),
        notes: v.optional(v.string()),
      })),
      role: v.union(
        v.literal("user"),
        v.literal("admin"),
        v.literal("bartender"),
        v.literal("cook"),
        v.literal("courier")
      ),
      isActive: v.boolean(),
      settings: v.optional(v.object({
        notifications: v.boolean(),
        language: v.string(),
        timezone: v.optional(v.string()),
      })),
      hasSeenMenuIntro: v.boolean(),
      navStack: v.optional(v.array(v.object({
        step: v.string(),
        categoryId: v.optional(v.id("categories")),
        menuPositionId: v.optional(v.id("menuPositions")),
      }))),
      createdAt: v.number(),
      lastActivity: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("clients")
      .withIndex("by_telegram_id", (q) => q.eq("tgId", args.tgId))
      .collect();
    if (rows.length === 0) return null;
    if (rows.length > 1) {
      console.warn(`[getByTelegramId] Found duplicates for tgId=${args.tgId}, count=${rows.length}`);
    }
    // Берём самый свежий по _creationTime
    let latest = rows[0];
    for (const r of rows) if (r._creationTime > latest._creationTime) latest = r;
    return latest as any;
  },
});

// Получить клиента по ID (минимальный набор полей)
export const getById = query({
  args: { clientId: v.id("clients") },
  returns: v.union(
    v.object({
      _id: v.id("clients"),
      tgId: v.optional(v.string()),
      chatId: v.optional(v.string()),
      name: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const c = await ctx.db.get(args.clientId);
    if (!c) return null;
    return {
      _id: c._id,
      tgId: (c as any).tgId as string | undefined,
      chatId: (c as any).chatId as string | undefined,
      name: c.name as string | undefined,
    } as any;
  },
});

// Создать нового клиента
export const create = mutation({
  args: {
    tgId: v.optional(v.string()),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    username: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    chatId: v.optional(v.string()),
  },
  returns: v.id("clients"),
  handler: async (ctx, args) => {
    const now = Date.now();
    // Если передан tgId и клиент с таким tgId уже есть — возвращаем существующего
    if (args.tgId) {
      const existing = await ctx.db
        .query("clients")
        .withIndex("by_telegram_id", (q) => q.eq("tgId", args.tgId as string))
        .collect();
      if (existing.length > 0) {
        let latest = existing[0];
        for (const r of existing) if (r._creationTime > latest._creationTime) latest = r;
        return latest._id as Id<"clients">;
      }
    }
    return await ctx.db.insert("clients", {
      tgId: args.tgId,
      name: args.name,
      phone: args.phone,
      name_pool: [],
      phone_pool: [],
      username: args.username,
      firstName: args.firstName,
      lastName: args.lastName,
      address_pool: [],
      cart: [],
      hasSeenMenuIntro: false,
      navStack: [],
      role: "user" as const,
      isActive: true,
      settings: {
        notifications: true,
        language: "ru",
      },
      createdAt: now,
      lastActivity: now,
      chatId: args.chatId,
    });
  },
});

// Найти клиента по телефону в phone_pool или phone
export const findByPhone = query({
  args: { phone: v.string() },
  returns: v.array(v.object({ _id: v.id("clients"), name: v.optional(v.string()), phone: v.optional(v.string()), name_pool: v.optional(v.array(v.string())), phone_pool: v.optional(v.array(v.string())), address_pool: v.array(v.object({ address: v.string(), label: v.optional(v.string()), entrance: v.optional(v.string()), floor: v.optional(v.string()), apartment: v.optional(v.string()), comment: v.optional(v.string()) })) })),
  handler: async (ctx, args) => {
    const phone = (args.phone || "").trim();
    const byField = await ctx.db.query("clients").withIndex("by_phone", (q) => q.eq("phone", phone)).collect();
    // Полнотекстового поиска по массиву нет — фильтруем на стороне сервера по phone_pool
    const all = await ctx.db.query("clients").collect();
    const fromPool = all.filter((c) => ((c.phone_pool as string[] | undefined) || []).includes(phone));
    const resultMap = new Map<string, any>();
    for (const c of [...byField, ...fromPool]) resultMap.set(String(c._id), { _id: c._id, name: c.name as any, phone: c.phone as any, name_pool: c.name_pool as any, phone_pool: c.phone_pool as any, address_pool: (c.address_pool as any[]) || [] });
    return Array.from(resultMap.values()) as any;
  },
});
// --- Employees CRUD перенесём в users через Convex Auth (см. users.ts) ---


// Обновить активность клиента
export const updateActivity = mutation({
  args: { clientId: v.id("clients") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.clientId, {
      lastActivity: Date.now(),
    });
    return null;
  },
});

// Отметить, что клиент увидел интро меню
export const markMenuIntroSeen = mutation({
  args: { clientId: v.id("clients") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.clientId, {
      hasSeenMenuIntro: true,
    });
    return null;
  },
});

// Инициализировать стек навигации текущим шагом
export const navInit = mutation({
  args: {
    clientId: v.id("clients"),
    step: v.string(),
    categoryId: v.optional(v.id("categories")),
    menuPositionId: v.optional(v.id("menuPositions")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.clientId, { navStack: [{ step: args.step, categoryId: args.categoryId, menuPositionId: args.menuPositionId }] });
    return null;
  },
});

// Добавить шаг в стек
export const navPush = mutation({
  args: {
    clientId: v.id("clients"),
    step: v.string(),
    categoryId: v.optional(v.id("categories")),
    menuPositionId: v.optional(v.id("menuPositions")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const client = await ctx.db.get(args.clientId);
    const stack = (client?.navStack as Array<any> | undefined) || [];
    stack.push({ step: args.step, categoryId: args.categoryId, menuPositionId: args.menuPositionId });
    await ctx.db.patch(args.clientId, { navStack: stack });
    return null;
  },
});

// Шаг назад
export const navBack = mutation({
  args: { clientId: v.id("clients") },
  returns: v.union(
    v.object({
      step: v.union(v.string(), v.literal("")),
      categoryId: v.union(v.id("categories"), v.null()),
      menuPositionId: v.union(v.id("menuPositions"), v.null()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const client = await ctx.db.get(args.clientId);
    const stack = (client?.navStack as Array<any> | undefined) || [];
    if (stack.length === 0) return null;
    stack.pop();
    const last = stack[stack.length - 1];
    await ctx.db.patch(args.clientId, { navStack: stack });
    if (!last) return null;
    return { step: last.step ?? "", categoryId: last.categoryId ?? null, menuPositionId: last.menuPositionId ?? null } as any;
  },
});

// Получить статистику клиентов
export const getStats = query({
  args: {},
  returns: v.object({
    total: v.number(),
    active: v.number(),
    admins: v.number(),
  }),
  handler: async (ctx) => {
    const clients = await ctx.db.query("clients").collect();
    
    const total = clients.length;
    const active = clients.filter(c => c.isActive).length;
    const admins = clients.filter(c => c.role === "admin").length;
    
    return { total, active, admins };
  },
});

// Список клиентов (для CRM/рассылок)
export const list = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("clients"),
    _creationTime: v.number(),
    name: v.optional(v.string()),
    name_pool: v.optional(v.array(v.string())),
    phone: v.optional(v.string()),
    phone_pool: v.optional(v.array(v.string())),
    username: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    tgId: v.optional(v.string()),
    chatId: v.optional(v.string()),
    address_pool: v.array(v.object({
      label: v.optional(v.string()),
      address: v.string(),
      entrance: v.optional(v.string()),
      floor: v.optional(v.string()),
      apartment: v.optional(v.string()),
      comment: v.optional(v.string()),
    })),
    createdAt: v.number(),
    lastActivity: v.number(),
  })),
  handler: async (ctx) => {
    const rows = await ctx.db.query("clients").order("desc").collect();
    return rows.map((c) => ({
      _id: c._id,
      _creationTime: c._creationTime,
      name: (c as any).name ?? undefined,
      name_pool: (c as any).name_pool ?? undefined,
      phone: (c as any).phone ?? undefined,
      phone_pool: (c as any).phone_pool ?? undefined,
      username: (c as any).username ?? undefined,
      firstName: (c as any).firstName ?? undefined,
      lastName: (c as any).lastName ?? undefined,
      tgId: (c as any).tgId ?? undefined,
      chatId: (c as any).chatId ?? undefined,
      address_pool: (c as any).address_pool ?? [],
      createdAt: (c as any).createdAt,
      lastActivity: (c as any).lastActivity,
    })) as any;
  },
});

// Обновить настройки клиента
export const updateSettings = mutation({
  args: {
    clientId: v.id("clients"),
    settings: v.object({
      notifications: v.boolean(),
      language: v.string(),
      timezone: v.optional(v.string()),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.clientId, {
      settings: args.settings,
    });
    return null;
  },
});

// Изменить роль клиента (только для админов)
export const updateRole = mutation({
  args: {
    clientId: v.id("clients"),
    role: v.union(v.literal("user"), v.literal("admin")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.clientId, {
      role: args.role,
    });
    return null;
  },
}); 

// Добавить позицию в корзину клиента (инкрементирует количество)
export const addToCart = mutation({
  args: {
    clientId: v.id("clients"),
    menuPositionId: v.id("menuPositions"),
    quantity: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const client = await ctx.db.get(args.clientId);
    if (!client) return null;
    const qty = Math.max(1, Math.floor(args.quantity ?? 1));
    const cart = (client.cart as Array<any>) || [];
    const idx = cart.findIndex((c) => c.menuPositionId === args.menuPositionId);
    if (idx >= 0) {
      cart[idx] = { ...cart[idx], quantity: (cart[idx].quantity ?? 0) + qty };
    } else {
      cart.push({ menuPositionId: args.menuPositionId, quantity: qty });
    }
    await ctx.db.patch(args.clientId, { cart });
    return null;
  },
});

// Установить точное количество позиции в корзине (0 — удалить)
export const setCartQuantity = mutation({
  args: {
    clientId: v.id("clients"),
    menuPositionId: v.id("menuPositions"),
    quantity: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const client = await ctx.db.get(args.clientId);
    if (!client) return null;
    const qty = Math.floor(args.quantity);
    let cart = ((client.cart as Array<any>) || []).slice();
    const idx = cart.findIndex((c) => c.menuPositionId === args.menuPositionId);
    if (qty <= 0) {
      cart = cart.filter((c) => c.menuPositionId !== args.menuPositionId);
    } else if (idx >= 0) {
      cart[idx] = { ...cart[idx], quantity: qty };
    } else {
      cart.push({ menuPositionId: args.menuPositionId, quantity: qty });
    }
    await ctx.db.patch(args.clientId, { cart });
    return null;
  },
});

// Удалить позицию из корзины целиком
export const removeFromCart = mutation({
  args: {
    clientId: v.id("clients"),
    menuPositionId: v.id("menuPositions"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const client = await ctx.db.get(args.clientId);
    if (!client) return null;
    const cart = ((client.cart as Array<any>) || []).filter((c) => c.menuPositionId !== args.menuPositionId);
    await ctx.db.patch(args.clientId, { cart });
    return null;
  },
});

// Очистить корзину
export const clearCart = mutation({
  args: { clientId: v.id("clients") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.clientId, { cart: [] });
    return null;
  },
});

// Детализация корзины с названиями и суммой
export const getCartDetails = query({
  args: { clientId: v.id("clients") },
  returns: v.object({
    items: v.array(v.object({
      menuPositionId: v.id("menuPositions"),
      name: v.string(),
      quantity: v.number(),
      unitPrice: v.number(),
      lineTotal: v.number(),
    })),
    subtotal: v.number(),
  }),
  handler: async (ctx, args) => {
    const client = await ctx.db.get(args.clientId);
    const cart = (client?.cart as Array<any>) || [];
    const items: Array<any> = [];
    let subtotal = 0;
    for (const row of cart) {
      const pos = await ctx.db.get(row.menuPositionId) as Doc<"menuPositions"> | null;
      if (!pos) continue;
      const unit = (pos.discountPrice ?? pos.price) as number;
      const qty = Math.max(0, row.quantity as number);
      const line = unit * qty;
      items.push({ menuPositionId: row.menuPositionId, name: pos.name as string, quantity: qty, unitPrice: unit, lineTotal: line });
      subtotal += line;
    }
    return { items, subtotal };
  },
});