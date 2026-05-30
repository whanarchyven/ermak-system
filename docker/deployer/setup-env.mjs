// Идемпотентно выставляет переменные окружения деплоймента Convex:
// - JWT_PRIVATE_KEY / JWKS (Convex Auth)
// - SITE_URL (Convex Auth redirect base)
// - VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT (Web Push)
import { execFileSync } from "node:child_process";
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";
import webpush from "web-push";

function envGet(name) {
  try {
    const out = execFileSync("npx", ["convex", "env", "get", name], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const v = (out || "").trim();
    return v.length ? v : null;
  } catch {
    return null;
  }
}

function envSet(name, value) {
  // "--" обязателен: значения вроде PKCS8-ключа начинаются с "-----BEGIN" и иначе
  // воспринимаются CLI как опция.
  execFileSync("npx", ["convex", "env", "set", "--", name, value], { stdio: "inherit" });
}

async function ensureAuthKeys() {
  const hasPriv = envGet("JWT_PRIVATE_KEY");
  const hasJwks = envGet("JWKS");
  if (hasPriv && hasJwks) {
    console.log("[setup-env] JWT_PRIVATE_KEY/JWKS уже заданы");
    return;
  }
  const keys = await generateKeyPair("RS256");
  const privateKey = await exportPKCS8(keys.privateKey);
  const publicKey = await exportJWK(keys.publicKey);
  const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });
  envSet("JWT_PRIVATE_KEY", `${privateKey.trimEnd().replace(/\n/g, " ")}`);
  envSet("JWKS", jwks);
  console.log("[setup-env] Сгенерированы ключи Convex Auth");
}

function ensureSiteUrl() {
  const site = process.env.CONVEX_AUTH_SITE_URL || "http://localhost:3001";
  if (envGet("SITE_URL") !== site) {
    envSet("SITE_URL", site);
    console.log(`[setup-env] SITE_URL=${site}`);
  }
}

function ensureVapid() {
  let pub = envGet("VAPID_PUBLIC_KEY");
  let priv = envGet("VAPID_PRIVATE_KEY");
  if (!pub || !priv) {
    const k = webpush.generateVAPIDKeys();
    pub = k.publicKey;
    priv = k.privateKey;
    envSet("VAPID_PUBLIC_KEY", pub);
    envSet("VAPID_PRIVATE_KEY", priv);
    console.log("[setup-env] Сгенерированы VAPID-ключи (Web Push)");
  }
  const subj = process.env.VAPID_SUBJECT || "mailto:admin@ermak.local";
  if (envGet("VAPID_SUBJECT") !== subj) {
    envSet("VAPID_SUBJECT", subj);
  }
}

await ensureAuthKeys();
ensureSiteUrl();
ensureVapid();
console.log("[setup-env] Готово");
