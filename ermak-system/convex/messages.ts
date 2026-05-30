import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Сохранить сообщение
export const save = mutation({
  args: {
    telegramMessageId: v.string(),
    chatId: v.string(),
    clientId: v.id("clients"),
    text: v.optional(v.string()),
    type: v.union(v.literal("text"), v.literal("photo"), v.literal("document"), v.literal("voice"), v.literal("video")),
    isFromBot: v.boolean(),
    metadata: v.optional(v.object({
      messageType: v.optional(v.string()),
      hasPhoto: v.optional(v.boolean()),
      hasDocument: v.optional(v.boolean()),
      hasVoice: v.optional(v.boolean()),
      hasVideo: v.optional(v.boolean()),
    })),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", {
      telegramMessageId: args.telegramMessageId,
      chatId: args.chatId,
      clientId: args.clientId,
      text: args.text,
      type: args.type,
      isFromBot: args.isFromBot,
      metadata: args.metadata,
      createdAt: Date.now(),
    });
  },
});

// Получить сообщения клиента
export const getByClient = query({
  args: {
    clientId: v.id("clients"),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id("messages"),
    _creationTime: v.number(),
    telegramMessageId: v.string(),
    chatId: v.string(),
    clientId: v.id("clients"),
    text: v.optional(v.string()),
    type: v.union(v.literal("text"), v.literal("photo"), v.literal("document"), v.literal("voice"), v.literal("video")),
    isFromBot: v.boolean(),
    metadata: v.optional(v.object({
      messageType: v.optional(v.string()),
      hasPhoto: v.optional(v.boolean()),
      hasDocument: v.optional(v.boolean()),
      hasVoice: v.optional(v.boolean()),
      hasVideo: v.optional(v.boolean()),
    })),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    return await ctx.db
      .query("messages")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .order("desc")
      .take(limit);
  },
});

// Получить статистику сообщений
export const getStats = query({
  args: {
    clientId: v.optional(v.id("clients")),
    timeRange: v.optional(v.union(v.literal("day"), v.literal("week"), v.literal("month"))),
  },
  returns: v.object({
    total: v.number(),
    fromUsers: v.number(),
    fromBot: v.number(),
    byType: v.object({
      text: v.number(),
      photo: v.number(),
      document: v.number(),
      voice: v.number(),
      video: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    let messages;
    
    // Фильтр по клиенту
    if (args.clientId) {
      messages = await ctx.db
        .query("messages")
        .withIndex("by_client", (q) => q.eq("clientId", args.clientId!))
        .collect();
    } else {
      messages = await ctx.db.query("messages").collect();
    }
    
    // Фильтр по времени
    if (args.timeRange) {
      const now = Date.now();
      let timeAgo: number;
      
      switch (args.timeRange) {
        case "day":
          timeAgo = now - 24 * 60 * 60 * 1000;
          break;
        case "week":
          timeAgo = now - 7 * 24 * 60 * 60 * 1000;
          break;
        case "month":
          timeAgo = now - 30 * 24 * 60 * 60 * 1000;
          break;
        default:
          timeAgo = 0;
      }
      
      messages = messages.filter(m => m.createdAt >= timeAgo);
    }
    
    const total = messages.length;
    const fromUsers = messages.filter(m => !m.isFromBot).length;
    const fromBot = messages.filter(m => m.isFromBot).length;
    
    const byType = {
      text: messages.filter(m => m.type === "text").length,
      photo: messages.filter(m => m.type === "photo").length,
      document: messages.filter(m => m.type === "document").length,
      voice: messages.filter(m => m.type === "voice").length,
      video: messages.filter(m => m.type === "video").length,
    };
    
    return { total, fromUsers, fromBot, byType };
  },
});

// Получить сообщения по чату
export const getByChat = query({
  args: {
    chatId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id("messages"),
    _creationTime: v.number(),
    telegramMessageId: v.string(),
    chatId: v.string(),
    clientId: v.id("clients"),
    text: v.optional(v.string()),
    type: v.union(v.literal("text"), v.literal("photo"), v.literal("document"), v.literal("voice"), v.literal("video")),
    isFromBot: v.boolean(),
    metadata: v.optional(v.object({
      messageType: v.optional(v.string()),
      hasPhoto: v.optional(v.boolean()),
      hasDocument: v.optional(v.boolean()),
      hasVoice: v.optional(v.boolean()),
      hasVideo: v.optional(v.boolean()),
    })),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    console.log("args.chatId", args.chatId);
    return await ctx.db
      .query("messages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .order("desc")
      .take(limit);
  },
}); 