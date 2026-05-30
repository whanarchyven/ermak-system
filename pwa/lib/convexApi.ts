import { anyApi } from "convex/server";

// PWA использует тот же self-hosted Convex backend, что и ERP.
// Типы функций живут в ermak-system/convex; здесь обращаемся по имени через anyApi.
export const api: any = anyApi;
