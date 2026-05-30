// Назначить курьера и перевести в delivery_pending
export const assignCourier = mutation({
  args: { orderId: v.id("orders"), courierId: v.id("users") },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    const now = Date.now();
    // Только назначаем курьера, статус остаётся delivery. Принятие будет отдельной мутацией
    await ctx.db.patch(args.orderId, { courierId: args.courierId, updatedAt: now });
    return { ok: true } as any;
  },
});

// Принят курьером: фиксируем время и переводим в delivery_pending, задаём срок доставки
export const courierAccept = mutation({
  args: { orderId: v.id("orders"), deliveryMinutes: v.number() },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    const now = Date.now();
    const mins = Math.max(0, Math.floor(args.deliveryMinutes));
    const deliveryDue = now + mins * 60 * 1000;
    await ctx.db.patch(args.orderId, { status: "delivery_pending", deliveryAcceptedAt: now, deliveryMinutes: mins, deliveryDue, updatedAt: now });
    const h = Math.floor(mins / 60); const m = mins % 60; const parts: string[] = []; if (h) parts.push(`${h} ч`); if (m || !h) parts.push(`${m} м`);
    const text = `Ваш заказ передан курьеру. Примерное время ожидания доставки: ${parts.join(" ")}.`;
    await ctx.scheduler.runAfter(0, api.orders.notifyClient, { clientId: order.clientId as Id<"clients">, message: text } as any);
    return { ok: true } as any;
  },
});

import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";
import { api, internal } from "./_generated/api";

type OrderType = "delivery" | "restaurant" | "self-service";
type PaymentMethod = "cash" | "card" | "online";

// Начать оформление: создать/заменить черновик заказа из текущей корзины
export const startCheckout = mutation({
  args: { clientId: v.id("clients") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const client = await ctx.db.get(args.clientId);
    if (!client) return null;
    const cart = (client.cart as Array<any>) || [];
    const existing = await ctx.db.query("orders_temp").withIndex("by_client", (q) => q.eq("clientId", args.clientId)).unique();
    const now = Date.now();
    const doc = {
      clientId: args.clientId,
      positions: cart.map((c: any) => ({ menuPositionId: c.menuPositionId, quantity: c.quantity, comment: c.notes })),
      step: "cart_review",
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    } as any;
    if (existing) {
      await ctx.db.patch(existing._id as Id<"orders_temp">, doc);
    } else {
      await ctx.db.insert("orders_temp", { ...doc });
    }
    return null;
  },
});

// Создать/обновить временный черновик для ручного заказа (позиции)
export const setTempPositions = mutation({
  args: { clientId: v.id("clients"), items: v.array(v.object({ menuPositionId: v.id("menuPositions"), quantity: v.number(), comment: v.optional(v.string()) })) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const tmp = await ctx.db.query("orders_temp").withIndex("by_client", (q) => q.eq("clientId", args.clientId)).unique();
    const now = Date.now();
    if (tmp) {
      await ctx.db.patch(tmp._id as Id<"orders_temp">, { positions: args.items, updatedAt: now });
    } else {
      await ctx.db.insert("orders_temp", { clientId: args.clientId, positions: args.items, createdAt: now, updatedAt: now } as any);
    }
    return null;
  },
});

// Создать/обновить временный черновик клиента (имя/телефон)
export const setTempClient = mutation({
  args: { clientId: v.id("clients"), name: v.optional(v.string()), phone: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const tmp = await ctx.db.query("orders_temp").withIndex("by_client", (q) => q.eq("clientId", args.clientId)).unique();
    const now = Date.now();
    const clientInfo = { name: args.name, phone: args.phone } as any;
    if (tmp) {
      await ctx.db.patch(tmp._id as Id<"orders_temp">, { clientInfo, updatedAt: now });
    } else {
      await ctx.db.insert("orders_temp", { clientId: args.clientId, positions: [], clientInfo, createdAt: now, updatedAt: now } as any);
    }
    // Пулы
    const c = await ctx.db.get(args.clientId);
    const names = new Set<string>([...(((c?.name_pool as any[]) ?? []) as string[])]);
    if (args.name) names.add(args.name);
    const phones = new Set<string>([...(((c?.phone_pool as any[]) ?? []) as string[])]);
    if (args.phone) phones.add(args.phone);
    await ctx.db.patch(args.clientId, { name: args.name ?? (c?.name as any), phone: args.phone ?? (c?.phone as any), name_pool: Array.from(names), phone_pool: Array.from(phones) } as any);
    return null;
  },
});

export const setName = mutation({
  args: { clientId: v.id("clients"), name: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const tmp = await ctx.db.query("orders_temp").withIndex("by_client", (q) => q.eq("clientId", args.clientId)).unique();
    const now = Date.now();
    if (!tmp) {
      await ctx.db.insert("orders_temp", { clientId: args.clientId, positions: [], clientInfo: { name: args.name }, createdAt: now, updatedAt: now });
    } else {
      const clientInfo = { ...(tmp.clientInfo as any), name: args.name };
      await ctx.db.patch(tmp._id as Id<"orders_temp">, { clientInfo, updatedAt: now });
    }
    // Добавить в пул, если нового значения нет
    const client = await ctx.db.get(args.clientId);
    const pool = new Set<string>([...((client?.name_pool as Array<string> | undefined) ?? [])]);
    if (!pool.has(args.name)) {
      pool.add(args.name);
      await ctx.db.patch(args.clientId, { name_pool: Array.from(pool) });
    }
    return null;
  },
});

export const setPhone = mutation({
  args: { clientId: v.id("clients"), phone: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const tmp = await ctx.db.query("orders_temp").withIndex("by_client", (q) => q.eq("clientId", args.clientId)).unique();
    const now = Date.now();
    if (!tmp) {
      await ctx.db.insert("orders_temp", { clientId: args.clientId, positions: [], clientInfo: { phone: args.phone }, createdAt: now, updatedAt: now });
    } else {
      const clientInfo = { ...(tmp.clientInfo as any), phone: args.phone };
      await ctx.db.patch(tmp._id as Id<"orders_temp">, { clientInfo, updatedAt: now });
    }
    const client = await ctx.db.get(args.clientId);
    const pool = new Set<string>([...((client?.phone_pool as Array<string> | undefined) ?? [])]);
    if (!pool.has(args.phone)) {
      pool.add(args.phone);
      await ctx.db.patch(args.clientId, { phone_pool: Array.from(pool) });
    }
    return null;
  },
});

