/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as auth from "../auth.js";
import type * as clients from "../clients.js";
import type * as customer from "../customer.js";
import type * as http from "../http.js";
import type * as logs from "../logs.js";
import type * as messages from "../messages.js";
import type * as myFunctions from "../myFunctions.js";
import type * as notifications from "../notifications.js";
import type * as orders from "../orders.js";
import type * as push from "../push.js";
import type * as restaurant from "../restaurant.js";
import type * as seed from "../seed.js";
import type * as settings from "../settings.js";
import type * as transactions from "../transactions.js";
import type * as users from "../users.js";
import type * as warehouse from "../warehouse.js";
import type * as workshops from "../workshops.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  clients: typeof clients;
  customer: typeof customer;
  http: typeof http;
  logs: typeof logs;
  messages: typeof messages;
  myFunctions: typeof myFunctions;
  notifications: typeof notifications;
  orders: typeof orders;
  push: typeof push;
  restaurant: typeof restaurant;
  seed: typeof seed;
  settings: typeof settings;
  transactions: typeof transactions;
  users: typeof users;
  warehouse: typeof warehouse;
  workshops: typeof workshops;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
