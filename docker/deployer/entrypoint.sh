#!/usr/bin/env bash
set -euo pipefail

export CONVEX_SELF_HOSTED_URL="${CONVEX_SELF_HOSTED_URL:-http://backend:3210}"

echo "[deployer] Ожидание готовности backend на ${CONVEX_SELF_HOSTED_URL} ..."
until curl -sf "${CONVEX_SELF_HOSTED_URL}/version" >/dev/null 2>&1; do
  sleep 2
done
echo "[deployer] backend готов."

if [ -z "${CONVEX_SELF_HOSTED_ADMIN_KEY:-}" ]; then
  echo "[deployer] ОШИБКА: CONVEX_SELF_HOSTED_ADMIN_KEY не задан." >&2
  exit 1
fi
export CONVEX_SELF_HOSTED_ADMIN_KEY

# 1) Переменные окружения деплоймента (idempotent)
echo "[deployer] Настройка переменных окружения деплоймента ..."
node /deployer/setup-env.mjs

DEPLOY_MODE="${DEPLOY_MODE:-prod}"

if [ "$DEPLOY_MODE" = "dev" ]; then
  echo "[deployer] DEV: первичный пуш функций ..."
  npx convex dev --once
  echo "[deployer] DEV: сид данных ..."
  npx convex run seed:run || echo "[deployer] seed пропущен/ошибка (не критично)"
  echo "[deployer] DEV: запуск watch-режима (convex dev) ..."
  exec npx convex dev
else
  echo "[deployer] PROD: деплой функций ..."
  npx convex deploy -y
  echo "[deployer] PROD: сид данных ..."
  npx convex run seed:run || echo "[deployer] seed пропущен/ошибка (не критично)"
  echo "[deployer] PROD: готово."
fi
