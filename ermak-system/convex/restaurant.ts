import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ===== КАТЕГОРИИ =====

/**
 * Создать новую категорию
 */
export const createCategory = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  returns: v.id("categories"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("categories", { 
      name: args.name,
      description: args.description,
      image: args.image,
    });
  },
});

/**
 * Получить все категории
 */
export const listCategories = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("categories"),
      _creationTime: v.number(),
      name: v.string(),
      description: v.optional(v.string()),
      image: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const categories = await ctx.db
      .query("categories")
      .order("asc")
      .collect();
    return categories;
  },
});

/**
 * Получить категорию по ID
 */
export const getCategory = query({
  args: {
    categoryId: v.id("categories"),
  },
  returns: v.union(
    v.object({
      _id: v.id("categories"),
      _creationTime: v.number(),
      name: v.string(),
      description: v.optional(v.string()),
      image: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.categoryId);
  },
});

/**
 * Обновить категорию
 */
export const updateCategory = mutation({
  args: {
    categoryId: v.id("categories"),
    name: v.string(),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.categoryId, { 
      name: args.name,
      description: args.description,
      image: args.image,
    });
    return null;
  },
});

/**
 * Удалить категорию
 */
export const deleteCategory = mutation({
  args: {
    categoryId: v.id("categories"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Проверяем, есть ли позиции меню в этой категории
    const menuPositions = await ctx.db
      .query("menuPositions")
      .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId))
      .collect();
    
    if (menuPositions.length > 0) {
      throw new Error("Нельзя удалить категорию, в которой есть позиции меню");
    }
    
    await ctx.db.delete(args.categoryId);
    return null;
  },
});

// ===== ПОЗИЦИИ МЕНЮ =====

/**
 * Создать новую позицию меню
 */
export const createMenuPosition = mutation({
  args: {
    name: v.string(),
    categoryId: v.id("categories"),
    articleNumber: v.number(),
    price: v.number(),
    photo: v.optional(v.string()),
    gallery:v.optional(v.array(v.string())),
    weight: v.number(),
    description:v.optional(v.string()),
    structure: v.string(),
    discountPrice: v.optional(v.number()),
    cashback_score: v.optional(v.number()),
    ingredients: v.optional(v.array(v.object({ productId: v.id("products"), quantity: v.number() }))),
  },
  returns: v.id("menuPositions"),
  handler: async (ctx, args) => {
    // Проверяем, что категория существует
    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Категория не найдена");
    }
    
    return await ctx.db.insert("menuPositions", {
      name: args.name,
      categoryId: args.categoryId,
      articleNumber: args.articleNumber,
      price: args.price,
      photo: args.photo,
      gallery: args.gallery,
      description: args.description,
      weight: args.weight,
      structure: args.structure,
      discountPrice: args.discountPrice,
      cashback_score: args.cashback_score,
      ingredients: args.ingredients,
    });
  },
});

/**
 * Получить все позиции меню с информацией о категориях
 */
export const listMenuPositions = query({
  args: {
    categoryId:v.optional(v.id('categories'))
  },
  returns: v.array(
    v.object({
      _id: v.id("menuPositions"),
      _creationTime: v.number(),
      name: v.string(),
      categoryId: v.id("categories"),
      categoryName: v.string(),
      articleNumber: v.number(),
      price: v.number(),
      photo: v.optional(v.string()),
      gallery: v.optional(v.array(v.string())),
      description: v.optional(v.string()),
      weight: v.number(),
      structure: v.string(),
      discountPrice: v.optional(v.number()),
      cashback_score: v.optional(v.number()),
      ingredients: v.optional(
        v.array(
          v.object({ productId: v.id("products"), quantity: v.number() })
        )
      ),
    })
  ),
  handler: async (ctx, args) => {
    let temp  = await ctx.db.query("menuPositions");

    if(args.categoryId){
      temp = temp.filter((f) => f.eq(f.field("categoryId"), args.categoryId));
    }
    
    const menuPositions=await temp.order('asc').collect()
    // Получаем информацию о категориях
    const result = [];
    for (const position of menuPositions) {
      const category = await ctx.db.get(position.categoryId);
      if (category) {
        result.push({
          ...position,
          categoryName: category.name,
        });
      }
    }
    
    return result;
  },
});

