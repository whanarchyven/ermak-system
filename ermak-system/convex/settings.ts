import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

const SETTINGS_KEY = "site";

const DEFAULTS = {
  brandName: "Ермак",
  slogan: "Домашнее кафе",
  logoUrl: "/logo.png",
  homeTitle: "Голоден? Мы рядом",
  homeSubtitle: "Собери свой заказ и получи баллами кэшбэк",
  promoTitle: "Акции и промокоды",
  promoSubtitle: "Лови выгоду",
  phone: "",
  address: "",
  primaryColor: "#371B03",
  secondaryColor: "#F8F5EC",
};

const settingsValidator = v.object({
  brandName: v.string(),
  slogan: v.string(),
  logoUrl: v.string(),
  homeTitle: v.string(),
  homeSubtitle: v.string(),
  promoTitle: v.string(),
  promoSubtitle: v.string(),
  phone: v.string(),
  address: v.string(),
  primaryColor: v.string(),
  secondaryColor: v.string(),
});

// Публичный геттер настроек (для PWA и ERP)
export const get = query({
  args: {},
  returns: settingsValidator,
  handler: async (ctx) => {
    const row = await ctx.db.query("siteSettings").withIndex("by_key", (q) => q.eq("key", SETTINGS_KEY)).unique();
    const merged = { ...DEFAULTS };
    if (row) {
      for (const k of Object.keys(DEFAULTS) as Array<keyof typeof DEFAULTS>) {
        const val = (row as any)[k];
        if (typeof val === "string" && val.length > 0) merged[k] = val;
      }
    }
    return merged;
  },
});

export const update = mutation({
  args: {
    brandName: v.optional(v.string()),
    slogan: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    homeTitle: v.optional(v.string()),
    homeSubtitle: v.optional(v.string()),
    promoTitle: v.optional(v.string()),
    promoSubtitle: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
    secondaryColor: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const row = await ctx.db.query("siteSettings").withIndex("by_key", (q) => q.eq("key", SETTINGS_KEY)).unique();
    const patch: Record<string, unknown> = { updatedAt: now };
    for (const [k, val] of Object.entries(args)) {
      if (val !== undefined) patch[k] = val;
    }
    if (row) {
      await ctx.db.patch(row._id, patch);
    } else {
      await ctx.db.insert("siteSettings", { key: SETTINGS_KEY, ...patch } as any);
    }
    return null;
  },
});
