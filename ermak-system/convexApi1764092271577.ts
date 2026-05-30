import { type FunctionReference, anyApi } from "convex/server";
import { type GenericId as Id } from "convex/values";

export const api: PublicApiType = anyApi as unknown as PublicApiType;
export const internal: InternalApiType = anyApi as unknown as InternalApiType;

export type PublicApiType = {
  transactions: {
    stats: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      { card: number; cash: number }
    >;
    listBanks: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      Array<{ _id: Id<"banks">; estimate: number; name: "cash" | "card" }>
    >;
    list: FunctionReference<
      "query",
      "public",
      { from: number; to: number },
      Array<{
        _creationTime: number;
        _id: Id<"moneyTransactions">;
        amount: number;
        bankId: Id<"banks">;
        bankName: "cash" | "card";
        comment?: string;
        date: number;
        estimate: number;
        reason: "sale" | "direct" | "productBuy";
        type: "plus" | "minus";
      }>
    >;
    create: FunctionReference<
      "mutation",
      "public",
      {
        amount: number;
        bank: "cash" | "card";
        comment?: string;
        reason: "sale" | "direct" | "productBuy";
        type: "plus" | "minus";
      },
      { ok: boolean }
    >;
  };
  users: {
    list: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      Array<{
        _creationTime: number;
        _id: Id<"users">;
        email?: string;
        fullName?: string;
        role?: "admin" | "bartender" | "cook" | "courier";
        username?: string;
      }>
    >;
    create: FunctionReference<
      "mutation",
      "public",
      {
        email: string;
        fullName: string;
        password: string;
        role: "admin" | "bartender" | "cook" | "courier";
      },
      Id<"users">
    >;
    update: FunctionReference<
      "mutation",
      "public",
      {
        fullName?: string;
        id: Id<"users">;
        role?: "admin" | "bartender" | "cook" | "courier";
      },
      null
    >;
    adminCreate: FunctionReference<
      "action",
      "public",
      {
        email: string;
        fullName: string;
        password: string;
        role: "admin" | "bartender" | "cook" | "courier";
      },
      Id<"users">
    >;
    remove: FunctionReference<"mutation", "public", { id: Id<"users"> }, null>;
    me: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      {
        _id: Id<"users">;
        email?: string;
        fullName?: string;
        role?: "admin" | "bartender" | "cook" | "courier";
      } | null
    >;
    setProfileByEmail: FunctionReference<
      "mutation",
      "public",
      {
        email: string;
        fullName?: string;
        role?: "admin" | "bartender" | "cook" | "courier";
      },
      null
    >;
  };
  warehouse: {
    createProduct: FunctionReference<
      "mutation",
      "public",
      {
        estimate: number;
        name: string;
        priceBaseQty: number;
        priceForBase: number;
        safeEstimate: number;
        unit: string;
      },
      Id<"products">
    >;
    updateProduct: FunctionReference<
      "mutation",
      "public",
      {
        name: string;
        priceBaseQty: number;
        priceForBase: number;
        productId: Id<"products">;
        safeEstimate: number;
        unit: string;
      },
      null
    >;
    deleteProduct: FunctionReference<
      "mutation",
      "public",
      { productId: Id<"products"> },
      null
    >;
    listProducts: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      Array<{
        _creationTime: number;
        _id: Id<"products">;
        createdAt: number;
        estimate: number;
        name: string;
        priceBaseQty: number;
        priceForBase: number;
        safeEstimate: number;
        unit: string;
        updatedAt: number;
      }>
    >;
    getProduct: FunctionReference<
      "query",
      "public",
      { productId: Id<"products"> },
      {
        _creationTime: number;
        _id: Id<"products">;
        createdAt: number;
        estimate: number;
        name: string;
        priceBaseQty: number;
        priceForBase: number;
        safeEstimate: number;
        unit: string;
        updatedAt: number;
      } | null
    >;
    adjustEstimate: FunctionReference<
      "mutation",
      "public",
      {
        bank?: "cash" | "card";
        comment?: string;
        expiresAt?: number;
        productId: Id<"products">;
        quantity: number;
        type: "plus" | "minus";
      },
      { error?: string; estimate: number; ok: boolean }
    >;
    listTransactionsByProduct: FunctionReference<
      "query",
      "public",
      { productId: Id<"products"> },
      Array<{
        _creationTime: number;
        _id: Id<"productTransactions">;
        comment?: string;
        createdAt: number;
        date: number;
        estimate: number;
        productId: Id<"products">;
        quantity: number;
        type: "plus" | "minus";
      }>
    >;
    listBatchesByProduct: FunctionReference<
      "query",
      "public",
      { productId: Id<"products"> },
      Array<{
        _creationTime: number;
        _id: Id<"productEstimates">;
        createdAt: number;
        estimate: number;
        expiresAt: number;
        productId: Id<"products">;
        quantity: number;
        updatedAt: number;
      }>
    >;
    listExpirySummary: FunctionReference<
      "query",
      "public",
      { until: number },
      Array<{
        breakdown: Array<{ expiresAt: number; quantity: number }>;
        productId: Id<"products">;
        productName: string;
        totalExpired: number;
      }>
    >;
  };
  auth: {
    isAuthenticated: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      any
    >;
    signIn: FunctionReference<
      "action",
      "public",
      {
        calledBy?: string;
        params?: any;
        provider?: string;
        refreshToken?: string;
        verifier?: string;
      },
      any
    >;
    signOut: FunctionReference<"action", "public", Record<string, never>, any>;
  };
  clients: {
    getByTelegramId: FunctionReference<
      "query",
      "public",
      { tgId: string },
      {
        _creationTime: number;
        _id: Id<"clients">;
        address_pool: Array<{
          address: string;
          apartment?: string;
          comment?: string;
          entrance?: string;
          floor?: string;
          label?: string;
        }>;
        cart: Array<{
          menuPositionId: Id<"menuPositions">;
          notes?: string;
          quantity: number;
        }>;
        chatId?: string;
        createdAt: number;
        firstName?: string;
        hasSeenMenuIntro: boolean;
        isActive: boolean;
        lastActivity: number;
        lastName?: string;
        name?: string;
        name_pool?: Array<string>;
        navStack?: Array<{
          categoryId?: Id<"categories">;
          menuPositionId?: Id<"menuPositions">;
          step: string;
        }>;
        phone?: string;
        phone_pool?: Array<string>;
        role: "user" | "admin" | "bartender" | "cook" | "courier";
        settings?: {
          language: string;
          notifications: boolean;
          timezone?: string;
        };
        tgId?: string;
        username?: string;
      } | null
    >;
    getById: FunctionReference<
      "query",
      "public",
      { clientId: Id<"clients"> },
      {
        _id: Id<"clients">;
        chatId?: string;
        name?: string;
        tgId?: string;
      } | null
    >;
    create: FunctionReference<
      "mutation",
      "public",
      {
        chatId?: string;
        firstName?: string;
        lastName?: string;
        name?: string;
        phone?: string;
        tgId?: string;
        username?: string;
      },
      Id<"clients">
    >;
    findByPhone: FunctionReference<
      "query",
      "public",
      { phone: string },
      Array<{
        _id: Id<"clients">;
        address_pool: Array<{
          address: string;
          apartment?: string;
          comment?: string;
          entrance?: string;
          floor?: string;
          label?: string;
        }>;
        name?: string;
        name_pool?: Array<string>;
        phone?: string;
        phone_pool?: Array<string>;
      }>
    >;
    updateActivity: FunctionReference<
      "mutation",
      "public",
      { clientId: Id<"clients"> },
      null
    >;
    markMenuIntroSeen: FunctionReference<
      "mutation",
      "public",
      { clientId: Id<"clients"> },
      null
    >;
    navInit: FunctionReference<
      "mutation",
      "public",
      {
        categoryId?: Id<"categories">;
        clientId: Id<"clients">;
        menuPositionId?: Id<"menuPositions">;
        step: string;
      },
      null
    >;
    navPush: FunctionReference<
      "mutation",
      "public",
      {
        categoryId?: Id<"categories">;
        clientId: Id<"clients">;
        menuPositionId?: Id<"menuPositions">;
        step: string;
      },
      null
    >;
    navBack: FunctionReference<
      "mutation",
      "public",
      { clientId: Id<"clients"> },
      {
        categoryId: Id<"categories"> | null;
        menuPositionId: Id<"menuPositions"> | null;
        step: string | "";
      } | null
    >;
    getStats: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      { active: number; admins: number; total: number }
    >;
    list: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      Array<{
        _creationTime: number;
        _id: Id<"clients">;
        address_pool: Array<{
          address: string;
          apartment?: string;
          comment?: string;
          entrance?: string;
          floor?: string;
          label?: string;
        }>;
        chatId?: string;
        createdAt: number;
        firstName?: string;
        lastActivity: number;
        lastName?: string;
        name?: string;
        name_pool?: Array<string>;
        phone?: string;
        phone_pool?: Array<string>;
        tgId?: string;
        username?: string;
      }>
    >;
    updateSettings: FunctionReference<
      "mutation",
      "public",
      {
        clientId: Id<"clients">;
        settings: {
          language: string;
          notifications: boolean;
          timezone?: string;
        };
      },
      null
    >;
    updateRole: FunctionReference<
      "mutation",
      "public",
      { clientId: Id<"clients">; role: "user" | "admin" },
      null
    >;
    addToCart: FunctionReference<
      "mutation",
      "public",
      {
        clientId: Id<"clients">;
        menuPositionId: Id<"menuPositions">;
        quantity?: number;
      },
      null
    >;
    removeFromCart: FunctionReference<
      "mutation",
      "public",
      { clientId: Id<"clients">; menuPositionId: Id<"menuPositions"> },
      null
    >;
    clearCart: FunctionReference<
      "mutation",
      "public",
      { clientId: Id<"clients"> },
      null
    >;
    getCartDetails: FunctionReference<
      "query",
      "public",
      { clientId: Id<"clients"> },
      {
        items: Array<{
          lineTotal: number;
          menuPositionId: Id<"menuPositions">;
          name: string;
          quantity: number;
          unitPrice: number;
        }>;
        subtotal: number;
      }
    >;
  };
  logs: {
    create: FunctionReference<
      "mutation",
      "public",
      {
        action: string;
        level: "info" | "warning" | "error";
        message: string;
        metadata?: {
          chatId?: string;
          clientId?: Id<"clients">;
          error?: string;
        };
      },
      Id<"logs">
    >;
    cleanupOldLogs: FunctionReference<
      "mutation",
      "public",
      Record<string, never>,
      null
    >;
    getByLevel: FunctionReference<
      "query",
      "public",
      { level: "info" | "warning" | "error"; limit?: number },
      Array<{
        _creationTime: number;
        _id: Id<"logs">;
        action: string;
        createdAt: number;
        level: "info" | "warning" | "error";
        message: string;
        metadata?: {
          chatId?: string;
          clientId?: Id<"clients">;
          error?: string;
        };
      }>
    >;
    getByAction: FunctionReference<
      "query",
      "public",
      { action: string; limit?: number },
      Array<{
        _creationTime: number;
        _id: Id<"logs">;
        action: string;
        createdAt: number;
        level: "info" | "warning" | "error";
        message: string;
        metadata?: {
          chatId?: string;
          clientId?: Id<"clients">;
          error?: string;
        };
      }>
    >;
    getRecent: FunctionReference<
      "query",
      "public",
      { limit?: number },
      Array<{
        _creationTime: number;
        _id: Id<"logs">;
        action: string;
        createdAt: number;
        level: "info" | "warning" | "error";
        message: string;
        metadata?: {
          chatId?: string;
          clientId?: Id<"clients">;
          error?: string;
        };
      }>
    >;
  };
  messages: {
    save: FunctionReference<
      "mutation",
      "public",
      {
        chatId: string;
        clientId: Id<"clients">;
        isFromBot: boolean;
        metadata?: {
          hasDocument?: boolean;
          hasPhoto?: boolean;
          hasVideo?: boolean;
          hasVoice?: boolean;
          messageType?: string;
        };
        telegramMessageId: string;
        text?: string;
        type: "text" | "photo" | "document" | "voice" | "video";
      },
      Id<"messages">
    >;
    getByClient: FunctionReference<
      "query",
      "public",
      { clientId: Id<"clients">; limit?: number },
      Array<{
        _creationTime: number;
        _id: Id<"messages">;
        chatId: string;
        clientId: Id<"clients">;
        createdAt: number;
        isFromBot: boolean;
        metadata?: {
          hasDocument?: boolean;
          hasPhoto?: boolean;
          hasVideo?: boolean;
          hasVoice?: boolean;
          messageType?: string;
        };
        telegramMessageId: string;
        text?: string;
        type: "text" | "photo" | "document" | "voice" | "video";
      }>
    >;
    getStats: FunctionReference<
      "query",
      "public",
      { clientId?: Id<"clients">; timeRange?: "day" | "week" | "month" },
      {
        byType: {
          document: number;
          photo: number;
          text: number;
          video: number;
          voice: number;
        };
        fromBot: number;
        fromUsers: number;
        total: number;
      }
    >;
    getByChat: FunctionReference<
      "query",
      "public",
      { chatId: string; limit?: number },
      Array<{
        _creationTime: number;
        _id: Id<"messages">;
        chatId: string;
        clientId: Id<"clients">;
        createdAt: number;
        isFromBot: boolean;
        metadata?: {
          hasDocument?: boolean;
          hasPhoto?: boolean;
          hasVideo?: boolean;
          hasVoice?: boolean;
          messageType?: string;
        };
        telegramMessageId: string;
        text?: string;
        type: "text" | "photo" | "document" | "voice" | "video";
      }>
    >;
  };
  myFunctions: {
    listNumbers: FunctionReference<"query", "public", { count: number }, any>;
    addNumber: FunctionReference<"mutation", "public", { value: number }, any>;
    myAction: FunctionReference<
      "action",
      "public",
      { first: number; second: string },
      any
    >;
  };
  orders: {
    assignCourier: FunctionReference<
      "mutation",
      "public",
      { courierId: Id<"users">; orderId: Id<"orders"> },
      { ok: boolean }
    >;
    courierAccept: FunctionReference<
      "mutation",
      "public",
      { deliveryMinutes: number; orderId: Id<"orders"> },
      { ok: boolean }
    >;
    startCheckout: FunctionReference<
      "mutation",
      "public",
      { clientId: Id<"clients"> },
      null
    >;
    setTempPositions: FunctionReference<
      "mutation",
      "public",
      {
        clientId: Id<"clients">;
        items: Array<{
          comment?: string;
          menuPositionId: Id<"menuPositions">;
          quantity: number;
        }>;
      },
      null
    >;
    setTempClient: FunctionReference<
      "mutation",
      "public",
      { clientId: Id<"clients">; name?: string; phone?: string },
      null
    >;
    setName: FunctionReference<
      "mutation",
      "public",
      { clientId: Id<"clients">; name: string },
      null
    >;
    setPhone: FunctionReference<
      "mutation",
      "public",
      { clientId: Id<"clients">; phone: string },
      null
    >;
    setOrderType: FunctionReference<
      "mutation",
      "public",
      {
        clientId: Id<"clients">;
        type: "delivery" | "restaurant" | "self-service";
      },
      null
    >;
    setAddress: FunctionReference<
      "mutation",
      "public",
      { address: string; clientId: Id<"clients"> },
      null
    >;
    setPaymentMethod: FunctionReference<
      "mutation",
      "public",
      { clientId: Id<"clients">; method: "cash" | "card" | "online" },
      null
    >;
    applyPromocode: FunctionReference<
      "mutation",
      "public",
      { clientId: Id<"clients">; code: string },
      { message: string; ok: boolean }
    >;
    getPreview: FunctionReference<
      "query",
      "public",
      { clientId: Id<"clients"> },
      {
        address?: string;
        clientInfo: { name?: string; phone?: string };
        deliveryFee: number;
        discountTotal: number;
        items: Array<{
          discountedLineTotal?: number;
          id: Id<"menuPositions">;
          lineTotal: number;
          name: string;
          qty: number;
          unitPrice: number;
        }>;
        payment_method?: "cash" | "card" | "online";
        promocode?: string;
        subtotal: number;
        total: number;
        type?: "delivery" | "restaurant" | "self-service";
      } | null
    >;
    confirmOrder: FunctionReference<
      "mutation",
      "public",
      { clientId: Id<"clients"> },
      { ok: boolean; orderId: Id<"orders"> } | { error: string; ok: boolean }
    >;
    notifyClient: FunctionReference<
      "action",
      "public",
      { clientId: Id<"clients">; message: string },
      { error?: string; ok: boolean }
    >;
    acceptOrder: FunctionReference<
      "mutation",
      "public",
      { estimateMinutes: number; orderId: Id<"orders"> },
      { ok: boolean }
    >;
    setPreparedPositions: FunctionReference<
      "mutation",
      "public",
      {
        orderId: Id<"orders">;
        prepared: Array<{ id: Id<"menuPositions">; prepared: boolean }>;
      },
      { ok: boolean }
    >;
    completePending: FunctionReference<
      "mutation",
      "public",
      { orderId: Id<"orders"> },
      { ok: boolean }
    >;
    completeReady: FunctionReference<
      "mutation",
      "public",
      { orderId: Id<"orders"> },
      { ok: boolean }
    >;
    openShift: FunctionReference<
      "mutation",
      "public",
      { userId: Id<"users"> },
      { ok: boolean }
    >;
    rejectOrder: FunctionReference<
      "mutation",
      "public",
      { orderId: Id<"orders">; refusedPositionIds: Array<Id<"menuPositions">> },
      { ok: boolean }
    >;
    listByDate: FunctionReference<
      "query",
      "public",
      { from: number; to: number },
      {
        backlog: Array<{
          _id: Id<"orders">;
          acceptedAt?: number;
          address?: string;
          client: { name: string; phone: string };
          clientId: Id<"clients">;
          clientInfo: { name: string; phone: string };
          courierId?: Id<"users">;
          createdAt: number;
          delivery?: { address: string };
          deliveryAcceptedAt?: number;
          deliveryDue?: number;
          deliveryFee: number;
          discountTotal: number;
          dueAt?: number;
          estimateMinutes?: number;
          is_paid: boolean;
          payment_method: "cash" | "card" | "online";
          positions: Array<{
            categoryId?: Id<"categories">;
            comment?: string;
            id: Id<"menuPositions">;
            lineTotal: number;
            name: string;
            photo?: string;
            prepared?: boolean;
            quantity: number;
            unitPrice: number;
          }>;
          promocode?: string;
          readyAt?: number;
          status:
            | "backlog"
            | "accepted"
            | "pending"
            | "ready"
            | "delivery"
            | "completed"
            | "cancelled"
            | "refund";
          subtotal: number;
          total: number;
          type: "delivery" | "restaurant" | "self-service";
          updatedAt: number;
        }>;
        completed: Array<{
          _id: Id<"orders">;
          acceptedAt?: number;
          address?: string;
          client: { name: string; phone: string };
          clientId: Id<"clients">;
          clientInfo: { name: string; phone: string };
          courierId?: Id<"users">;
          createdAt: number;
          delivery?: { address: string };
          deliveryAcceptedAt?: number;
          deliveryDue?: number;
          deliveryFee: number;
          discountTotal: number;
          dueAt?: number;
          estimateMinutes?: number;
          is_paid: boolean;
          payment_method: "cash" | "card" | "online";
          positions: Array<{
            categoryId?: Id<"categories">;
            comment?: string;
            id: Id<"menuPositions">;
            lineTotal: number;
            name: string;
            photo?: string;
            prepared?: boolean;
            quantity: number;
            unitPrice: number;
          }>;
          promocode?: string;
          readyAt?: number;
          status:
            | "backlog"
            | "accepted"
            | "pending"
            | "ready"
            | "delivery"
            | "completed"
            | "cancelled"
            | "refund";
          subtotal: number;
          total: number;
          type: "delivery" | "restaurant" | "self-service";
          updatedAt: number;
        }>;
        delivery: Array<{
          _id: Id<"orders">;
          acceptedAt?: number;
          address?: string;
          client: { name: string; phone: string };
          clientId: Id<"clients">;
          clientInfo: { name: string; phone: string };
          courierId?: Id<"users">;
          createdAt: number;
          delivery?: { address: string };
          deliveryAcceptedAt?: number;
          deliveryDue?: number;
          deliveryFee: number;
          discountTotal: number;
          dueAt?: number;
          estimateMinutes?: number;
          is_paid: boolean;
          payment_method: "cash" | "card" | "online";
          positions: Array<{
            categoryId?: Id<"categories">;
            comment?: string;
            id: Id<"menuPositions">;
            lineTotal: number;
            name: string;
            photo?: string;
            prepared?: boolean;
            quantity: number;
            unitPrice: number;
          }>;
          promocode?: string;
          readyAt?: number;
          status:
            | "backlog"
            | "accepted"
            | "pending"
            | "ready"
            | "delivery"
            | "completed"
            | "cancelled"
            | "refund";
          subtotal: number;
          total: number;
          type: "delivery" | "restaurant" | "self-service";
          updatedAt: number;
        }>;
        delivery_pending: Array<{
          _id: Id<"orders">;
          acceptedAt?: number;
          address?: string;
          client: { name: string; phone: string };
          clientId: Id<"clients">;
          clientInfo: { name: string; phone: string };
          courierId?: Id<"users">;
          createdAt: number;
          delivery?: { address: string };
          deliveryAcceptedAt?: number;
          deliveryDue?: number;
          deliveryFee: number;
          discountTotal: number;
          dueAt?: number;
          estimateMinutes?: number;
          is_paid: boolean;
          payment_method: "cash" | "card" | "online";
          positions: Array<{
            categoryId?: Id<"categories">;
            comment?: string;
            id: Id<"menuPositions">;
            lineTotal: number;
            name: string;
            photo?: string;
            prepared?: boolean;
            quantity: number;
            unitPrice: number;
          }>;
          promocode?: string;
          readyAt?: number;
          status:
            | "backlog"
            | "accepted"
            | "pending"
            | "ready"
            | "delivery"
            | "delivery_pending"
            | "completed"
            | "cancelled"
            | "refund";
          subtotal: number;
          total: number;
          type: "delivery" | "restaurant" | "self-service";
          updatedAt: number;
        }>;
        pending: Array<{
          _id: Id<"orders">;
          acceptedAt?: number;
          address?: string;
          client: { name: string; phone: string };
          clientId: Id<"clients">;
          clientInfo: { name: string; phone: string };
          courierId?: Id<"users">;
          createdAt: number;
          delivery?: { address: string };
          deliveryAcceptedAt?: number;
          deliveryDue?: number;
          deliveryFee: number;
          discountTotal: number;
          dueAt?: number;
          estimateMinutes?: number;
          is_paid: boolean;
          payment_method: "cash" | "card" | "online";
          positions: Array<{
            categoryId?: Id<"categories">;
            comment?: string;
            id: Id<"menuPositions">;
            lineTotal: number;
            name: string;
            photo?: string;
            prepared?: boolean;
            quantity: number;
            unitPrice: number;
          }>;
          promocode?: string;
          readyAt?: number;
          status:
            | "backlog"
            | "accepted"
            | "pending"
            | "ready"
            | "delivery"
            | "completed"
            | "cancelled"
            | "refund";
          subtotal: number;
          total: number;
          type: "delivery" | "restaurant" | "self-service";
          updatedAt: number;
        }>;
        ready: Array<{
          _id: Id<"orders">;
          acceptedAt?: number;
          address?: string;
          client: { name: string; phone: string };
          clientId: Id<"clients">;
          clientInfo: { name: string; phone: string };
          courierId?: Id<"users">;
          createdAt: number;
          delivery?: { address: string };
          deliveryAcceptedAt?: number;
          deliveryDue?: number;
          deliveryFee: number;
          discountTotal: number;
          dueAt?: number;
          estimateMinutes?: number;
          is_paid: boolean;
          payment_method: "cash" | "card" | "online";
          positions: Array<{
            categoryId?: Id<"categories">;
            comment?: string;
            id: Id<"menuPositions">;
            lineTotal: number;
            name: string;
            photo?: string;
            prepared?: boolean;
            quantity: number;
            unitPrice: number;
          }>;
          promocode?: string;
          readyAt?: number;
          status:
            | "backlog"
            | "accepted"
            | "pending"
            | "ready"
            | "delivery"
            | "completed"
            | "cancelled"
            | "refund";
          subtotal: number;
          total: number;
          type: "delivery" | "restaurant" | "self-service";
          updatedAt: number;
        }>;
      }
    >;
    getDetails: FunctionReference<
      "query",
      "public",
      { orderId: Id<"orders"> },
      {
        _id: Id<"orders">;
        acceptedAt?: number;
        address?: string;
        client: { name: string; phone: string };
        courierId?: Id<"users">;
        createdAt: number;
        deliveryAcceptedAt?: number;
        deliveryDue?: number;
        deliveryFee: number;
        discountTotal: number;
        dueAt?: number;
        estimateMinutes?: number;
        is_paid: boolean;
        moneyTransactions: Array<{
          _id: Id<"moneyTransactions">;
          amount: number;
          bankName: "cash" | "card";
          comment?: string;
          date: number;
          estimate: number;
          reason: "sale" | "direct" | "productBuy";
          type: "plus" | "minus";
        }>;
        payment_method: "cash" | "card" | "online";
        positions: Array<{
          id: Id<"menuPositions">;
          lineTotal: number;
          name: string;
          prepared?: boolean;
          quantity: number;
          unitPrice: number;
        }>;
        productTransactions: Array<{
          _id: Id<"productTransactions">;
          comment?: string;
          date: number;
          estimate: number;
          productId: Id<"products">;
          productName: string;
          quantity: number;
          type: "plus" | "minus";
        }>;
        promocode?: string;
        readyAt?: number;
        status:
          | "backlog"
          | "accepted"
          | "pending"
          | "ready"
          | "delivery"
          | "delivery_pending"
          | "completed"
          | "cancelled"
          | "refund";
        subtotal: number;
        total: number;
        type: "delivery" | "restaurant" | "self-service";
        updatedAt: number;
      } | null
    >;
    listByClient: FunctionReference<
      "query",
      "public",
      { clientId: Id<"clients"> },
      Array<{
        _id: Id<"orders">;
        createdAt: number;
        status:
          | "backlog"
          | "accepted"
          | "pending"
          | "ready"
          | "delivery"
          | "delivery_pending"
          | "completed"
          | "cancelled"
          | "refund";
        total: number;
        type: "delivery" | "restaurant" | "self-service";
        updatedAt: number;
      }>
    >;
  };
  restaurant: {
    createCategory: FunctionReference<
      "mutation",
      "public",
      { description?: string; image?: string; name: string },
      Id<"categories">
    >;
    listCategories: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      Array<{
        _creationTime: number;
        _id: Id<"categories">;
        description?: string;
        image?: string;
        name: string;
      }>
    >;
    getCategory: FunctionReference<
      "query",
      "public",
      { categoryId: Id<"categories"> },
      {
        _creationTime: number;
        _id: Id<"categories">;
        description?: string;
        image?: string;
        name: string;
      } | null
    >;
    updateCategory: FunctionReference<
      "mutation",
      "public",
      {
        categoryId: Id<"categories">;
        description?: string;
        image?: string;
        name: string;
      },
      null
    >;
    deleteCategory: FunctionReference<
      "mutation",
      "public",
      { categoryId: Id<"categories"> },
      null
    >;
    createMenuPosition: FunctionReference<
      "mutation",
      "public",
      {
        articleNumber: number;
        categoryId: Id<"categories">;
        discountPrice?: number;
        ingredients?: Array<{ productId: Id<"products">; quantity: number }>;
        name: string;
        photo?: string;
        price: number;
        structure: string;
        weight: number;
      },
      Id<"menuPositions">
    >;
    listMenuPositions: FunctionReference<
      "query",
      "public",
      { categoryId?: Id<"categories"> },
      Array<{
        _creationTime: number;
        _id: Id<"menuPositions">;
        articleNumber: number;
        categoryId: Id<"categories">;
        categoryName: string;
        discountPrice?: number;
        ingredients?: Array<{ productId: Id<"products">; quantity: number }>;
        name: string;
        photo?: string;
        price: number;
        structure: string;
        weight: number;
      }>
    >;
    listPromocodes: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      Array<{
        _creationTime: number;
        _id: Id<"promocodes">;
        categoryId?: Id<"categories">;
        code: string;
        condOrderType?: "delivery" | "self-service";
        condOrderTypeEnabled?: boolean;
        condThresholdEnabled?: boolean;
        condThresholdValue?: number;
        createdAt: number;
        expiresAt?: number;
        isActive: boolean;
        name?: string;
        positionId?: Id<"menuPositions">;
        scope: "order" | "category" | "position";
        type: "fixed" | "percent";
        updatedAt: number;
        value: number;
      }>
    >;
    createPromocode: FunctionReference<
      "mutation",
      "public",
      {
        categoryId?: Id<"categories">;
        code: string;
        condOrderType?: "delivery" | "self-service";
        condOrderTypeEnabled?: boolean;
        condThresholdEnabled?: boolean;
        condThresholdValue?: number;
        expiresAt?: number;
        isActive: boolean;
        name?: string;
        positionId?: Id<"menuPositions">;
        scope: "order" | "category" | "position";
        type: "fixed" | "percent";
        value: number;
      },
      Id<"promocodes">
    >;
    updatePromocode: FunctionReference<
      "mutation",
      "public",
      {
        categoryId?: Id<"categories">;
        code?: string;
        condOrderType?: "delivery" | "self-service";
        condOrderTypeEnabled?: boolean;
        condThresholdEnabled?: boolean;
        condThresholdValue?: number;
        expiresAt?: number;
        isActive?: boolean;
        name?: string;
        positionId?: Id<"menuPositions">;
        promoId: Id<"promocodes">;
        scope?: "order" | "category" | "position";
        type?: "fixed" | "percent";
        value?: number;
      },
      null
    >;
    deletePromocode: FunctionReference<
      "mutation",
      "public",
      { promoId: Id<"promocodes"> },
      null
    >;
    listMenuPositionsByCategory: FunctionReference<
      "query",
      "public",
      { categoryId: Id<"categories"> },
      Array<{
        _creationTime: number;
        _id: Id<"menuPositions">;
        articleNumber: number;
        categoryId: Id<"categories">;
        discountPrice?: number;
        ingredients?: Array<{ productId: Id<"products">; quantity: number }>;
        name: string;
        photo?: string;
        price: number;
        structure: string;
        weight: number;
      }>
    >;
    listMenuPositionsByCategoryPaged: FunctionReference<
      "query",
      "public",
      { categoryId: Id<"categories">; page: number; pageSize: number },
      {
        items: Array<{
          _creationTime: number;
          _id: Id<"menuPositions">;
          articleNumber: number;
          categoryId: Id<"categories">;
          discountPrice?: number;
          ingredients?: Array<{ productId: Id<"products">; quantity: number }>;
          name: string;
          photo?: string;
          price: number;
          structure: string;
          weight: number;
        }>;
        page: number;
        totalItems: number;
        totalPages: number;
      }
    >;
    getMenuPosition: FunctionReference<
      "query",
      "public",
      { menuPositionId: Id<"menuPositions"> },
      {
        _creationTime: number;
        _id: Id<"menuPositions">;
        articleNumber: number;
        categoryId: Id<"categories">;
        categoryName: string;
        discountPrice?: number;
        ingredients?: Array<{ productId: Id<"products">; quantity: number }>;
        name: string;
        photo?: string;
        price: number;
        structure: string;
        weight: number;
      } | null
    >;
    updateMenuPosition: FunctionReference<
      "mutation",
      "public",
      {
        articleNumber: number;
        categoryId: Id<"categories">;
        discountPrice?: number;
        ingredients?: Array<{ productId: Id<"products">; quantity: number }>;
        menuPositionId: Id<"menuPositions">;
        name: string;
        photo?: string;
        price: number;
        structure: string;
        weight: number;
      },
      null
    >;
    deleteMenuPosition: FunctionReference<
      "mutation",
      "public",
      { menuPositionId: Id<"menuPositions"> },
      null
    >;
    generateUploadUrl: FunctionReference<
      "mutation",
      "public",
      Record<string, never>,
      string
    >;
    saveFileInfo: FunctionReference<
      "mutation",
      "public",
      { fileName: string; storageId: Id<"_storage"> },
      string
    >;
    createCallbackToken: FunctionReference<
      "mutation",
      "public",
      {
        categoryId?: Id<"categories">;
        itemId?: Id<"menuPositions">;
        kind:
          | "cat_page"
          | "cat_item"
          | "item_back"
          | "item_cat"
          | "item_cart"
          | "cart_rm";
        page?: number;
        ttlSec?: number;
      },
      string
    >;
    resolveCallbackToken: FunctionReference<
      "query",
      "public",
      { token: string },
      {
        categoryId?: Id<"categories">;
        itemId?: Id<"menuPositions">;
        kind:
          | "cat_page"
          | "cat_item"
          | "item_back"
          | "item_cat"
          | "item_cart"
          | "cart_rm";
        page?: number;
      } | null
    >;
  };
};
export type InternalApiType = {};
