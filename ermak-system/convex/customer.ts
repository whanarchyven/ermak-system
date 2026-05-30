import { v } from "convex/values";
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";
import { auth } from "./auth";

const addressValidator = v.object({
  label: v.optional(v.string()),
  address: v.string(),
  entrance: v.optional(v.string()),
  floor: v.optional(v.string()),
  apartment: v.optional(v.string()),
  comment: v.optional(v.string()),
});

async function resolveClientByUser(ctx: any): Promise<Doc<"clients"> | null> {
  const userId = await auth.getUserId(ctx);
  if (!userId) return null;
  const client = await ctx.db
    .query("clients")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .unique();
  return client ?? null;
}

/**
 * Гарантирует наличие записи clients для текущего авторизованного пользователя.
 * Вызывается PWA сразу после входа/регистрации. Возвращает clientId и профиль.
 */
export const ensureProfile = mutation({
  args: {},
  returns: v.union(
    v.object({
      clientId: v.id("clients"),
      name: v.optional(v.string()),
      phone: v.optional(v.string()),
      loyaltyPoints: v.number(),
      address_pool: v.array(addressValidator),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId as Id<"users">);
    const phone = (user as any)?.phone as string | undefined;
    const name = (user as any)?.name as string | undefined;

    let client = await ctx.db
      .query("clients")
      .withIndex("by_user", (q) => q.eq("userId", userId as Id<"users">))
      .unique();

    const now = Date.now();
    if (!client) {
      const id = await ctx.db.insert("clients", {
        userId: userId as Id<"users">,
        loyaltyPoints: 0,
        name: name,
        phone: phone,
        name_pool: name ? [name] : [],
        phone_pool: phone ? [phone] : [],
        address_pool: [],
        cart: [],
        hasSeenMenuIntro: false,
        navStack: [],
        role: "user" as const,
        isActive: true,
        settings: { notifications: true, language: "ru" },
        createdAt: now,
        lastActivity: now,
      });
      client = await ctx.db.get(id);
    } else {
      await ctx.db.patch(client._id, { lastActivity: now });
    }
    if (!client) return null;
    return {
      clientId: client._id,
      name: client.name as string | undefined,
      phone: client.phone as string | undefined,
      loyaltyPoints: (client.loyaltyPoints as number | undefined) ?? 0,
      address_pool: (client.address_pool as any[]) ?? [],
    };
  },
});

/** Текущий клиент (или null). */
export const me = query({
  args: {},
  returns: v.union(
    v.object({
      clientId: v.id("clients"),
      name: v.optional(v.string()),
      phone: v.optional(v.string()),
      loyaltyPoints: v.number(),
      address_pool: v.array(addressValidator),
      cartCount: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const client = await resolveClientByUser(ctx);
    if (!client) return null;
    const cart = (client.cart as any[]) ?? [];
    return {
      clientId: client._id,
      name: client.name as string | undefined,
      phone: client.phone as string | undefined,
      loyaltyPoints: (client.loyaltyPoints as number | undefined) ?? 0,
      address_pool: (client.address_pool as any[]) ?? [],
      cartCount: cart.reduce((s: number, c: any) => s + (c.quantity || 0), 0),
    };
  },
});

/** Баланс и история баллов лояльности. */
export const getLoyalty = query({
  args: {},
  returns: v.object({
    balance: v.number(),
    transactions: v.array(
      v.object({
        _id: v.id("loyaltyTransactions"),
        delta: v.number(),
        reason: v.union(v.literal("accrue"), v.literal("redeem"), v.literal("manual")),
        balanceAfter: v.number(),
        comment: v.optional(v.string()),
        createdAt: v.number(),
      })
    ),
  }),
  handler: async (ctx) => {
    const client = await resolveClientByUser(ctx);
    if (!client) return { balance: 0, transactions: [] };
    const txs = await ctx.db
      .query("loyaltyTransactions")
      .withIndex("by_client_and_created", (q) => q.eq("clientId", client._id))
      .order("desc")
      .take(100);
    return {
      balance: (client.loyaltyPoints as number | undefined) ?? 0,
      transactions: txs.map((t) => ({
        _id: t._id,
        delta: t.delta as number,
        reason: t.reason as any,
        balanceAfter: t.balanceAfter as number,
        comment: t.comment as string | undefined,
        createdAt: t.createdAt as number,
      })),
    };
  },
});

/** Обновить имя клиента. */
export const updateName = mutation({
  args: { name: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const client = await resolveClientByUser(ctx);
    if (!client) return null;
    const pool = new Set<string>([...((client.name_pool as string[] | undefined) ?? [])]);
    if (args.name) pool.add(args.name);
    await ctx.db.patch(client._id, { name: args.name, name_pool: Array.from(pool) });
    return null;
  },
});

/** Добавить адрес в пул клиента. */
export const addAddress = mutation({
  args: { address: addressValidator },
  returns: v.null(),
  handler: async (ctx, args) => {
    const client = await resolveClientByUser(ctx);
    if (!client) return null;
    const pool = ((client.address_pool as any[]) ?? []).slice();
    pool.push(args.address);
    await ctx.db.patch(client._id, { address_pool: pool });
    return null;
  },
});

/** Удалить адрес из пула по индексу. */
export const removeAddress = mutation({
  args: { index: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const client = await resolveClientByUser(ctx);
    if (!client) return null;
    const pool = ((client.address_pool as any[]) ?? []).slice();
    if (args.index >= 0 && args.index < pool.length) {
      pool.splice(args.index, 1);
      await ctx.db.patch(client._id, { address_pool: pool });
    }
    return null;
  },
});

/** Публичный VAPID-ключ для подписки на Web Push (из env деплоймента). */
export const getVapidPublicKey = query({
  args: {},
  returns: v.union(v.string(), v.null()),
  handler: async () => {
    return (process.env.VAPID_PUBLIC_KEY as string | undefined) ?? null;
  },
});

/** Сохранить (upsert) подписку Web Push для текущего клиента. */
export const savePushSubscription = mutation({
  args: {
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    userAgent: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const client = await resolveClientByUser(ctx);
    if (!client) return null;
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", args.endpoint))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        clientId: client._id,
        p256dh: args.p256dh,
        auth: args.auth,
        userAgent: args.userAgent,
      });
      return null;
    }
    await ctx.db.insert("pushSubscriptions", {
      clientId: client._id,
      endpoint: args.endpoint,
      p256dh: args.p256dh,
      auth: args.auth,
      userAgent: args.userAgent,
      createdAt: Date.now(),
    });
    return null;
  },
});

