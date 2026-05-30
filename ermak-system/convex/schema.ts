import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
// The schema provides more precise TypeScript types.
export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    role: v.optional(v.union(
      v.literal("admin"),
      v.literal("bartender"),
      v.literal("cook"),
      v.literal("courier"),
    )),
    username: v.optional(v.string()),
    fullName: v.optional(v.string()),
    passwordHash: v.optional(v.string()),
  }).index("email", ["email"]).index("phone", ["phone"]),
  numbers: defineTable({
    value: v.number(),
  }),
  
  // Ресторанные таблицы
  categories: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
  }).index("by_name", ["name"]),

  menuPositions: defineTable({
    name: v.string(),
    categoryId: v.id("categories"),
    articleNumber: v.number(),
    price: v.number(),
    photo: v.optional(v.string()),
    gallery:v.optional(v.array(v.string())),
    weight: v.number(),
    structure: v.string(),
    description:v.optional(v.string()),
    discountPrice: v.optional(v.number()),
    // Баллы лояльности, начисляемые за единицу товара в заказе
    cashback_score: v.optional(v.number()),
    ingredients: v.optional(
      v.array(
        v.object({
          productId: v.id("products"),
          quantity: v.number(),
        })
      )
    ),
  }).index("by_category", ["categoryId"]).index("by_article_number", ["articleNumber"]),
  
  // Клиенты (PWA + ранее Telegram)
  clients: defineTable({
    // Связь с учётной записью Convex Auth (PWA: телефон + пароль)
    userId: v.optional(v.id("users")),
    // Баланс баллов лояльности
    loyaltyPoints: v.optional(v.number()),
    // Базовые поля клиента
    tgId: v.optional(v.string()),
    chatId: v.optional(v.string()),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    // Пулы предустановок
    name_pool: v.optional(v.array(v.string())),
    phone_pool: v.optional(v.array(v.string())),
    username: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    // Пул адресов для доставки
    address_pool: v.array(v.object({
      label: v.optional(v.string()),
      address: v.string(),
      entrance: v.optional(v.string()),
      floor: v.optional(v.string()),
      apartment: v.optional(v.string()),
      comment: v.optional(v.string()),
    })),
    // Корзина пользователя
    cart: v.array(v.object({
      menuPositionId: v.id("menuPositions"),
      quantity: v.number(),
      notes: v.optional(v.string()),
    })),
    // Системные/служебные поля
    hasSeenMenuIntro: v.boolean(),
    navStack: v.optional(v.array(v.object({
      step: v.string(),
      categoryId: v.optional(v.id("categories")),
      menuPositionId: v.optional(v.id("menuPositions")),
    })) ),
    // Роли: клиенты (user) и сотрудники
    role: v.union(
      v.literal("user"),
      v.literal("admin"),
      v.literal("bartender"),
      v.literal("cook"),
      v.literal("courier")
    ),
    // Учетные поля для сотрудников
    fullName: v.optional(v.string()),
    login: v.optional(v.string()),
    passwordHash: v.optional(v.string()),
    isActive: v.boolean(),
    settings: v.optional(v.object({
      notifications: v.boolean(),
      language: v.string(),
      timezone: v.optional(v.string()),
    })),
    createdAt: v.number(),
    lastActivity: v.number(),
  }).index("by_telegram_id", ["tgId"]).index("by_login", ["login"]).index("by_phone", ["phone"]).index("by_user", ["userId"]),

  messages: defineTable({
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
  }).index("by_client", ["clientId"]).index("by_chat", ["chatId"]).index("by_created_at", ["createdAt"]),

  logs: defineTable({
    level: v.union(v.literal("info"), v.literal("warning"), v.literal("error")),
    message: v.string(),
    action: v.string(),
    metadata: v.optional(v.object({
      error: v.optional(v.string()),
      clientId: v.optional(v.id("clients")),
      chatId: v.optional(v.string()),
    })),
    createdAt: v.number(),
  }).index("by_level", ["level"]).index("by_action", ["action"]).index("by_created_at", ["createdAt"]),

  // Токены для callback_data (короткие значения для Telegram)
  callbacks: defineTable({
    token: v.string(),
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
    expiresAt: v.number(),
  }).index("by_token", ["token"]),

  // Заказы (подтверждённые)
  orders: defineTable({
    clientId: v.id("clients"),
    status: v.union(
      v.literal("backlog"),
      v.literal("accepted"),
      v.literal("pending"),
      v.literal("ready"),
      v.literal("delivery"),
      v.literal("delivery_pending"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("refund")
    ),
    type: v.union(
      v.literal("delivery"),
      v.literal("restaurant"),
      v.literal("self-service")
    ),
    clientInfo: v.object({
      name: v.string(),
      phone: v.string(),
    }),
    positions: v.array(v.object({
      menuPositionId: v.id("menuPositions"),
      quantity: v.number(),
      comment: v.optional(v.string()),
      unitPrice: v.number(),
      prepared: v.optional(v.boolean()),
    })),
    address: v.optional(v.string()),
    subtotal: v.number(),
    discountTotal: v.number(),
    deliveryFee: v.number(),
    total: v.number(),
    payment_method: v.union(v.literal("cash"), v.literal("card"), v.literal("online")),
    is_paid: v.boolean(),
    promocode: v.optional(v.string()),
    // Баллы лояльности
    pointsEarned: v.optional(v.number()),
    pointsRedeemed: v.optional(v.number()),
    // pending (на кухне): SLA
    estimateMinutes: v.optional(v.number()),
    acceptedAt: v.optional(v.number()),
    dueAt: v.optional(v.number()),
    // готовность/доставка
    readyAt: v.optional(v.number()),
    deliveryMinutes: v.optional(v.number()),
    deliveryDue: v.optional(v.number()),
    courierId: v.optional(v.id("users")),
    deliveryAcceptedAt: v.optional(v.number()),
    // Цех, на который отправлен заказ (можно менять до передачи в доставку)
    workshopId: v.optional(v.id("workshops")),
    // Флаг, что баллы за заказ уже начислены (начисляем при завершении)
    pointsAccrued: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_client", ["clientId"]).index("by_status_and_created", ["status", "createdAt"]).index("by_workshop_and_status", ["workshopId", "status"]),

  // Временные заказы (в процессе оформления)
  orders_temp: defineTable({
    clientId: v.id("clients"),
    // Снимок позиций из корзины на момент начала оформления
    positions: v.array(v.object({ menuPositionId: v.id("menuPositions"), quantity: v.number(), comment: v.optional(v.string()) })),
    step: v.optional(v.string()),
    type: v.optional(v.union(
      v.literal("delivery"),
      v.literal("restaurant"),
      v.literal("self-service")
    )),
    clientInfo: v.optional(v.object({ name: v.optional(v.string()), phone: v.optional(v.string()) })),
    address: v.optional(v.string()),
    payment_method: v.optional(v.union(v.literal("cash"), v.literal("card"), v.literal("online"))),
    promocode: v.optional(v.string()),
    // Сколько баллов клиент хочет списать в этом заказе
    redeemPoints: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_client", ["clientId"]),

  // Промокоды
  promocodes: defineTable({
    name: v.optional(v.string()),
    code: v.string(),
    scope: v.union(
      v.literal("order"),
      v.literal("category"),
      v.literal("position")
    ),
    type: v.union(v.literal("fixed"), v.literal("percent")),
    value: v.number(),
    categoryId: v.optional(v.id("categories")),
    positionId: v.optional(v.id("menuPositions")),
    isActive: v.boolean(),
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    // Conditions
    condThresholdEnabled: v.optional(v.boolean()),
    condThresholdValue: v.optional(v.number()),
    condOrderTypeEnabled: v.optional(v.boolean()),
    condOrderType: v.optional(v.union(v.literal("delivery"), v.literal("self-service"))),
  }).index("by_code", ["code"]),

  // Склад: продукты
  products: defineTable({
    name: v.string(),
    unit: v.string(), // ед. изм., например: кг, л, шт
    // Модель цены: "за priceBaseQty unit = priceForBase"
    priceBaseQty: v.number(),
    priceForBase: v.number(),
    estimate: v.number(), // текущий остаток
    safeEstimate: v.number(), // безопасный остаток
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_name", ["name"]),

  // Транзакции по продуктам (учёт склада)
  productTransactions: defineTable({
    date: v.number(), // timestamp
    productId: v.id("products"),
    quantity: v.number(),
    type: v.union(v.literal("plus"), v.literal("minus")),
    estimate: v.number(), // остаток после транзакции
    comment: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_product_and_date", ["productId", "date"]).index("by_date", ["date"]),

  // Партии продукта с сроком годности (стек остатков)
  productEstimates: defineTable({
    productId: v.id("products"),
    quantity: v.number(),
    estimate: v.number(),
    expiresAt: v.number(), // до какого числа годен
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_product_and_expires", ["productId", "expiresAt"]).index("by_product", ["productId"]).index("by_expires", ["expiresAt"]),

  // Выручка по дням
  dailyRevenue: defineTable({
    date: v.number(), // начало дня (ms)
    profit: v.number(),
    barmen_id: v.optional(v.id("users")),
    updatedAt: v.number(),
  }).index("by_date", ["date"]),

  // Денежные банки (кассы)
  banks: defineTable({
    name: v.union(v.literal("cash"), v.literal("card")),
    estimate: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_name", ["name"]),

  // История баллов лояльности
  loyaltyTransactions: defineTable({
    clientId: v.id("clients"),
    orderId: v.optional(v.id("orders")),
    delta: v.number(), // + начисление, - списание
    reason: v.union(v.literal("accrue"), v.literal("redeem"), v.literal("manual")),
    balanceAfter: v.number(),
    comment: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_client_and_created", ["clientId", "createdAt"]),

  // Подписки на Web Push
  pushSubscriptions: defineTable({
    clientId: v.id("clients"),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    userAgent: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_client", ["clientId"]).index("by_endpoint", ["endpoint"]),

  // Денежные транзакции
  moneyTransactions: defineTable({
    date: v.number(),
    bankId: v.id("banks"),
    amount: v.number(),
    type: v.union(v.literal("plus"), v.literal("minus")),
    reason: v.union(v.literal("sale"), v.literal("direct"), v.literal("productBuy")),
    estimate: v.number(),
    comment: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_date", ["date"]).index("by_bank_and_date", ["bankId", "date"]),

  // Цеха (кухонные станции): название + слаг
  workshops: defineTable({
    name: v.string(),
    slug: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_slug", ["slug"]),

  // In-app уведомления клиентов
  notifications: defineTable({
    clientId: v.id("clients"),
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
    read: v.boolean(),
    orderId: v.optional(v.id("orders")),
    createdAt: v.number(),
  }).index("by_client_and_created", ["clientId", "createdAt"]).index("by_client_and_read", ["clientId", "read"]),

  // Настройки сайта/брендинга (singleton: key="site")
  siteSettings: defineTable({
    key: v.string(),
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
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

});