export const setOrderType = mutation({
  args: { clientId: v.id("clients"), type: v.union(v.literal("delivery"), v.literal("restaurant"), v.literal("self-service")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const tmp = await ctx.db.query("orders_temp").withIndex("by_client", (q) => q.eq("clientId", args.clientId)).unique();
    if (!tmp) return null;
    await ctx.db.patch(tmp._id as Id<"orders_temp">, { type: args.type, updatedAt: Date.now() });
    return null;
  },
});

export const setAddress = mutation({
  args: { clientId: v.id("clients"), address: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const tmp = await ctx.db.query("orders_temp").withIndex("by_client", (q) => q.eq("clientId", args.clientId)).unique();
    if (tmp) {
      await ctx.db.patch(tmp._id as Id<"orders_temp">, { address: args.address, updatedAt: Date.now() });
    }
    // Добавить адрес в пул, если его нет
    const client = await ctx.db.get(args.clientId);
    const pool = ((client?.address_pool as Array<any> | undefined) ?? []).map((a) => a.address);
    if (!pool.includes(args.address)) {
      const next = [ ...((client?.address_pool as Array<any> | undefined) ?? []), { address: args.address } ];
      await ctx.db.patch(args.clientId, { address_pool: next });
    }
    return null;
  },
});

export const setPaymentMethod = mutation({
  args: { clientId: v.id("clients"), method: v.union(v.literal("cash"), v.literal("card"), v.literal("online")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const tmp = await ctx.db.query("orders_temp").withIndex("by_client", (q) => q.eq("clientId", args.clientId)).unique();
    if (!tmp) return null;
    await ctx.db.patch(tmp._id as Id<"orders_temp">, { payment_method: args.method, updatedAt: Date.now() });
    return null;
  },
});

// Указать, сколько баллов клиент хочет списать в текущем заказе
export const setRedeemPoints = mutation({
  args: { clientId: v.id("clients"), points: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const tmp = await ctx.db.query("orders_temp").withIndex("by_client", (q) => q.eq("clientId", args.clientId)).unique();
    if (!tmp) return null;
    await ctx.db.patch(tmp._id as Id<"orders_temp">, { redeemPoints: Math.max(0, Math.floor(args.points)), updatedAt: Date.now() });
    return null;
  },
});

function clamp(n: number, min: number, max: number): number { return Math.max(min, Math.min(max, n)); }

async function computeSubtotal(ctx: any, positions: Array<{ menuPositionId: Id<"menuPositions">; quantity: number }>) {
  let subtotal = 0;
  const detailed: Array<{ id: Id<"menuPositions">; name: string; categoryId: Id<"categories">; unitPrice: number; qty: number; cashbackScore: number }>= [] as any;
  for (const p of positions) {
    const item = await ctx.db.get(p.menuPositionId);
    if (!item) continue;
    const unit = (item.discountPrice as number | undefined) ?? (item.price as number);
    const cashbackScore = (item.cashback_score as number | undefined) ?? 0;
    detailed.push({ id: p.menuPositionId, name: item.name as string, categoryId: item.categoryId as Id<"categories">, unitPrice: unit, qty: p.quantity, cashbackScore });
    subtotal += unit * p.quantity;
  }
  return { subtotal, detailed } as const;
}

// Сколько баллов можно списать в заказе при заданном балансе и сумме к оплате
function computeRedeem(requested: number | undefined, balance: number, payable: number): number {
  const req = Math.max(0, Math.floor(requested ?? 0));
  return Math.max(0, Math.min(req, Math.floor(balance), Math.floor(payable)));
}

export const applyPromocode = mutation({
  args: { clientId: v.id("clients"), code: v.string() },
  returns: v.object({ ok: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => {
    const code = (args.code || "").trim().toUpperCase();
    const promo = await ctx.db.query("promocodes").withIndex("by_code", (q) => q.eq("code", code)).unique();
    if (!promo || !promo.isActive) {
      return { ok: false, message: "Промокод не найден или неактивен" } as const;
    }
    if (promo.expiresAt && promo.expiresAt < Date.now()) {
      return { ok: false, message: "Промокод истёк" } as const;
    }
    const tmp = await ctx.db.query("orders_temp").withIndex("by_client", (q) => q.eq("clientId", args.clientId)).unique();
    if (!tmp) return { ok: false, message: "Черновик заказа не найден" } as const;

    const positions = (tmp.positions as Array<{ menuPositionId: Id<"menuPositions">; quantity: number }> | undefined) || [];
    const { subtotal, detailed } = await computeSubtotal(ctx, positions);

    // Conditions: threshold
    if ((promo as any).condThresholdEnabled) {
      const thr = (promo as any).condThresholdValue as number | undefined;
      if (typeof thr === "number" && subtotal < thr) {
        return { ok: false, message: `Сумма заказа должна быть от ${thr} ₽` } as const;
      }
    }
    // Conditions: order type
    if ((promo as any).condOrderTypeEnabled) {
      const reqType = (promo as any).condOrderType as ("delivery" | "self-service" | undefined);
      const tmpType = tmp.type as ("delivery" | "self-service" | "restaurant" | undefined);
      if (reqType && tmpType !== reqType) {
        const label = reqType === "delivery" ? "доставку" : "самовынос";
        return { ok: false, message: `Данный промокод доступен только для заказов на ${label}` } as const;
      }
    }

    // Scope validation
    const scope = promo.scope as "order" | "category" | "position";
    if (scope === "category") {
      const catId = promo.categoryId as Id<"categories"> | undefined;
      const has = detailed.some((d) => String(d.categoryId || "") === String(catId || ""));
      if (!has) return { ok: false, message: "В корзине нет позиций из этой категории" } as const;
    } else if (scope === "position") {
      const posId = promo.positionId as Id<"menuPositions"> | undefined;
      const has = detailed.some((d) => String(d.id) === String(posId || ""));
      if (!has) return { ok: false, message: "В корзине нет указанного блюда" } as const;
    }

    await ctx.db.patch(tmp._id as Id<"orders_temp">, { promocode: code, updatedAt: Date.now() });
    // Calculate new total for message
    const preview: any = await ctx.runQuery(api.orders.getPreview, { clientId: args.clientId });
    const total = preview?.total ?? subtotal;
    return { ok: true, message: `Промокод применён, итоговая сумма заказа: ${total} ₽` } as const;
  },
});

export const getPreview = query({
  args: { clientId: v.id("clients") },
  returns: v.union(
    v.object({
      items: v.array(v.object({ id: v.id("menuPositions"), name: v.string(), qty: v.number(), unitPrice: v.number(), lineTotal: v.number(), discountedLineTotal: v.optional(v.number()) })),
      clientInfo: v.object({ name: v.optional(v.string()), phone: v.optional(v.string()) }),
      type: v.optional(v.union(v.literal("delivery"), v.literal("restaurant"), v.literal("self-service"))),
      address: v.optional(v.string()),
      payment_method: v.optional(v.union(v.literal("cash"), v.literal("card"), v.literal("online"))),
      subtotal: v.number(),
      discountTotal: v.number(),
      deliveryFee: v.number(),
      total: v.number(),
      promocode: v.optional(v.string()),
      pointsEarned: v.number(),
      redeemApplied: v.number(),
      loyaltyBalance: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const tmp = await ctx.db.query("orders_temp").withIndex("by_client", (q) => q.eq("clientId", args.clientId)).unique();
    if (!tmp) return null;
    const positions = (tmp.positions as Array<any>) || [];
    const { subtotal, detailed } = await computeSubtotal(ctx, positions);
    let discountTotal = 0;
    let discountedMap = new Map<string, number>();
    const promoCode = (tmp.promocode as string | undefined) ?? undefined;
    if (promoCode) {
      const promo = await ctx.db.query("promocodes").withIndex("by_code", (q) => q.eq("code", promoCode)).unique();
      if (promo && promo.isActive && (!promo.expiresAt || promo.expiresAt > Date.now())) {
        const scope = promo.scope as "order" | "category" | "position";
        const isPercent = promo.type === "percent";
        const value = promo.value as number;
        const apply = (sum: number) => (isPercent ? (sum * clamp(value, 0, 100)) / 100 : Math.min(sum, Math.max(0, value)));
        if (scope === "order") {
          discountTotal = apply(subtotal);
        } else if (scope === "position" && promo.positionId) {
          const target = detailed.find((d) => d.id === promo.positionId);
          if (target) {
            discountTotal = apply(target.unitPrice * target.qty);
            discountedMap.set(String(target.id), target.unitPrice * target.qty - discountTotal);
          }
        } else if (scope === "category" && promo.categoryId) {
          let affected = 0;
          for (const d of detailed) {
            if (d.categoryId === promo.categoryId) affected += d.unitPrice * d.qty;
          }
          discountTotal = apply(affected);
        }
      }
    }
    const deliveryFee = (tmp.type === "delivery" ? (subtotal - discountTotal >= 1000 ? 0 : 100) : 0);
    const payable = Math.max(0, subtotal - discountTotal + deliveryFee);
    // Баллы лояльности
    const client = await ctx.db.get(args.clientId);
    const loyaltyBalance = (client?.loyaltyPoints as number | undefined) ?? 0;
    const redeemApplied = computeRedeem(tmp.redeemPoints as number | undefined, loyaltyBalance, payable);
    const pointsEarned = detailed.reduce((s, d) => s + d.cashbackScore * d.qty, 0);
    const total = Math.max(0, payable - redeemApplied);
    let promoForLines: any = null;
    if (promoCode) {
      promoForLines = await ctx.db.query("promocodes").withIndex("by_code", (q) => q.eq("code", promoCode)).unique();
    }
    const items = detailed.map((d) => {
      const line = d.unitPrice * d.qty;
      let discountedLineTotal: number | undefined = undefined;
      if (promoForLines) {
        if (promoForLines.scope === "position" && promoForLines.positionId === d.id) {
          const apply = promoForLines.type === "percent" ? (line * clamp(promoForLines.value as number, 0, 100)) / 100 : Math.min(line, Math.max(0, promoForLines.value as number));
          discountedLineTotal = line - apply;
        } else if (promoForLines.scope === "category" && promoForLines.categoryId === d.categoryId) {
          const applyVal = promoForLines.type === "percent" ? (line * clamp(promoForLines.value as number, 0, 100)) / 100 : Math.min(line, Math.max(0, promoForLines.value as number));
          discountedLineTotal = line - applyVal;
        }
      }
      return { id: d.id, name: d.name, qty: d.qty, unitPrice: d.unitPrice, lineTotal: line, discountedLineTotal };
    });
    return {
      items,
      clientInfo: { ...(tmp.clientInfo as any) },
      type: tmp.type as any,
      address: (tmp.address as string | undefined) ?? undefined,
      payment_method: tmp.payment_method as any,
      subtotal,
      discountTotal,
      deliveryFee,
      total,
      promocode: promoCode,
      pointsEarned,
      redeemApplied,
      loyaltyBalance,
    } as any;
  },
});

export const confirmOrder = mutation({
  args: { clientId: v.id("clients") },
  returns: v.union(v.object({ ok: v.boolean(), orderId: v.id("orders") }), v.object({ ok: v.boolean(), error: v.string() })),
  handler: async (ctx, args) => {
    const tmp = await ctx.db.query("orders_temp").withIndex("by_client", (q) => q.eq("clientId", args.clientId)).unique();
    if (!tmp) return { ok: false as const, error: "Черновик заказа не найден" } as any;
    const preview = await ctx.runQuery(api.orders.getPreview, { clientId: args.clientId }) as any;
    const positions = (tmp.positions as Array<any>) || [];
    const items = [] as Array<any>;
    for (const p of positions) {
      const it = await ctx.db.get(p.menuPositionId) as Doc<"menuPositions"> | null;
      if (!it) continue;
      const unit = (it.discountPrice ?? it.price) as number;
      items.push({ menuPositionId: p.menuPositionId, quantity: p.quantity, comment: p.comment, unitPrice: unit, prepared: false });
    }
    const now = Date.now();
    const pointsEarned = Math.max(0, Math.floor((preview?.pointsEarned as number | undefined) ?? 0));
    const redeemApplied = Math.max(0, Math.floor((preview?.redeemApplied as number | undefined) ?? 0));
    const orderId = await ctx.db.insert("orders", {
      clientId: args.clientId,
      status: "backlog",
      type: (tmp.type as OrderType | undefined) ?? "restaurant",
      clientInfo: { name: (preview?.clientInfo?.name as string) || "", phone: (preview?.clientInfo?.phone as string) || "" },
      positions: items,
      address: (tmp.type === "delivery" ? (preview?.address as string | undefined) ?? undefined : undefined),
      subtotal: preview?.subtotal ?? 0,
      discountTotal: preview?.discountTotal ?? 0,
      deliveryFee: preview?.deliveryFee ?? 0,
      total: preview?.total ?? 0,
      payment_method: (preview?.payment_method as PaymentMethod | undefined) ?? "cash",
      is_paid: false,
      promocode: (preview?.promocode as string | undefined) ?? undefined,
      pointsEarned,
      pointsRedeemed: redeemApplied,
      createdAt: now,
      updatedAt: now,
    });

    // Баллы лояльности: списание и начисление
    const client = await ctx.db.get(args.clientId);
    let balance = (client?.loyaltyPoints as number | undefined) ?? 0;
    if (redeemApplied > 0) {
      balance = Math.max(0, balance - redeemApplied);
      await ctx.db.insert("loyaltyTransactions", {
        clientId: args.clientId,
        orderId,
        delta: -redeemApplied,
        reason: "redeem" as const,
        balanceAfter: balance,
        comment: `Списание за заказ`,
        createdAt: now,
      });
    }
    // Начисление баллов выполняется при завершении заказа (completeReady), не сейчас.
    await ctx.db.patch(args.clientId, { loyaltyPoints: balance, cart: [] });
    await ctx.db.delete(tmp._id as Id<"orders_temp">);
    return { ok: true as const, orderId } as any;
  },
});

// Уведомление клиента: in-app (всегда) + Web Push (если есть подписка).
export const notifyClient = action({
  args: { clientId: v.id("clients"), message: v.string(), title: v.optional(v.string()), url: v.optional(v.string()) },
  returns: v.object({ ok: v.boolean(), error: v.optional(v.string()) }),
  handler: async (ctx, args): Promise<{ ok: boolean; error?: string }> => {
    const title = args.title || "Кафе Ермак";
    // 1) Всегда сохраняем in-app уведомление
    try {
      await ctx.runMutation(internal.notifications.createInternal, {
        clientId: args.clientId,
        title,
        body: args.message,
        url: args.url,
      });
    } catch (e: any) {
      console.error(`[notifyClient] in-app save failed`, { error: e?.message });
    }
    // 2) Пытаемся отправить Web Push
    try {
      const res = await ctx.runAction(internal.push.sendWebPush, {
        clientId: args.clientId,
        message: args.message,
        title,
        url: args.url,
      });
      return { ok: (res?.sent ?? 0) >= 0 };
    } catch (e: any) {
      console.error(`[notifyClient] push exception`, { error: e?.message });
      // in-app уже сохранён — считаем доставку успешной
      return { ok: true, error: e?.message };
    }
  },
});

// Accept order -> status pending and notify; назначаем цех (workshop)
export const acceptOrder = mutation({
  args: { orderId: v.id("orders"), estimateMinutes: v.number(), workshopId: v.optional(v.id("workshops")) },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    const now = Date.now();
    const mins = Math.max(0, Math.floor(args.estimateMinutes));
    const due = now + mins * 60 * 1000;
    await ctx.db.patch(args.orderId, { status: "pending", estimateMinutes: mins, acceptedAt: now, dueAt: due, workshopId: args.workshopId, updatedAt: now });

    // Вычитаем продукты со склада на основании ингредиентов позиций
    for (const p of (order.positions as any[])) {
      const mp = await ctx.db.get(p.menuPositionId as Id<"menuPositions">);
      if (!mp) continue;
      const dishName = (mp.name as string) || "Блюдо";
      const ingredients = ((mp as any).ingredients as Array<{ productId: Id<"products">; quantity: number }> | undefined) || [];
      for (const ing of ingredients) {
        const usedQty = (ing.quantity || 0) * (p.quantity || 0);
        if (usedQty <= 0) continue;
        const prod = await ctx.db.get(ing.productId);
        if (!prod) continue;
        // FIFO списание партий из productEstimates: от самых старых к более свежим
        let remain = usedQty;
        const batches = await ctx.db
          .query("productEstimates")
          .withIndex("by_product_and_expires", (q) => q.eq("productId", ing.productId))
          .order("asc")
          .collect();
        for (const b of batches) {
          if (remain <= 0) break;
          const qty = ((b as any).estimate as number) ?? ((b.quantity as number) || 0);
          if (qty <= 0) continue;
          const take = Math.min(qty, remain);
          const left = qty - take;
          remain -= take;
          if (left > 0) {
            await ctx.db.patch(b._id as Id<"productEstimates">, { estimate: left, updatedAt: now });
          } else {
            await ctx.db.delete(b._id as Id<"productEstimates">);
          }
        }
        const used = usedQty - Math.max(0, remain);
        const newEstimate = Math.max(0, (prod.estimate as number) - used);
        await ctx.db.patch(ing.productId, { estimate: newEstimate, updatedAt: now });
        const unit = (prod as any).unit as string | undefined;
        const comment = `Заказ №${String(order._id)}, ${dishName}, x${usedQty} ${unit ?? "unit"}.`;
        await ctx.db.insert("productTransactions", {
          date: now,
          productId: ing.productId,
          quantity: usedQty,
          type: "minus",
          estimate: newEstimate,
          comment,
          createdAt: now,
        } as any);
      }
    }
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const parts = [] as string[];
    if (h) parts.push(`${h} ч`);
    if (m || !h) parts.push(`${m} м`);
    const text = `Ваш заказ принят! Примерное время ожидания заказа: ${parts.join(" ")}. По готовности бот вам сообщит.`;
    await ctx.scheduler.runAfter(0, api.orders.notifyClient, { clientId: order.clientId as Id<"clients">, message: text } as any);
    return { ok: true } as any;
  },
});

// Сменить цех заказа (можно пока заказ не передан в доставку)
export const changeWorkshop = mutation({
  args: { orderId: v.id("orders"), workshopId: v.id("workshops") },
  returns: v.object({ ok: v.boolean(), error: v.optional(v.string()) }),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return { ok: false, error: "Заказ не найден" };
    const locked = ["delivery", "delivery_pending", "completed", "cancelled", "refund"];
    if (locked.includes(order.status as string)) {
      return { ok: false, error: "Заказ уже передан в доставку или завершён" };
    }
    await ctx.db.patch(args.orderId, { workshopId: args.workshopId, updatedAt: Date.now() });
    return { ok: true };
  },
});

// Пометить готовность позиций в pending заказе
export const setPreparedPositions = mutation({
  args: { orderId: v.id("orders"), prepared: v.array(v.object({ id: v.id("menuPositions"), prepared: v.boolean() })) },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    const map = new Map<string, boolean>();
    for (const r of args.prepared) map.set(String(r.id), r.prepared);
    const next = (order.positions as any[]).map((p) => ({ ...p, prepared: map.get(String(p.menuPositionId)) ?? (p.prepared ?? false) }));
    await ctx.db.patch(args.orderId, { positions: next, updatedAt: Date.now() });
    return { ok: true } as any;
  },
});

// Выдать заказ - перевод в ready или delivery
export const completePending = mutation({
  args: { orderId: v.id("orders") },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    const isDelivery = (order.type as any) === "delivery";
    const now = Date.now();
    if (isDelivery) {
      await ctx.db.patch(args.orderId, { status: "delivery", readyAt: now, updatedAt: now });
      const text = `Ваш заказ передан в доставку.`;
      await ctx.scheduler.runAfter(0, api.orders.notifyClient, { clientId: order.clientId as Id<"clients">, message: text } as any);
    } else {
      await ctx.db.patch(args.orderId, { status: "ready", readyAt: now, updatedAt: now });
      const text = `Ваш заказ готов! Ждём вас в кафе Ермак.`;
      await ctx.scheduler.runAfter(0, api.orders.notifyClient, { clientId: order.clientId as Id<"clients">, message: text } as any);
    }
    return { ok: true } as any;
  },
});

// Завершить заказ (выдан) -> completed и прибавить к выручке дня
export const completeReady = mutation({
  args: { orderId: v.id("orders") },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    const now = Date.now();
    await ctx.db.patch(args.orderId, { status: "completed", updatedAt: now });
    // Денежная транзакция по способу оплаты
    const pay = (order.payment_method as any) || "cash"; // cash|card|online (online считаем как card)
    const bankName = pay === "cash" ? "cash" : "card";
    // resolve bank
    let bank = await ctx.db.query("banks").withIndex("by_name", (q) => q.eq("name", bankName)).unique();
    if (!bank) {
      const id = await ctx.db.insert("banks", { name: bankName as any, estimate: 0, createdAt: now, updatedAt: now } as any);
      bank = await ctx.db.get(id);
    }
    const nextEstimate = (bank!.estimate as number) + (order.total as number);
    await ctx.db.patch(bank!._id as any, { estimate: nextEstimate, updatedAt: now });
    await ctx.db.insert("moneyTransactions", {
      date: now,
      bankId: bank!._id as any,
      amount: order.total as number,
      type: "plus",
      reason: "sale",
      estimate: nextEstimate,
      comment: `Оплата заказа ${String(order._id)}`,
      createdAt: now,
    } as any);
    const startOfDay = new Date(now); startOfDay.setHours(0,0,0,0);
    let row = await ctx.db.query("dailyRevenue").withIndex("by_date", (q) => q.eq("date", +startOfDay)).unique();
    if (row) {
      await ctx.db.patch(row._id as Id<"dailyRevenue">, { profit: (row.profit as number) + (order.total as number), updatedAt: now });
    } else {
      await ctx.db.insert("dailyRevenue", { date: +startOfDay, profit: order.total as number, updatedAt: now } as any);
    }
    // Начисление баллов лояльности при завершении заказа (один раз)
    const pointsEarned = Math.max(0, Math.floor(((order as any).pointsEarned as number | undefined) ?? 0));
    if (pointsEarned > 0 && !((order as any).pointsAccrued as boolean | undefined)) {
      const client = await ctx.db.get(order.clientId as Id<"clients">);
      const balance = ((client?.loyaltyPoints as number | undefined) ?? 0) + pointsEarned;
      await ctx.db.patch(order.clientId as Id<"clients">, { loyaltyPoints: balance });
      await ctx.db.insert("loyaltyTransactions", {
        clientId: order.clientId as Id<"clients">,
        orderId: args.orderId,
        delta: pointsEarned,
        reason: "accrue" as const,
        balanceAfter: balance,
        comment: `Начисление за заказ`,
        createdAt: now,
      });
      await ctx.db.patch(args.orderId, { pointsAccrued: true });
      await ctx.scheduler.runAfter(0, api.orders.notifyClient, {
        clientId: order.clientId as Id<"clients">,
        title: "Баллы начислены",
        message: `Начислили тебе ${pointsEarned} баллов за заказ! Текущий баланс: ${balance}.`,
        url: "/profile",
      } as any);
    } else {
      await ctx.scheduler.runAfter(0, api.orders.notifyClient, {
        clientId: order.clientId as Id<"clients">,
        message: "Спасибо за заказ, приходите к нам ещё!",
      } as any);
    }
    return { ok: true } as any;
  },
});

// Открыть смену: назначить barmen_id в dailyRevenue на сегодня
export const openShift = mutation({
  args: { userId: v.id("users") },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const startOfDay = new Date(now); startOfDay.setHours(0,0,0,0);
    let row = await ctx.db.query("dailyRevenue").withIndex("by_date", (q) => q.eq("date", +startOfDay)).unique();
    if (row) {
      await ctx.db.patch(row._id as Id<"dailyRevenue">, { barmen_id: args.userId, updatedAt: now } as any);
    } else {
      await ctx.db.insert("dailyRevenue", { date: +startOfDay, profit: 0, barmen_id: args.userId, updatedAt: now } as any);
    }
    return { ok: true } as any;
  },
});