// ===== PROMOCODES CRUD (admin) =====
export const listPromocodes = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("promocodes"), _creationTime: v.number(), name: v.optional(v.string()), code: v.string(),
    scope: v.union(v.literal("order"), v.literal("category"), v.literal("position")), type: v.union(v.literal("fixed"), v.literal("percent")), value: v.number(),
    categoryId: v.optional(v.id("categories")), positionId: v.optional(v.id("menuPositions")),
    condThresholdEnabled: v.optional(v.boolean()), condThresholdValue: v.optional(v.number()),
    condOrderTypeEnabled: v.optional(v.boolean()), condOrderType: v.optional(v.union(v.literal("delivery"), v.literal("self-service"))),
    isActive: v.boolean(), expiresAt: v.optional(v.number()), createdAt: v.number(), updatedAt: v.number(),
  })),
  handler: async (ctx) => {
    const rows = await ctx.db.query("promocodes").order("desc").collect();
    return rows as any;
  },
});

export const createPromocode = mutation({
  args: {
    name: v.optional(v.string()),
    code: v.string(),
    scope: v.union(v.literal("order"), v.literal("category"), v.literal("position")),
    type: v.union(v.literal("fixed"), v.literal("percent")),
    value: v.number(),
    categoryId: v.optional(v.id("categories")),
    positionId: v.optional(v.id("menuPositions")),
    condThresholdEnabled: v.optional(v.boolean()),
    condThresholdValue: v.optional(v.number()),
    condOrderTypeEnabled: v.optional(v.boolean()),
    condOrderType: v.optional(v.union(v.literal("delivery"), v.literal("self-service"))),
    isActive: v.boolean(),
    expiresAt: v.optional(v.number()),
  },
  returns: v.id("promocodes"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("promocodes", { ...args, createdAt: now, updatedAt: now } as any);
  },
});

export const updatePromocode = mutation({
  args: {
    promoId: v.id("promocodes"),
    name: v.optional(v.string()),
    code: v.optional(v.string()),
    scope: v.optional(v.union(v.literal("order"), v.literal("category"), v.literal("position"))),
    type: v.optional(v.union(v.literal("fixed"), v.literal("percent"))),
    value: v.optional(v.number()),
    categoryId: v.optional(v.id("categories")),
    positionId: v.optional(v.id("menuPositions")),
    condThresholdEnabled: v.optional(v.boolean()),
    condThresholdValue: v.optional(v.number()),
    condOrderTypeEnabled: v.optional(v.boolean()),
    condOrderType: v.optional(v.union(v.literal("delivery"), v.literal("self-service"))),
    isActive: v.optional(v.boolean()),
    expiresAt: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { promoId, ...rest } = args as any;
    await ctx.db.patch(promoId, { ...rest, updatedAt: Date.now() });
    return null;
  },
});

export const deletePromocode = mutation({
  args: { promoId: v.id("promocodes") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.promoId);
    return null;
  },
});

/**
 * Получить позиции меню по категории
 */
export const listMenuPositionsByCategory = query({
  args: {
    categoryId: v.id("categories"),
  },
  returns: v.array(
    v.object({
      _id: v.id("menuPositions"),
      _creationTime: v.number(),
      name: v.string(),
      categoryId: v.id("categories"),
      articleNumber: v.number(),
      price: v.number(),
      photo: v.optional(v.string()),
      gallery: v.optional(v.array(v.string())),
      description: v.optional(v.string()),
      weight: v.number(),
      structure: v.string(),
      discountPrice: v.optional(v.number()),
      cashback_score: v.optional(v.number()),
      ingredients: v.optional(
        v.array(
          v.object({ productId: v.id("products"), quantity: v.number() })
        )
      ),
    })
  ),
  handler: async (ctx, args) => {
    const menuPositions = await ctx.db
      .query("menuPositions")
      .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId))
      .order("asc")
      .collect();
    
    return menuPositions;
  },
});

// Пагинация позиций по категории с информацией о страницах
export const listMenuPositionsByCategoryPaged = query({
  args: {
    categoryId: v.id("categories"),
    page: v.number(),
    pageSize: v.number(),
  },
  returns: v.object({
    items: v.array(
      v.object({
        _id: v.id("menuPositions"),
        _creationTime: v.number(),
        name: v.string(),
        categoryId: v.id("categories"),
        articleNumber: v.number(),
        price: v.number(),
        photo: v.optional(v.string()),
        gallery: v.optional(v.array(v.string())),
        description: v.optional(v.string()),
        weight: v.number(),
        structure: v.string(),
        discountPrice: v.optional(v.number()),
        cashback_score: v.optional(v.number()),
        ingredients: v.optional(
          v.array(
            v.object({ productId: v.id("products"), quantity: v.number() })
          )
        ),
      })
    ),
    page: v.number(),
    totalPages: v.number(),
    totalItems: v.number(),
  }),
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("menuPositions")
      .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId))
      .order("asc")
      .collect();
    const totalItems = all.length;
    const pageSize = Math.max(1, Math.min(20, Math.floor(args.pageSize)));
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const page = Math.max(1, Math.min(totalPages, Math.floor(args.page)));
    const start = (page - 1) * pageSize;
    const items = all.slice(start, start + pageSize);
    return { items, page, totalPages, totalItems };
  },
});

