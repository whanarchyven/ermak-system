import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";

// ===== PRODUCTS =====

export const createProduct = mutation({
  args: {
    name: v.string(),
    unit: v.string(),
    priceBaseQty: v.number(),
    priceForBase: v.number(),
    estimate: v.number(),
    safeEstimate: v.number(),
  },
  returns: v.id("products"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("products", {
      name: args.name,
      unit: args.unit,
      priceBaseQty: args.priceBaseQty,
      priceForBase: args.priceForBase,
      estimate: args.estimate,
      safeEstimate: args.safeEstimate,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

export const updateProduct = mutation({
  args: {
    productId: v.id("products"),
    name: v.string(),
    unit: v.string(),
    priceBaseQty: v.number(),
    priceForBase: v.number(),
    safeEstimate: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.productId, {
      name: args.name,
      unit: args.unit,
      priceBaseQty: args.priceBaseQty,
      priceForBase: args.priceForBase,
      safeEstimate: args.safeEstimate,
      updatedAt: now,
    });
    return null;
  },
});

export const deleteProduct = mutation({
  args: { productId: v.id("products") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Разрешаем удалять продукт; транзакции сохраняем как историю
    await ctx.db.delete(args.productId);
    return null;
  },
});

export const listProducts = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("products"),
      _creationTime: v.number(),
      name: v.string(),
      unit: v.string(),
      priceBaseQty: v.number(),
      priceForBase: v.number(),
      estimate: v.number(),
      safeEstimate: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    const rows = await ctx.db.query("products").order("asc").collect();
    return rows;
  },
});

export const getProduct = query({
  args: { productId: v.id("products") },
  returns: v.union(
    v.object({
      _id: v.id("products"),
      _creationTime: v.number(),
      name: v.string(),
      unit: v.string(),
      priceBaseQty: v.number(),
      priceForBase: v.number(),
      estimate: v.number(),
      safeEstimate: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.productId);
  },
});

// ===== PRODUCT TRANSACTIONS =====

export const adjustEstimate = mutation({
  args: {
    productId: v.id("products"),
    quantity: v.number(),
    type: v.union(v.literal("plus"), v.literal("minus")),
    comment: v.optional(v.string()),
    bank: v.optional(v.union(v.literal("cash"), v.literal("card"))),
    expiresAt: v.optional(v.number()), // для прихода
  },
  returns: v.object({ ok: v.boolean(), estimate: v.number(), error: v.optional(v.string()) }),
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Продукт не найден");

    // ——— FIFO стек партий (productEstimates) ———
    let nextEstimate = product.estimate as number;
    const now = Date.now();
    if (args.type === "plus") {
      // Добавляем партию в стек с expiresAt
      const exp = args.expiresAt ?? now;
      await ctx.db.insert("productEstimates", {
        productId: args.productId,
        quantity: args.quantity,
        estimate: args.quantity,
        expiresAt: exp,
        createdAt: now,
        updatedAt: now,
      } as any);
      nextEstimate = nextEstimate + args.quantity;
    } else {
      // Списание FIFO: идём от самых старых партий (меньший expiresAt)
      let remain = args.quantity;
      const batches = await ctx.db
        .query("productEstimates")
        .withIndex("by_product_and_expires", (q) => q.eq("productId", args.productId))
        .order("asc")
        .collect();
      for (const b of batches) {
        if (remain <= 0) break;
        const qty = (b.estimate as number) ?? (b.quantity as number);
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
      const used = args.quantity - Math.max(0, remain);
      nextEstimate = Math.max(0, nextEstimate - used);
    }

    await ctx.db.patch(args.productId, { estimate: nextEstimate, updatedAt: now });
    await ctx.db.insert("productTransactions", {
      date: now,
      productId: args.productId,
      quantity: args.quantity,
      type: args.type,
      estimate: nextEstimate,
      comment: args.comment,
      createdAt: now,
    });

    // Если пополнение склада (plus) — создаём денежную транзакцию (закупка)
    if (args.type === "plus") {
      // Цена за единицу: priceForBase / priceBaseQty
      const unitPrice = (product.priceForBase as number) / Math.max(1, product.priceBaseQty as number);
      const amount = unitPrice * (args.quantity as number);
      // списываем с выбранной кассы (по умолчанию безнал)
      const bankName = (args.bank as ("cash" | "card" | undefined)) ?? "card";
      let bank = await ctx.db.query("banks").withIndex("by_name", (q) => q.eq("name", bankName)).unique();
      if (!bank) {
        const id = await ctx.db.insert("banks", { name: bankName as any, estimate: 0, createdAt: now, updatedAt: now } as any);
        bank = await ctx.db.get(id);
      }
      const current = bank!.estimate as number;
      if (current < amount) {
        // Недостаточно средств — не создаём денежную транзакцию, возвращаем предупреждение
        return { ok: false as const, estimate: nextEstimate, error: `Недостаточно средств в банке (${bankName}). Требуется ${amount.toFixed(2)} ₽, доступно ${current.toFixed(2)} ₽` } as any;
      }
      const nextMoney = current - amount;
      await ctx.db.patch(bank!._id as any, { estimate: nextMoney, updatedAt: now });
      await ctx.db.insert("moneyTransactions", {
        date: now,
        bankId: bank!._id as any,
        amount,
        type: "minus",
        reason: "productBuy",
        estimate: nextMoney,
        comment: `Закупка: ${product.name} x ${args.quantity} ${product.unit}`,
        createdAt: now,
      } as any);
    }

    return { ok: true as const, estimate: nextEstimate } as any;
  },
});

export const listTransactionsByProduct = query({
  args: { productId: v.id("products") },
  returns: v.array(
    v.object({
      _id: v.id("productTransactions"),
      _creationTime: v.number(),
      date: v.number(),
      productId: v.id("products"),
      quantity: v.number(),
      type: v.union(v.literal("plus"), v.literal("minus")),
      estimate: v.number(),
      comment: v.optional(v.string()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("productTransactions")
      .withIndex("by_product_and_date", (q) => q.eq("productId", args.productId))
      .order("desc")
      .collect();
    return rows;
  },
});

// Партии продукта (стек) по продукту
export const listBatchesByProduct = query({
  args: { productId: v.id("products") },
  returns: v.array(v.object({
    _id: v.id("productEstimates"),
    _creationTime: v.number(),
    productId: v.id("products"),
    quantity: v.number(),
    estimate: v.number(),
    expiresAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("productEstimates")
      .withIndex("by_product_and_expires", (q) => q.eq("productId", args.productId))
      .order("asc")
      .collect();
    return rows as any;
  },
});

// Просрочка по продуктам до даты
export const listExpirySummary = query({
  args: { until: v.number() },
  returns: v.array(v.object({
    productId: v.id("products"),
    productName: v.string(),
    totalExpired: v.number(),
    breakdown: v.array(v.object({
      expiresAt: v.number(),
      quantity: v.number(),
    })),
  })),
  handler: async (ctx, args) => {
    // берём все партии с expiresAt <= until
    const batches = await ctx.db
      .query("productEstimates")
      .withIndex("by_expires", (q) => q.lte("expiresAt", args.until))
      .collect();
    const map = new Map<string, { productId: Id<"products">; items: Array<{ expiresAt: number; quantity: number }> }>();
    for (const b of batches) {
      const key = String(b.productId);
      if (!map.has(key)) map.set(key, { productId: b.productId as Id<"products">, items: [] });
      const qty = ((b as any).estimate as number) ?? (b.quantity as number);
      map.get(key)!.items.push({ expiresAt: b.expiresAt as number, quantity: qty });
    }
    const result: any[] = [];
    for (const { productId, items } of map.values()) {
      const prod = await ctx.db.get(productId);
      const total = items.reduce((a, x) => a + x.quantity, 0);
      result.push({
        productId,
        productName: (prod?.name as string) || "",
        totalExpired: total,
        breakdown: items.sort((a, b) => a.expiresAt - b.expiresAt),
      });
    }
    return result as any;
  },
});