// Reject order -> status cancelled, return positions to temp draft, notify
export const rejectOrder = mutation({
  args: { orderId: v.id("orders"), refusedPositionIds: v.array(v.id("menuPositions")) },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    await ctx.db.patch(args.orderId, { status: "cancelled", updatedAt: Date.now() });
    // Upsert temp draft
    const existing = await ctx.db.query("orders_temp").withIndex("by_client", (q) => q.eq("clientId", order.clientId as Id<"clients">)).unique();
    const now = Date.now();
    const positions = (order.positions as any[]).map((p) => ({ menuPositionId: p.menuPositionId, quantity: p.quantity, comment: p.comment }));
    if (existing) {
      await ctx.db.patch(existing._id as Id<"orders_temp">, { positions, step: "cart_review", updatedAt: now });
    } else {
      await ctx.db.insert("orders_temp", { clientId: order.clientId as Id<"clients">, positions, createdAt: now, updatedAt: now, step: "cart_review" } as any);
    }
    // Build refused list for message
    const refusedNames: string[] = [];
    for (const p of order.positions as any[]) {
      if (args.refusedPositionIds.find((id) => String(id) === String(p.menuPositionId))) {
        const mp = await ctx.db.get(p.menuPositionId as Id<"menuPositions">);
        if (mp?.name) refusedNames.push(mp.name as string);
      }
    }
    const text = `К сожалению, некоторые позиции не получится заказать: ${refusedNames.join(", ")}. Отредактируйте свой заказ в корзине и попробуйте снова!`;
    await ctx.scheduler.runAfter(0, api.orders.notifyClient, { clientId: order.clientId as Id<"clients">, message: text } as any);
    return { ok: true } as any;
  },
});

