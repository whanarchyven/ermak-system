import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

function slugify(input: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
    и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
    с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch",
    ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };
  return input
    .toLowerCase()
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "cex";
}

const workshopValidator = v.object({
  _id: v.id("workshops"),
  _creationTime: v.number(),
  name: v.string(),
  slug: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const list = query({
  args: {},
  returns: v.array(workshopValidator),
  handler: async (ctx) => {
    return (await ctx.db.query("workshops").order("asc").collect()) as any;
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  returns: v.union(workshopValidator, v.null()),
  handler: async (ctx, args) => {
    const w = await ctx.db.query("workshops").withIndex("by_slug", (q) => q.eq("slug", args.slug)).unique();
    return (w ?? null) as any;
  },
});

export const create = mutation({
  args: { name: v.string(), slug: v.optional(v.string()) },
  returns: v.id("workshops"),
  handler: async (ctx, args) => {
    const base = (args.slug && args.slug.trim()) || slugify(args.name);
    let slug = base;
    let i = 1;
    while (await ctx.db.query("workshops").withIndex("by_slug", (q) => q.eq("slug", slug)).unique()) {
      slug = `${base}-${i++}`;
    }
    const now = Date.now();
    return await ctx.db.insert("workshops", { name: args.name.trim(), slug, createdAt: now, updatedAt: now });
  },
});

export const update = mutation({
  args: { id: v.id("workshops"), name: v.optional(v.string()), slug: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name) patch.name = args.name.trim();
    if (args.slug) patch.slug = slugify(args.slug);
    await ctx.db.patch(args.id, patch);
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("workshops") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return null;
  },
});

// Заказы конкретного цеха в активных статусах (для /kitchen/[slug])
export const ordersBySlug = query({
  args: { slug: v.string() },
  returns: v.array(v.object({
    _id: v.id("orders"),
    status: v.string(),
    type: v.string(),
    client: v.object({ name: v.string(), phone: v.string() }),
    positions: v.array(v.object({ id: v.id("menuPositions"), name: v.string(), quantity: v.number(), prepared: v.optional(v.boolean()) })),
    total: v.number(),
    subtotal: v.number(),
    discountTotal: v.number(),
    pointsRedeemed: v.optional(v.number()),
    address: v.optional(v.string()),
    acceptedAt: v.optional(v.number()),
    dueAt: v.optional(v.number()),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const w = await ctx.db.query("workshops").withIndex("by_slug", (q) => q.eq("slug", args.slug)).unique();
    if (!w) return [];
    const rows = await ctx.db
      .query("orders")
      .withIndex("by_workshop_and_status", (q) => q.eq("workshopId", w._id).eq("status", "pending"))
      .collect();
    rows.sort((a: any, b: any) => ((a.dueAt ?? Infinity) - (b.dueAt ?? Infinity)));
    const out: any[] = [];
    for (const o of rows) {
      const positions: any[] = [];
      for (const p of (o.positions as any[])) {
        const mp = await ctx.db.get(p.menuPositionId as Id<"menuPositions">);
        positions.push({ id: p.menuPositionId, name: (mp?.name as string) || "", quantity: p.quantity, prepared: p.prepared ?? false });
      }
      out.push({
        _id: o._id,
        status: o.status as string,
        type: o.type as string,
        client: { name: (o.clientInfo as any).name as string, phone: (o.clientInfo as any).phone as string },
        positions,
        total: o.total as number,
        subtotal: o.subtotal as number,
        discountTotal: o.discountTotal as number,
        pointsRedeemed: (o as any).pointsRedeemed as number | undefined,
        address: (o.address as string | undefined) ?? undefined,
        acceptedAt: (o as any).acceptedAt as number | undefined,
        dueAt: (o as any).dueAt as number | undefined,
        createdAt: o.createdAt as number,
      });
    }
    return out;
  },
});
