"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import webpush from "web-push";

/**
 * Отправка Web Push уведомления всем подпискам клиента.
 * VAPID-ключи берутся из переменных окружения деплоймента.
 */
export const sendWebPush = internalAction({
  args: {
    clientId: v.id("clients"),
    message: v.string(),
    title: v.optional(v.string()),
    url: v.optional(v.string()),
  },
  returns: v.object({ sent: v.number() }),
  handler: async (ctx, args): Promise<{ sent: number }> => {
    const pub = process.env.VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || "mailto:admin@ermak.local";
    if (!pub || !priv) {
      console.error("[sendWebPush] VAPID keys are not configured");
      return { sent: 0 };
    }
    webpush.setVapidDetails(subject, pub, priv);

    const subs = await ctx.runQuery(internal.customer.getPushSubscriptionsInternal, {
      clientId: args.clientId,
    });
    const payload = JSON.stringify({
      title: args.title || "Кафе Ермак",
      body: args.message,
      url: args.url || "/orders",
    });

    let sent = 0;
    for (const s of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        );
        sent++;
      } catch (e: any) {
        const code = e?.statusCode;
        if (code === 404 || code === 410) {
          await ctx.runMutation(internal.customer.removePushSubscriptionInternal, { id: s._id });
        } else {
          console.error("[sendWebPush] error", { code, message: e?.message });
        }
      }
    }
    return { sent };
  },
});