// Заказы по дате, сгруппированные по статусам — для канбан-доски
export const listByDate = query({
  args: { from: v.number(), to: v.number() },
  returns: v.object({
    backlog: v.array(v.object({
      _id: v.id("orders"),
      clientId: v.id("clients"),
      status: v.union(
        v.literal("backlog"), v.literal("accepted"), v.literal("pending"), v.literal("ready"), v.literal("delivery"), v.literal("completed"), v.literal("cancelled"), v.literal("refund")
      ),
      type: v.union(v.literal("delivery"), v.literal("restaurant"), v.literal("self-service")),
      clientInfo: v.object({ name: v.string(), phone: v.string() }),
      positions: v.array(v.object({
        id: v.id("menuPositions"),
        name: v.string(),
        quantity: v.number(),
        unitPrice: v.number(),
        lineTotal: v.number(),
        photo: v.optional(v.string()),
        categoryId: v.optional(v.id("categories")),
        comment: v.optional(v.string()),
        prepared: v.optional(v.boolean()),
      })),
      address: v.optional(v.string()),
      subtotal: v.number(),
      discountTotal: v.number(),
      deliveryFee: v.number(),
      total: v.number(),
      payment_method: v.union(v.literal("cash"), v.literal("card"), v.literal("online")),
      is_paid: v.boolean(),
      promocode: v.optional(v.string()),
      estimateMinutes: v.optional(v.number()),
      acceptedAt: v.optional(v.number()),
      dueAt: v.optional(v.number()),
      readyAt: v.optional(v.number()),
      courierId: v.optional(v.id("users")),
      deliveryAcceptedAt: v.optional(v.number()),
      deliveryDue: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
      pointsRedeemed: v.optional(v.number()),
      pointsEarned: v.optional(v.number()),
      workshopId: v.optional(v.id("workshops")),
      workshopName: v.optional(v.string()),
      delivery: v.optional(v.object({ address: v.string() })),
      client: v.object({ name: v.string(), phone: v.string() }),
    })),
    pending: v.array(v.object({
      _id: v.id("orders"),
      clientId: v.id("clients"),
      status: v.union(
        v.literal("backlog"), v.literal("accepted"), v.literal("pending"), v.literal("ready"), v.literal("delivery"), v.literal("completed"), v.literal("cancelled"), v.literal("refund")
      ),
      type: v.union(v.literal("delivery"), v.literal("restaurant"), v.literal("self-service")),
      clientInfo: v.object({ name: v.string(), phone: v.string() }),
      positions: v.array(v.object({
        id: v.id("menuPositions"),
        name: v.string(),
        quantity: v.number(),
        unitPrice: v.number(),
        lineTotal: v.number(),
        photo: v.optional(v.string()),
        categoryId: v.optional(v.id("categories")),
        comment: v.optional(v.string()),
        prepared: v.optional(v.boolean()),
      })),
      address: v.optional(v.string()),
      subtotal: v.number(),
      discountTotal: v.number(),
      deliveryFee: v.number(),
      total: v.number(),
      payment_method: v.union(v.literal("cash"), v.literal("card"), v.literal("online")),
      is_paid: v.boolean(),
      promocode: v.optional(v.string()),
      estimateMinutes: v.optional(v.number()),
      acceptedAt: v.optional(v.number()),
      dueAt: v.optional(v.number()),
      readyAt: v.optional(v.number()),
      courierId: v.optional(v.id("users")),
      deliveryAcceptedAt: v.optional(v.number()),
      deliveryDue: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
      pointsRedeemed: v.optional(v.number()),
      pointsEarned: v.optional(v.number()),
      workshopId: v.optional(v.id("workshops")),
      workshopName: v.optional(v.string()),
      delivery: v.optional(v.object({ address: v.string() })),
      client: v.object({ name: v.string(), phone: v.string() }),
    })),
    ready: v.array(v.object({
      _id: v.id("orders"),
      clientId: v.id("clients"),
      status: v.union(
        v.literal("backlog"), v.literal("accepted"), v.literal("pending"), v.literal("ready"), v.literal("delivery"), v.literal("completed"), v.literal("cancelled"), v.literal("refund")
      ),
      type: v.union(v.literal("delivery"), v.literal("restaurant"), v.literal("self-service")),
      clientInfo: v.object({ name: v.string(), phone: v.string() }),
      positions: v.array(v.object({
        id: v.id("menuPositions"),
        name: v.string(),
        quantity: v.number(),
        unitPrice: v.number(),
        lineTotal: v.number(),
        photo: v.optional(v.string()),
        categoryId: v.optional(v.id("categories")),
        comment: v.optional(v.string()),
        prepared: v.optional(v.boolean()),
      })),
      address: v.optional(v.string()),
      subtotal: v.number(),
      discountTotal: v.number(),
      deliveryFee: v.number(),
      total: v.number(),
      payment_method: v.union(v.literal("cash"), v.literal("card"), v.literal("online")),
      is_paid: v.boolean(),
      promocode: v.optional(v.string()),
      estimateMinutes: v.optional(v.number()),
      acceptedAt: v.optional(v.number()),
      dueAt: v.optional(v.number()),
      readyAt: v.optional(v.number()),
      courierId: v.optional(v.id("users")),
      deliveryAcceptedAt: v.optional(v.number()),
      deliveryDue: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
      pointsRedeemed: v.optional(v.number()),
      pointsEarned: v.optional(v.number()),
      workshopId: v.optional(v.id("workshops")),
      workshopName: v.optional(v.string()),
      delivery: v.optional(v.object({ address: v.string() })),
      client: v.object({ name: v.string(), phone: v.string() }),
    })),
    delivery: v.array(v.object({
      _id: v.id("orders"),
      clientId: v.id("clients"),
      status: v.union(
        v.literal("backlog"), v.literal("accepted"), v.literal("pending"), v.literal("ready"), v.literal("delivery"), v.literal("completed"), v.literal("cancelled"), v.literal("refund")
      ),
      type: v.union(v.literal("delivery"), v.literal("restaurant"), v.literal("self-service")),
      clientInfo: v.object({ name: v.string(), phone: v.string() }),
      positions: v.array(v.object({
        id: v.id("menuPositions"),
        name: v.string(),
        quantity: v.number(),
        unitPrice: v.number(),
        lineTotal: v.number(),
        photo: v.optional(v.string()),
        categoryId: v.optional(v.id("categories")),
        comment: v.optional(v.string()),
        prepared: v.optional(v.boolean()),
      })),
      address: v.optional(v.string()),
      subtotal: v.number(),
      discountTotal: v.number(),
      deliveryFee: v.number(),
      total: v.number(),
      payment_method: v.union(v.literal("cash"), v.literal("card"), v.literal("online")),
      is_paid: v.boolean(),
      promocode: v.optional(v.string()),
      estimateMinutes: v.optional(v.number()),
      acceptedAt: v.optional(v.number()),
      dueAt: v.optional(v.number()),
      readyAt: v.optional(v.number()),
      courierId: v.optional(v.id("users")),
      deliveryAcceptedAt: v.optional(v.number()),
      deliveryDue: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
      pointsRedeemed: v.optional(v.number()),
      pointsEarned: v.optional(v.number()),
      workshopId: v.optional(v.id("workshops")),
      workshopName: v.optional(v.string()),
      delivery: v.optional(v.object({ address: v.string() })),
      client: v.object({ name: v.string(), phone: v.string() }),
    })),
    delivery_pending: v.array(v.object({
      _id: v.id("orders"),
      clientId: v.id("clients"),
      status: v.union(
        v.literal("backlog"), v.literal("accepted"), v.literal("pending"), v.literal("ready"), v.literal("delivery"), v.literal("delivery_pending"), v.literal("completed"), v.literal("cancelled"), v.literal("refund")
      ),
      type: v.union(v.literal("delivery"), v.literal("restaurant"), v.literal("self-service")),
      clientInfo: v.object({ name: v.string(), phone: v.string() }),
      positions: v.array(v.object({
        id: v.id("menuPositions"),
        name: v.string(),
        quantity: v.number(),
        unitPrice: v.number(),
        lineTotal: v.number(),
        photo: v.optional(v.string()),
        categoryId: v.optional(v.id("categories")),
        comment: v.optional(v.string()),
        prepared: v.optional(v.boolean()),
      })),
      address: v.optional(v.string()),
      subtotal: v.number(),
      discountTotal: v.number(),
      deliveryFee: v.number(),
      total: v.number(),
      payment_method: v.union(v.literal("cash"), v.literal("card"), v.literal("online")),
      is_paid: v.boolean(),
      promocode: v.optional(v.string()),
      estimateMinutes: v.optional(v.number()),
      acceptedAt: v.optional(v.number()),
      dueAt: v.optional(v.number()),
      readyAt: v.optional(v.number()),
      courierId: v.optional(v.id("users")),
      deliveryAcceptedAt: v.optional(v.number()),
      deliveryDue: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
      pointsRedeemed: v.optional(v.number()),
      pointsEarned: v.optional(v.number()),
      workshopId: v.optional(v.id("workshops")),
      workshopName: v.optional(v.string()),
      delivery: v.optional(v.object({ address: v.string() })),
      client: v.object({ name: v.string(), phone: v.string() }),
    })),
    completed: v.array(v.object({
      _id: v.id("orders"),
      clientId: v.id("clients"),
      status: v.union(
        v.literal("backlog"), v.literal("accepted"), v.literal("pending"), v.literal("ready"), v.literal("delivery"), v.literal("completed"), v.literal("cancelled"), v.literal("refund")
      ),
      type: v.union(v.literal("delivery"), v.literal("restaurant"), v.literal("self-service")),
      clientInfo: v.object({ name: v.string(), phone: v.string() }),
      positions: v.array(v.object({
        id: v.id("menuPositions"),
        name: v.string(),
        quantity: v.number(),
        unitPrice: v.number(),
        lineTotal: v.number(),
        photo: v.optional(v.string()),
        categoryId: v.optional(v.id("categories")),
        comment: v.optional(v.string()),
        prepared: v.optional(v.boolean()),
      })),
      address: v.optional(v.string()),
      subtotal: v.number(),
      discountTotal: v.number(),
      deliveryFee: v.number(),
      total: v.number(),
      payment_method: v.union(v.literal("cash"), v.literal("card"), v.literal("online")),
      is_paid: v.boolean(),
      promocode: v.optional(v.string()),
      estimateMinutes: v.optional(v.number()),
      acceptedAt: v.optional(v.number()),
      dueAt: v.optional(v.number()),
      readyAt: v.optional(v.number()),
      courierId: v.optional(v.id("users")),
      deliveryAcceptedAt: v.optional(v.number()),
      deliveryDue: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
      pointsRedeemed: v.optional(v.number()),
      pointsEarned: v.optional(v.number()),
      workshopId: v.optional(v.id("workshops")),
      workshopName: v.optional(v.string()),
      delivery: v.optional(v.object({ address: v.string() })),
      client: v.object({ name: v.string(), phone: v.string() }),
    })),
  }),
  handler: async (ctx, args) => {
    async function loadForStatus(status: "backlog" | "pending" | "ready" | "delivery" | "delivery_pending" | "completed") {
      const rows = await ctx.db
        .query("orders")
        .withIndex("by_status_and_created", (q) => q
          .eq("status", status)
          .gte("createdAt", args.from)
          .lte("createdAt", args.to)
        )
        .order("asc")
        .collect();
      // Для pending сортируем по dueAt (чем меньше осталось, тем выше)
      if (status === "pending") {
        rows.sort((a: any, b: any) => {
          const ad = (a.dueAt as number | undefined) ?? Number.POSITIVE_INFINITY;
          const bd = (b.dueAt as number | undefined) ?? Number.POSITIVE_INFINITY;
          return ad - bd;
        });
      }
      const enriched: any[] = [];
      for (const o of rows) {
        const pos: any[] = [];
        for (const p of (o.positions as any[])) {
          const mp = await ctx.db.get(p.menuPositionId as Id<"menuPositions">);
          pos.push({
            id: p.menuPositionId as Id<"menuPositions">,
            name: (mp?.name as string) || "",
            quantity: p.quantity as number,
            unitPrice: p.unitPrice as number,
            lineTotal: (p.unitPrice as number) * (p.quantity as number),
            photo: (mp?.photo as string | undefined) ?? undefined,
            categoryId: (mp?.categoryId as Id<"categories"> | undefined) ?? undefined,
            comment: (p.comment as string | undefined) ?? undefined,
            prepared: (p as any).prepared ?? false,
          });
        }
        let workshopName: string | undefined = undefined;
        if ((o as any).workshopId) {
          const w = await ctx.db.get((o as any).workshopId as Id<"workshops">);
          workshopName = (w?.name as string | undefined) ?? undefined;
        }
        enriched.push({
          _id: o._id,
          clientId: o.clientId as Id<"clients">,
          status: o.status as any,
          type: o.type as any,
          clientInfo: o.clientInfo as any,
          positions: pos,
          address: (o.address as string | undefined) ?? undefined,
          subtotal: o.subtotal as number,
          discountTotal: o.discountTotal as number,
          deliveryFee: o.deliveryFee as number,
          total: o.total as number,
          payment_method: o.payment_method as any,
          is_paid: o.is_paid as boolean,
          promocode: (o.promocode as string | undefined) ?? undefined,
          estimateMinutes: (o as any).estimateMinutes as number | undefined,
          acceptedAt: (o as any).acceptedAt as number | undefined,
          dueAt: (o as any).dueAt as number | undefined,
          readyAt: (o as any).readyAt as number | undefined,
          courierId: (o as any).courierId as Id<"users"> | undefined,
          deliveryAcceptedAt: (o as any).deliveryAcceptedAt as number | undefined,
          deliveryDue: (o as any).deliveryDue as number | undefined,
          createdAt: o.createdAt as number,
          updatedAt: o.updatedAt as number,
          pointsRedeemed: (o as any).pointsRedeemed as number | undefined,
          pointsEarned: (o as any).pointsEarned as number | undefined,
          workshopId: (o as any).workshopId as Id<"workshops"> | undefined,
          workshopName: workshopName,
          delivery: o.type === "delivery" && o.address ? { address: o.address as string } : undefined,
          client: { name: (o.clientInfo as any).name as string, phone: (o.clientInfo as any).phone as string },
        });
      }
      return enriched;
    }
                const [backlog, pending, ready, delivery, delivery_pending, completed] = await Promise.all([
      loadForStatus("backlog"),
      loadForStatus("pending"),
      loadForStatus("ready"),
      loadForStatus("delivery"),
                  loadForStatus("delivery_pending"),
      loadForStatus("completed"),
    ]);
                return { backlog, pending, ready, delivery, delivery_pending, completed } as any;
  },
});


