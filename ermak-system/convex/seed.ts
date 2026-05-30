import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { createAccount } from "@convex-dev/auth/server";

export const userExists = internalQuery({
  args: { email: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const u = await ctx.db.query("users").withIndex("email", (q) => q.eq("email", args.email)).unique();
    return !!u;
  },
});

// Складские продукты (сырьё). priceBaseQty/priceForBase — цена за базовый объём.
const PRODUCTS: Array<{ name: string; unit: string; priceBaseQty: number; priceForBase: number; estimate: number; safe: number }> = [
  { name: "Булочка", unit: "шт", priceBaseQty: 1, priceForBase: 15, estimate: 500, safe: 50 },
  { name: "Говяжья котлета", unit: "шт", priceBaseQty: 1, priceForBase: 60, estimate: 300, safe: 30 },
  { name: "Куриная котлета", unit: "шт", priceBaseQty: 1, priceForBase: 50, estimate: 300, safe: 30 },
  { name: "Сыр чеддер", unit: "ломтик", priceBaseQty: 1, priceForBase: 12, estimate: 400, safe: 40 },
  { name: "Фирменный соус", unit: "порц", priceBaseQty: 1, priceForBase: 5, estimate: 600, safe: 50 },
  { name: "Маринованный огурец", unit: "порц", priceBaseQty: 1, priceForBase: 4, estimate: 500, safe: 40 },
  { name: "Лук", unit: "порц", priceBaseQty: 1, priceForBase: 3, estimate: 500, safe: 40 },
  { name: "Салат", unit: "порц", priceBaseQty: 1, priceForBase: 4, estimate: 400, safe: 30 },
  { name: "Томат", unit: "порц", priceBaseQty: 1, priceForBase: 5, estimate: 400, safe: 30 },
  { name: "Картофель", unit: "г", priceBaseQty: 1000, priceForBase: 90, estimate: 50000, safe: 5000 },
  { name: "Куриное филе", unit: "г", priceBaseQty: 1000, priceForBase: 350, estimate: 30000, safe: 3000 },
  { name: "Панировка", unit: "г", priceBaseQty: 1000, priceForBase: 120, estimate: 10000, safe: 1000 },
  { name: "Кола (банка)", unit: "шт", priceBaseQty: 1, priceForBase: 60, estimate: 200, safe: 20 },
  { name: "Лимон", unit: "шт", priceBaseQty: 1, priceForBase: 25, estimate: 150, safe: 20 },
  { name: "Мята", unit: "порц", priceBaseQty: 1, priceForBase: 6, estimate: 200, safe: 20 },
  { name: "Сахарный сироп", unit: "порц", priceBaseQty: 1, priceForBase: 8, estimate: 200, safe: 20 },
  { name: "Вода питьевая", unit: "мл", priceBaseQty: 1000, priceForBase: 20, estimate: 50000, safe: 5000 },
  { name: "Кофе (зерно)", unit: "г", priceBaseQty: 1000, priceForBase: 1500, estimate: 5000, safe: 500 },
  { name: "Молоко", unit: "мл", priceBaseQty: 1000, priceForBase: 80, estimate: 30000, safe: 3000 },
  { name: "Мороженое", unit: "порц", priceBaseQty: 1, priceForBase: 30, estimate: 200, safe: 20 },
  { name: "Творожный сыр", unit: "г", priceBaseQty: 1000, priceForBase: 600, estimate: 8000, safe: 800 },
  { name: "Печенье", unit: "г", priceBaseQty: 1000, priceForBase: 250, estimate: 6000, safe: 600 },
  { name: "Сливки", unit: "мл", priceBaseQty: 1000, priceForBase: 300, estimate: 6000, safe: 600 },
];

