import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Создать лог
export const create = mutation({
  args: {
    level: v.union(v.literal("info"), v.literal("warning"), v.literal("error")),
    message: v.string(),
    action: v.string(),
    metadata: v.optional(v.object({
      error: v.optional(v.string()),
      clientId: v.optional(v.id("clients")),
      chatId: v.optional(v.string()),
    })),
  },
  returns: v.id("logs"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("logs", {
      level: args.level,
      message: args.message,
      action: args.action,
      metadata: args.metadata,
      createdAt: Date.now(),
    });
  },
});

// Очистить старые логи с неправильной структурой
export const cleanupOldLogs = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const logs = await ctx.db.query("logs").collect();
    
    for (const log of logs as any[]) {
      // Проверяем, есть ли поле createdAt
      if (!('createdAt' in log)) {
        // Удаляем лог с неправильной структурой
        await ctx.db.delete(log._id);
      }
    }
    
    return null;
  },
});

// Получить логи по уровню
export const getByLevel = query({
  args: {
    level: v.union(v.literal("info"), v.literal("warning"), v.literal("error")),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id("logs"),
    _creationTime: v.number(),
    level: v.union(v.literal("info"), v.literal("warning"), v.literal("error")),
    message: v.string(),
    action: v.string(),
    metadata: v.optional(v.object({
      error: v.optional(v.string()),
      clientId: v.optional(v.id("clients")),
      chatId: v.optional(v.string()),
    })),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const limit = args.limit || 100;
    return await ctx.db
      .query("logs")
      .withIndex("by_level", (q) => q.eq("level", args.level))
      .order("desc")
      .take(limit);
  },
});

// Получить логи по действию
export const getByAction = query({
  args: {
    action: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id("logs"),
    _creationTime: v.number(),
    level: v.union(v.literal("info"), v.literal("warning"), v.literal("error")),
    message: v.string(),
    action: v.string(),
    metadata: v.optional(v.object({
      error: v.optional(v.string()),
      clientId: v.optional(v.id("clients")),
      chatId: v.optional(v.string()),
    })),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const limit = args.limit || 100;
    return await ctx.db
      .query("logs")
      .withIndex("by_action", (q) => q.eq("action", args.action))
      .order("desc")
      .take(limit);
  },
});

// Получить последние логи
export const getRecent = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id("logs"),
    _creationTime: v.number(),
    level: v.union(v.literal("info"), v.literal("warning"), v.literal("error")),
    message: v.string(),
    action: v.string(),
    metadata: v.optional(v.object({
      error: v.optional(v.string()),
      clientId: v.optional(v.id("clients")),
      chatId: v.optional(v.string()),
    })),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    return await ctx.db
      .query("logs")
      .withIndex("by_created_at", (q) => q.gte("createdAt", 0))
      .order("desc")
      .take(limit);
  },
}); 