// Детали заказа с позициями и связанными транзакциями
export const getDetails = query({
  args: { orderId: v.id("orders") },
  returns: v.union(
    v.object({
      _id: v.id("orders"),
      status: v.union(
        v.literal("backlog"), v.literal("accepted"), v.literal("pending"), v.literal("ready"), v.literal("delivery"), v.literal("delivery_pending"), v.literal("completed"), v.literal("cancelled"), v.literal("refund")
      ),
      type: v.union(v.literal("delivery"), v.literal("restaurant"), v.literal("self-service")),
      client: v.object({ name: v.string(), phone: v.string() }),
      address: v.optional(v.string()),
      subtotal: v.number(),
      discountTotal: v.number(),
      deliveryFee: v.number(),
      total: v.number(),
      payment_method: v.union(v.literal("cash"), v.literal("card"), v.literal("online")),
      is_paid: v.boolean(),
      promocode: v.optional(v.string()),
      estimateMinutes: v.optional(v.number()),
      acceptedAt: v.optional(v.number()),
      dueAt: v.optional(v.number()),
      readyAt: v.optional(v.number()),
      courierId: v.optional(v.id("users")),
      deliveryAcceptedAt: v.optional(v.number()),
      deliveryDue: v.optional(v.number()),
      pointsRedeemed: v.optional(v.number()),
      pointsEarned: v.optional(v.number()),
      workshopId: v.optional(v.id("workshops")),
      workshopName: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
      positions: v.array(v.object({
        id: v.id("menuPositions"),
        name: v.string(),
        quantity: v.number(),
        unitPrice: v.number(),
        lineTotal: v.number(),
        prepared: v.optional(v.boolean()),
      })),
      moneyTransactions: v.array(v.object({
        _id: v.id("moneyTransactions"),
        date: v.number(),
        bankName: v.union(v.literal("cash"), v.literal("card")),
        amount: v.number(),
        type: v.union(v.literal("plus"), v.literal("minus")),
        reason: v.union(v.literal("sale"), v.literal("direct"), v.literal("productBuy")),
        estimate: v.number(),
        comment: v.optional(v.string()),
      })),
      productTransactions: v.array(v.object({
        _id: v.id("productTransactions"),
        date: v.number(),
        productId: v.id("products"),
        productName: v.string(),
        quantity: v.number(),
        type: v.union(v.literal("plus"), v.literal("minus")),
        estimate: v.number(),
        comment: v.optional(v.string()),
      })),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const o = await ctx.db.get(args.orderId);
    if (!o) return null;
    let workshopName: string | undefined = undefined;
    if ((o as any).workshopId) {
      const w = await ctx.db.get((o as any).workshopId as Id<"workshops">);
      workshopName = (w?.name as string | undefined) ?? undefined;
    }
    // Enrich positions
    const positions: Array<{ id: Id<"menuPositions">; name: string; quantity: number; unitPrice: number; lineTotal: number; prepared?: boolean }> = [];
    for (const p of (o.positions as any[])) {
      const mp = await ctx.db.get(p.menuPositionId as Id<"menuPositions">);
      const unit = p.unitPrice as number;
      const qty = p.quantity as number;
      positions.push({
        id: p.menuPositionId as Id<"menuPositions">,
        name: (mp?.name as string) || "",
        quantity: qty,
        unitPrice: unit,
        lineTotal: unit * qty,
        prepared: (p as any).prepared ?? false,
      });
    }
    // Load related money transactions within a narrow window
    const start = Math.max(0, (o.createdAt as number) - 5 * 60 * 1000);
    const end = ((o.updatedAt as number) || Date.now()) + 5 * 60 * 1000;
    let moneyTransactions: any[] = [];
    try {
      const txs: any[] = await ctx.runQuery(api.transactions.list, { from: start, to: end });
      const idStr = String(o._id);
      moneyTransactions = txs
        .filter((t) => {
          if (t.reason === "sale") {
            // привязка по комменту "Оплата заказа <id>"
            return typeof t.comment === "string" ? t.comment.includes(idStr) : false;
          }
          return false;
        })
        .map((t) => ({
          _id: t._id,
          date: t.date,
          bankName: t.bankName,
          amount: t.amount,
          type: t.type,
          reason: t.reason,
          estimate: t.estimate,
          comment: t.comment,
        }));
    } catch {}
    // Load related product transactions by date window and comment match
    let productTransactions: any[] = [];
    try {
      const rows = await ctx.db
        .query("productTransactions")
        .withIndex("by_date", (q) => q.gte("date", start).lte("date", end))
        .order("desc")
        .collect();
      const idStr = String(o._id);
      const filtered = rows.filter((r) => typeof (r.comment as any) === "string" && (r.comment as any).includes(idStr));
      const list: any[] = [];
      for (const r of filtered) {
        const prod = await ctx.db.get(r.productId as Id<"products">);
        list.push({
          _id: r._id,
          date: r.date as number,
          productId: r.productId as Id<"products">,
          productName: (prod?.name as string) || "",
          quantity: r.quantity as number,
          type: r.type as any,
          estimate: r.estimate as number,
          comment: (r.comment as string | undefined) ?? undefined,
        });
      }
      productTransactions = list;
    } catch {}

    return {
      _id: o._id,
      status: o.status as any,
      type: o.type as any,
      client: { name: (o.clientInfo as any).name as string, phone: (o.clientInfo as any).phone as string },
      address: (o.address as string | undefined) ?? undefined,
      subtotal: o.subtotal as number,
      discountTotal: o.discountTotal as number,
      deliveryFee: o.deliveryFee as number,
      total: o.total as number,
      payment_method: o.payment_method as any,
      is_paid: o.is_paid as boolean,
      promocode: (o.promocode as string | undefined) ?? undefined,
      estimateMinutes: (o as any).estimateMinutes as number | undefined,
      acceptedAt: (o as any).acceptedAt as number | undefined,
      dueAt: (o as any).dueAt as number | undefined,
      readyAt: (o as any).readyAt as number | undefined,
      courierId: (o as any).courierId as Id<"users"> | undefined,
      deliveryAcceptedAt: (o as any).deliveryAcceptedAt as number | undefined,
      deliveryDue: (o as any).deliveryDue as number | undefined,
      pointsRedeemed: (o as any).pointsRedeemed as number | undefined,
      pointsEarned: (o as any).pointsEarned as number | undefined,
      workshopId: (o as any).workshopId as Id<"workshops"> | undefined,
      workshopName: workshopName,
      createdAt: o.createdAt as number,
      updatedAt: o.updatedAt as number,
      positions,
      moneyTransactions,
      productTransactions,
    } as any;
  },
});

// Список заказов клиента (без обогащения, для истории)
export const listByClient = query({
  args: { clientId: v.id("clients") },
  returns: v.array(v.object({
    _id: v.id("orders"),
    createdAt: v.number(),
    updatedAt: v.number(),
    status: v.union(
      v.literal("backlog"),
      v.literal("accepted"),
      v.literal("pending"),
      v.literal("ready"),
      v.literal("delivery"),
      v.literal("delivery_pending"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("refund")
    ),
    type: v.union(v.literal("delivery"), v.literal("restaurant"), v.literal("self-service")),
    total: v.number(),
  })),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("orders")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .order("desc")
      .collect();
    return rows.map((o) => ({
      _id: o._id,
      createdAt: o.createdAt as number,
      updatedAt: o.updatedAt as number,
      status: o.status as any,
      type: o.type as any,
      total: o.total as number,
    })) as any;
  },
});

