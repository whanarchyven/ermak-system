import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isSignInPage = createRouteMatcher(["/signin"]);
const isProtectedRoute = createRouteMatcher(["/", "/server", "/menu", "/warehouse", "/employees", "/categories(.*)", "/kitchen(.*)", "/deliveries", "/promocodes", "/transactions", "/workshops", "/settings", "/clients(.*)"]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (isProtectedRoute(request) && !(await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, "/signin");
  }
  // Ограничение для бармена: только главная страница
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|; )app_role=([^;]+)/);
  const role = match ? decodeURIComponent(match[1]) : undefined;
  // После входа редиректим на главную; дальнейшие редиректы решаются на клиенте
  if (isSignInPage(request) && (await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, "/postlogin");
  }
  if (role === "bartender") {
    const url = new URL(request.url);
    if (url.pathname !== "/" && url.pathname !== "/signin" && url.pathname !== "/logout") {
      return nextjsMiddlewareRedirect(request, "/");
    }
  }
  if (role === "cook") {
    const url = new URL(request.url);
    const allowed = url.pathname.startsWith("/kitchen") || url.pathname === "/signin" || url.pathname === "/logout";
    if (!allowed) {
      return nextjsMiddlewareRedirect(request, "/kitchen");
    }
  }
  if (role === "courier") {
    const url = new URL(request.url);
    if (url.pathname !== "/deliveries" && url.pathname !== "/signin" && url.pathname !== "/logout") {
      return nextjsMiddlewareRedirect(request, "/deliveries");
    }
  }
  // admin only
  if (role !== "admin") {
    const url = new URL(request.url);
    if (["/promocodes", "/transactions", "/workshops", "/settings"].includes(url.pathname)) {
      return nextjsMiddlewareRedirect(request, "/");
    }
  }
});

export const config = {
  // The following matcher runs middleware on all routes
  // except static assets.
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