// Рецептуры блюд: имя позиции меню -> список (имя продукта, количество в его ед. изм.)
const RECIPES: Record<string, Array<{ product: string; quantity: number }>> = {
  "Чизбургер Ермак": [
    { product: "Булочка", quantity: 1 },
    { product: "Говяжья котлета", quantity: 1 },
    { product: "Сыр чеддер", quantity: 1 },
    { product: "Фирменный соус", quantity: 1 },
    { product: "Маринованный огурец", quantity: 1 },
  ],
  "Двойной Биф": [
    { product: "Булочка", quantity: 1 },
    { product: "Говяжья котлета", quantity: 2 },
    { product: "Сыр чеддер", quantity: 2 },
    { product: "Лук", quantity: 1 },
    { product: "Фирменный соус", quantity: 1 },
  ],
  "Чикен Бургер": [
    { product: "Булочка", quantity: 1 },
    { product: "Куриная котлета", quantity: 1 },
    { product: "Салат", quantity: 1 },
    { product: "Томат", quantity: 1 },
    { product: "Фирменный соус", quantity: 1 },
  ],
  "Картофель фри": [{ product: "Картофель", quantity: 150 }],
  "Наггетсы 9 шт": [
    { product: "Куриное филе", quantity: 150 },
    { product: "Панировка", quantity: 30 },
  ],
  "Луковые кольца": [
    { product: "Лук", quantity: 2 },
    { product: "Панировка", quantity: 20 },
  ],
  "Кола 0.5": [{ product: "Кола (банка)", quantity: 1 }],
  "Лимонад Ермак": [
    { product: "Лимон", quantity: 1 },
    { product: "Мята", quantity: 1 },
    { product: "Сахарный сироп", quantity: 1 },
    { product: "Вода питьевая", quantity: 400 },
  ],
  "Кофе Латте": [
    { product: "Кофе (зерно)", quantity: 18 },
    { product: "Молоко", quantity: 250 },
  ],
  "Мороженое": [{ product: "Мороженое", quantity: 1 }],
  "Чизкейк": [
    { product: "Творожный сыр", quantity: 80 },
    { product: "Печенье", quantity: 30 },
    { product: "Сливки", quantity: 40 },
  ],
};