/**
 * Получить позицию меню по ID
 */
export const getMenuPosition = query({
  args: {
    menuPositionId: v.id("menuPositions"),
  },
  returns: v.union(
    v.object({
      _id: v.id("menuPositions"),
      _creationTime: v.number(),
      name: v.string(),
      categoryId: v.id("categories"),
      categoryName: v.string(),
      articleNumber: v.number(),
      price: v.number(),
      photo: v.optional(v.string()),
      gallery: v.optional(v.array(v.string())),
      description: v.optional(v.string()),
      weight: v.number(),
      structure: v.string(),
      discountPrice: v.optional(v.number()),
      cashback_score: v.optional(v.number()),
      ingredients: v.optional(
        v.array(
          v.object({ productId: v.id("products"), quantity: v.number() })
        )
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const position = await ctx.db.get(args.menuPositionId);
    if (!position) {
      return null;
    }
    
    const category = await ctx.db.get(position.categoryId);
    if (!category) {
      return null;
    }
    
    return {
      ...position,
      categoryName: category.name,
    };
  },
});

/**
 * Обновить позицию меню
 */
export const updateMenuPosition = mutation({
  args: {
    menuPositionId: v.id("menuPositions"),
    name: v.string(),
    categoryId: v.id("categories"),
    articleNumber: v.number(),
    price: v.number(),
    photo: v.optional(v.string()),
    gallery:v.optional(v.array(v.string())),
    weight: v.number(),
    description:v.optional(v.string()),
    structure: v.string(),
    discountPrice: v.optional(v.number()),
    cashback_score: v.optional(v.number()),
    ingredients: v.optional(v.array(v.object({ productId: v.id("products"), quantity: v.number() }))),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Проверяем, что категория существует
    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Категория не найдена");
    }
    
    await ctx.db.patch(args.menuPositionId, {
      name: args.name,
      categoryId: args.categoryId,
      articleNumber: args.articleNumber,
      price: args.price,
      photo: args.photo,
      gallery: args.gallery,
      description: args.description,
      weight: args.weight,
      structure: args.structure,
      discountPrice: args.discountPrice,
      cashback_score: args.cashback_score,
      ingredients: args.ingredients,
    });
    
    return null;
  },
});

/**
 * Удалить позицию меню
 */
export const deleteMenuPosition = mutation({
  args: {
    menuPositionId: v.id("menuPositions"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.menuPositionId);
    return null;
  },
});

// ===== ЗАГРУЗКА ФАЙЛОВ =====

/**
 * Генерировать URL для загрузки файла
 */
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Сохранить информацию о загруженном файле
 */
export const saveFileInfo = mutation({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    // Получаем URL файла из storage
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) {
      throw new Error("Файл не найден");
    }
    return url;
  },
}); 

// ===== CALLBACK TOKENS =====
export const createCallbackToken = mutation({
  args: {
    kind: v.union(
      v.literal("cat_page"),
      v.literal("cat_item"),
      v.literal("item_back"),
      v.literal("item_cat"),
      v.literal("item_cart"),
      v.literal("cart_rm")
    ),
    categoryId: v.optional(v.id("categories")),
    itemId: v.optional(v.id("menuPositions")),
    page: v.optional(v.number()),
    ttlSec: v.optional(v.number()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const token = Math.random().toString(36).slice(2, 10);
    const expiresAt = Date.now() + 1000 * (args.ttlSec ?? 3600);
    await ctx.db.insert("callbacks", {
      token,
      kind: args.kind,
      categoryId: args.categoryId,
      itemId: args.itemId,
      page: args.page,
      expiresAt,
    });
    return token;
  },
});

export const resolveCallbackToken = query({
  args: { token: v.string() },
  returns: v.union(
    v.object({
      kind: v.union(
        v.literal("cat_page"),
        v.literal("cat_item"),
        v.literal("item_back"),
        v.literal("item_cat"),
        v.literal("item_cart"),
        v.literal("cart_rm")
      ),
      categoryId: v.optional(v.id("categories")),
      itemId: v.optional(v.id("menuPositions")),
      page: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("callbacks")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!doc) return null;
    if (doc.expiresAt < Date.now()) return null;
    const { kind, categoryId, itemId, page } = doc as any;
    return { kind, categoryId, itemId, page } as any;
  },
});