/** Внутренние функции для отправки Web Push из node-экшена. */
export const getPushSubscriptionsInternal = internalQuery({
  args: { clientId: v.id("clients") },
  returns: v.array(
    v.object({
      _id: v.id("pushSubscriptions"),
      endpoint: v.string(),
      p256dh: v.string(),
      auth: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const subs = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .collect();
    return subs.map((s) => ({ _id: s._id, endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth }));
  },
});

export const removePushSubscriptionInternal = internalMutation({
  args: { id: v.id("pushSubscriptions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return null;
  },
});

const orderStatusValidator = v.union(
  v.literal("backlog"),
  v.literal("accepted"),
  v.literal("pending"),
  v.literal("ready"),
  v.literal("delivery"),
  v.literal("delivery_pending"),
  v.literal("completed"),
  v.literal("cancelled"),
  v.literal("refund")
);

const orderTypeValidator = v.union(
  v.literal("delivery"),
  v.literal("restaurant"),
  v.literal("self-service")
);

const orderPositionValidator = v.object({
  name: v.string(),
  quantity: v.number(),
  unitPrice: v.number(),
  photo: v.optional(v.string()),
  prepared: v.optional(v.boolean()),
});

const orderValidator = v.object({
  _id: v.id("orders"),
  status: orderStatusValidator,
  type: orderTypeValidator,
  address: v.optional(v.string()),
  subtotal: v.number(),
  discountTotal: v.number(),
  deliveryFee: v.number(),
  total: v.number(),
  payment_method: v.union(v.literal("cash"), v.literal("card"), v.literal("online")),
  is_paid: v.boolean(),
  promocode: v.optional(v.string()),
  pointsEarned: v.optional(v.number()),
  pointsRedeemed: v.optional(v.number()),
  estimateMinutes: v.optional(v.number()),
  dueAt: v.optional(v.number()),
  readyAt: v.optional(v.number()),
  deliveryDue: v.optional(v.number()),
  positions: v.array(orderPositionValidator),
  createdAt: v.number(),
  updatedAt: v.number(),
});

async function enrichOrder(ctx: any, o: Doc<"orders">) {
  const positions = [] as any[];
  for (const p of (o.positions as any[]) ?? []) {
    const mp = await ctx.db.get(p.menuPositionId);
    positions.push({
      name: (mp?.name as string) ?? "—",
      quantity: p.quantity as number,
      unitPrice: p.unitPrice as number,
      photo: (mp?.photo as string | undefined) ?? undefined,
      prepared: p.prepared as boolean | undefined,
    });
  }
  return {
    _id: o._id,
    status: o.status as any,
    type: o.type as any,
    address: (o.address as string | undefined) ?? undefined,
    subtotal: o.subtotal as number,
    discountTotal: o.discountTotal as number,
    deliveryFee: o.deliveryFee as number,
    total: o.total as number,
    payment_method: o.payment_method as any,
    is_paid: o.is_paid as boolean,
    promocode: (o.promocode as string | undefined) ?? undefined,
    pointsEarned: (o as any).pointsEarned as number | undefined,
    pointsRedeemed: (o as any).pointsRedeemed as number | undefined,
    estimateMinutes: (o as any).estimateMinutes as number | undefined,
    dueAt: (o as any).dueAt as number | undefined,
    readyAt: (o as any).readyAt as number | undefined,
    deliveryDue: (o as any).deliveryDue as number | undefined,
    positions,
    createdAt: o.createdAt as number,
    updatedAt: o.updatedAt as number,
  };
}

/** Заказы текущего клиента (история + активные), новые сверху. */
export const myOrders = query({
  args: {},
  returns: v.array(orderValidator),
  handler: async (ctx) => {
    const client = await resolveClientByUser(ctx);
    if (!client) return [];
    const rows = await ctx.db
      .query("orders")
      .withIndex("by_client", (q) => q.eq("clientId", client._id))
      .order("desc")
      .take(50);
    const result = [];
    for (const o of rows) result.push(await enrichOrder(ctx, o));
    return result;
  },
});

/** Один заказ текущего клиента по id. */
export const orderById = query({
  args: { orderId: v.id("orders") },
  returns: v.union(orderValidator, v.null()),
  handler: async (ctx, args) => {
    const client = await resolveClientByUser(ctx);
    if (!client) return null;
    const o = await ctx.db.get(args.orderId);
    if (!o || String(o.clientId) !== String(client._id)) return null;
    return await enrichOrder(ctx, o);
  },
});
