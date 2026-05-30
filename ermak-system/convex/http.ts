import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: "/api/notify",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const { clientId, text } = (await req.json()) as { clientId: string; text: string };
      if (!clientId || !text) return new Response("Bad request", { status: 400 });
      await ctx.runAction(api.orders.notifyClient, { clientId: clientId as any, message: text });
      return new Response("ok", { status: 200 });
    } catch (e: any) {
      return new Response(e?.message || "error", { status: 500 });
    }
  }),
});

export default http;
