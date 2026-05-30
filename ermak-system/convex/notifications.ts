import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { auth } from "./auth";

async function resolveClient(ctx: any): Promise<Doc<"clients"> | null> {
  const userId = await auth.getUserId(ctx);
  if (!userId) return null;
  const c = await ctx.db.query("clients").withIndex("by_user", (q: any) => q.eq("userId", userId)).unique();
  return c ?? null;
}

const notificationValidator = v.object({
  _id: v.id("notifications"),
  title: v.string(),
  body: v.string(),
  url: v.optional(v.string()),
  read: v.boolean(),
  createdAt: v.number(),
});

// Лента уведомлений текущего клиента
export const myNotifications = query({
  args: {},
  returns: v.array(notificationValidator),
  handler: async (ctx) => {
    const client = await resolveClient(ctx);
    if (!client) return [];
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_client_and_created", (q) => q.eq("clientId", client._id))
      .order("desc")
      .take(50);
    return rows.map((n) => ({
      _id: n._id,
      title: n.title as string,
      body: n.body as string,
      url: (n.url as string | undefined) ?? undefined,
      read: n.read as boolean,
      createdAt: n.createdAt as number,
    }));
  },
});

export const unreadCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const client = await resolveClient(ctx);
    if (!client) return 0;
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_client_and_read", (q) => q.eq("clientId", client._id).eq("read", false))
      .collect();
    return rows.length;
  },
});

export const markAllRead = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const client = await resolveClient(ctx);
    if (!client) return null;
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_client_and_read", (q) => q.eq("clientId", client._id).eq("read", false))
      .collect();
    for (const n of rows) await ctx.db.patch(n._id, { read: true });
    return null;
  },
});

export const markRead = mutation({
  args: { id: v.id("notifications") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const client = await resolveClient(ctx);
    if (!client) return null;
    const n = await ctx.db.get(args.id);
    if (n && String(n.clientId) === String(client._id)) {
      await ctx.db.patch(args.id, { read: true });
    }
    return null;
  },
});

// Внутреннее создание уведомления (вызывается из orders.notifyClient)
export const createInternal = internalMutation({
  args: {
    clientId: v.id("clients"),
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
    orderId: v.optional(v.id("orders")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("notifications", {
      clientId: args.clientId,
      title: args.title,
      body: args.body,
      url: args.url,
      orderId: args.orderId,
      read: false,
      createdAt: Date.now(),
    });
    return null;
  },
});
