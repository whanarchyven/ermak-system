import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const stats = query({
  args: {},
  returns: v.object({ cash: v.number(), card: v.number() }),
  handler: async (ctx) => {
    const cash = await ctx.db.query("banks").withIndex("by_name", (q) => q.eq("name", "cash")).unique();
    const card = await ctx.db.query("banks").withIndex("by_name", (q) => q.eq("name", "card")).unique();
    return { cash: cash?.estimate ?? 0, card: card?.estimate ?? 0 } as any;
  },
});

export const listBanks = query({
  args: {},
  returns: v.array(v.object({ _id: v.id("banks"), name: v.union(v.literal("cash"), v.literal("card")), estimate: v.number() })),
  handler: async (ctx) => {
    const rows = await ctx.db.query("banks").collect();
    return rows.map((b) => ({ _id: b._id, name: b.name as any, estimate: b.estimate as number })) as any;
  },
});

export const list = query({
  args: { from: v.number(), to: v.number() },
  returns: v.array(v.object({
    _id: v.id("moneyTransactions"), _creationTime: v.number(), date: v.number(),
    bankId: v.id("banks"), bankName: v.union(v.literal("cash"), v.literal("card")),
    amount: v.number(), type: v.union(v.literal("plus"), v.literal("minus")), reason: v.union(v.literal("sale"), v.literal("direct"), v.literal("productBuy")),
    estimate: v.number(), comment: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("moneyTransactions")
      .withIndex("by_date", (q) => q.gte("date", args.from).lte("date", args.to))
      .order("desc")
      .collect();
    const result: any[] = [];
    for (const r of rows) {
      const bank = await ctx.db.get(r.bankId as Id<"banks">);
      result.push({
        _id: r._id,
        _creationTime: r._creationTime,
        date: r.date as number,
        bankId: r.bankId as Id<"banks">,
        bankName: (bank?.name as any) ?? "cash",
        amount: r.amount as number,
        type: r.type as any,
        reason: r.reason as any,
        estimate: r.estimate as number,
        comment: (r.comment as string | undefined) ?? undefined,
      });
    }
    return result as any;
  },
});

export const create = mutation({
  args: { bank: v.union(v.literal("cash"), v.literal("card")), type: v.union(v.literal("plus"), v.literal("minus")), reason: v.union(v.literal("sale"), v.literal("direct"), v.literal("productBuy")), amount: v.number(), comment: v.optional(v.string()) },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    const now = Date.now();
    let bank = await ctx.db.query("banks").withIndex("by_name", (q) => q.eq("name", args.bank)).unique();
    if (!bank) {
      const id = await ctx.db.insert("banks", { name: args.bank, estimate: 0, createdAt: now, updatedAt: now } as any);
      bank = await ctx.db.get(id);
    }
    const sign = args.type === "plus" ? 1 : -1;
    const next = Math.max(0, (bank!.estimate as number) + sign * (args.amount as number));
    await ctx.db.patch(bank!._id as any, { estimate: next, updatedAt: now });
    await ctx.db.insert("moneyTransactions", { date: now, bankId: bank!._id as any, amount: args.amount, type: args.type, reason: args.reason, estimate: next, comment: args.comment, createdAt: now } as any);
    return { ok: true } as any;
  },
});