export const seedData = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Цеха по умолчанию (идемпотентно)
    const hasWorkshops = await ctx.db.query("workshops").first();
    if (!hasWorkshops) {
      const wnow = Date.now();
      await ctx.db.insert("workshops", { name: "Кухня", slug: "kitchen", createdAt: wnow, updatedAt: wnow });
      await ctx.db.insert("workshops", { name: "Бар", slug: "bar", createdAt: wnow, updatedAt: wnow });
    }
    // Настройки сайта (идемпотентно)
    const hasSettings = await ctx.db.query("siteSettings").withIndex("by_key", (q) => q.eq("key", "site")).unique();
    if (!hasSettings) {
      await ctx.db.insert("siteSettings", {
        key: "site",
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
        updatedAt: Date.now(),
      } as any);
    }

    const now = Date.now();
    const farExpiry = now + 30 * 24 * 60 * 60 * 1000; // +30 дней

    // ——— Склад: продукты + стартовые партии (идемпотентно по имени) ———
    const productIdByName: Record<string, any> = {};
    const existingProducts = await ctx.db.query("products").collect();
    for (const p of existingProducts) productIdByName[p.name as string] = p._id;
    for (const p of PRODUCTS) {
      if (productIdByName[p.name]) continue;
      const id = await ctx.db.insert("products", {
        name: p.name,
        unit: p.unit,
        priceBaseQty: p.priceBaseQty,
        priceForBase: p.priceForBase,
        estimate: p.estimate,
        safeEstimate: p.safe,
        createdAt: now,
        updatedAt: now,
      });
      productIdByName[p.name] = id;
      // стартовая партия для FIFO-списания
      await ctx.db.insert("productEstimates", {
        productId: id,
        quantity: p.estimate,
        estimate: p.estimate,
        expiresAt: farExpiry,
        createdAt: now,
        updatedAt: now,
      } as any);
    }

    const ingredientsFor = (dish: string) => {
      const rec = RECIPES[dish];
      if (!rec) return undefined;
      const list = rec
        .map((r) => ({ productId: productIdByName[r.product], quantity: r.quantity }))
        .filter((r) => !!r.productId);
      return list.length ? list : undefined;
    };

    // ——— Категории + меню (создаём только если меню ещё нет) ———
    const hasCategories = await ctx.db.query("categories").first();
    if (!hasCategories) {
      const categories: Array<{ name: string; description: string }> = [
        { name: "Бургеры", description: "Сочные бургеры на гриле" },
        { name: "Закуски", description: "Картофель, наггетсы и снеки" },
        { name: "Напитки", description: "Холодные и горячие напитки" },
        { name: "Десерты", description: "Сладкое к чаю и кофе" },
      ];
      const catIds: Record<string, any> = {};
      for (const c of categories) {
        catIds[c.name] = await ctx.db.insert("categories", { name: c.name, description: c.description });
      }

      let article = 1000;
      const items: Array<{
        cat: string; name: string; price: number; weight: number; structure: string;
        description: string; cashback: number; discount?: number;
      }> = [
        { cat: "Бургеры", name: "Чизбургер Ермак", price: 290, weight: 230, structure: "Булочка, говяжья котлета, сыр чеддер, соус, маринованный огурец", description: "Классический чизбургер с фирменным соусом", cashback: 15 },
        { cat: "Бургеры", name: "Двойной Биф", price: 390, weight: 320, structure: "Булочка, две говяжьи котлеты, двойной сыр, лук, соус", description: "Для большого аппетита", cashback: 20, discount: 350 },
        { cat: "Бургеры", name: "Чикен Бургер", price: 250, weight: 220, structure: "Булочка, куриная котлета, салат, томат, соус", description: "Хрустящая курица в булочке", cashback: 12 },
        { cat: "Закуски", name: "Картофель фри", price: 120, weight: 150, structure: "Картофель, соль", description: "Золотистый картофель фри", cashback: 5 },
        { cat: "Закуски", name: "Наггетсы 9 шт", price: 220, weight: 180, structure: "Куриное филе в панировке", description: "Куриные наггетсы с соусом", cashback: 10 },
        { cat: "Закуски", name: "Луковые кольца", price: 160, weight: 140, structure: "Лук, панировка", description: "Хрустящие луковые кольца", cashback: 7 },
        { cat: "Напитки", name: "Кола 0.5", price: 110, weight: 500, structure: "Газированный напиток", description: "Холодная кола", cashback: 3 },
        { cat: "Напитки", name: "Лимонад Ермак", price: 150, weight: 400, structure: "Лимон, мята, сироп, вода", description: "Домашний лимонад", cashback: 8 },
        { cat: "Напитки", name: "Кофе Латте", price: 180, weight: 300, structure: "Эспрессо, молоко", description: "Ароматный латте", cashback: 8 },
        { cat: "Десерты", name: "Мороженое", price: 90, weight: 100, structure: "Молочное мороженое", description: "Ванильное мороженое", cashback: 4 },
        { cat: "Десерты", name: "Чизкейк", price: 210, weight: 130, structure: "Сыр, печенье, сливки", description: "Нежный чизкейк", cashback: 10 },
      ];

      for (const it of items) {
        await ctx.db.insert("menuPositions", {
          name: it.name,
          categoryId: catIds[it.cat],
          articleNumber: article++,
          price: it.price,
          weight: it.weight,
          structure: it.structure,
          description: it.description,
          discountPrice: it.discount,
          cashback_score: it.cashback,
          ingredients: ingredientsFor(it.name),
        });
      }
    } else {
      // ——— Бэкофилл: проставляем ингредиенты позициям, у которых их нет ———
      const allPositions = await ctx.db.query("menuPositions").collect();
      for (const mp of allPositions) {
        const current = (mp as any).ingredients as Array<unknown> | undefined;
        if (current && current.length > 0) continue;
        const ings = ingredientsFor(mp.name as string);
        if (ings) await ctx.db.patch(mp._id, { ingredients: ings } as any);
      }
    }
    return null;
  },
});

/**
 * Идемпотентный сид: создаёт администратора и стартовые данные меню.
 * Запускается deployer-ом: `npx convex run seed:run`.
 */
export const run = action({
  args: {},
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx): Promise<{ ok: boolean }> => {
    const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@ermak.local";
    const adminPass = process.env.SEED_ADMIN_PASSWORD || "admin123";
    const exists = await ctx.runQuery(internal.seed.userExists, { email: adminEmail });
    if (!exists) {
      // Создаёт users + authAccounts (пароль хэшируется провайдером "password")
      await createAccount(ctx, {
        provider: "password",
        account: { id: adminEmail, secret: adminPass },
        profile: { email: adminEmail, name: "Администратор", fullName: "Администратор", role: "admin" } as any,
      });
    }
    await ctx.runMutation(internal.seed.seedData, {});
    return { ok: true };
  },
});
