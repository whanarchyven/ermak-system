import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { store, auth } from "./auth";

export const list = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("users"),
    _creationTime: v.number(),
    email: v.optional(v.string()),
    username: v.optional(v.string()),
    fullName: v.optional(v.string()),
    role: v.optional(v.union(v.literal("admin"), v.literal("bartender"), v.literal("cook"), v.literal("courier"))),
  })),
  handler: async (ctx) => {
    const rows = await ctx.db.query("users").collect();
    // Только сотрудники: у клиентов PWA роль не задана
    return rows
      .filter((u) => !!(u as any).role)
      .map((u) => ({
        _id: u._id,
        _creationTime: u._creationTime,
        email: (u as any).email,
        username: (u as any).username,
        fullName: (u as any).fullName,
        role: (u as any).role,
      })) as any;
  },
});

export const create = mutation({
  args: { email: v.string(), password: v.string(), fullName: v.string(), role: v.union(v.literal("admin"), v.literal("bartender"), v.literal("cook"), v.literal("courier")) },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    // Создание пользователя паролем: используйте Convex Auth Password provider — здесь только запись профиля
    const exists = await ctx.db.query("users").withIndex("email", (q) => q.eq("email", args.email)).unique();
    if (exists) throw new Error("Пользователь с таким email уже существует");
    const passwordHash = await sha256(args.password);
    const id = await ctx.db.insert("users", { email: args.email, fullName: args.fullName, role: args.role as any, passwordHash } as any);
    return id as Id<"users">;
  },
});

export const update = mutation({
  args: { id: v.id("users"), fullName: v.optional(v.string()), role: v.optional(v.union(v.literal("admin"), v.literal("bartender"), v.literal("cook"), v.literal("courier"))) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (!row) throw new Error("Пользователь не найден");
    const patch: any = {};
    if (args.fullName !== undefined) patch.fullName = args.fullName;
    if (args.role !== undefined) patch.role = args.role as any;
    await ctx.db.patch(args.id, patch);
    return null;
  },
});

// Админская регистрация сотрудника: создаёт auth-аккаунт и профиль
export const adminCreate = action({
  args: { email: v.string(), password: v.string(), fullName: v.string(), role: v.union(v.literal("admin"), v.literal("bartender"), v.literal("cook"), v.literal("courier")) },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    // Создаём auth-аккаунт провайдера Password и профиль через store.createUser
    const userId = await ctx.runMutation((store as any).createUser, {
      account: { provider: "password", accountId: args.email, password: args.password },
      profile: { email: args.email, fullName: args.fullName, role: args.role as any },
    });
    // Профиль уже записан в users, дополнительных полей не требуется
    return userId as Id<"users">;
  },
});

async function sha256(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

export const remove = mutation({
  args: { id: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return null;
  },
});

export const me = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("users"),
      email: v.optional(v.string()),
      fullName: v.optional(v.string()),
      role: v.optional(v.union(v.literal("admin"), v.literal("bartender"), v.literal("cook"), v.literal("courier"))),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    // Получаем текущего пользователя из Auth
    const userId = await auth.getUserId(ctx as any);
    if (!userId) return null;
    const u = await ctx.db.get(userId as Id<"users">);
    if (!u) return null;
    return {
      _id: u._id as Id<"users">,
      email: (u as any).email as string | undefined,
      fullName: (u as any).fullName as string | undefined,
      role: (u as any).role as any,
    } as any;
  },
});

export const setProfileByEmail = mutation({
  args: {
    email: v.string(),
    fullName: v.optional(v.string()),
    role: v.optional(v.union(v.literal("admin"), v.literal("bartender"), v.literal("cook"), v.literal("courier"))),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.query("users").withIndex("email", (q) => q.eq("email", args.email)).unique();
    if (!row) throw new Error("User not found by email");
    const patch: any = {};
    if (args.fullName !== undefined) patch.fullName = args.fullName;
    if (args.role !== undefined) patch.role = args.role as any;
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(row._id as Id<"users">, patch);
    }
    return null;
  },
});


