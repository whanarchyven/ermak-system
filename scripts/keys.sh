#!/usr/bin/env bash
# Показывает ключи и доступы: Convex admin key (.env) и VAPID-ключи Web Push.
set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE=(docker compose -f docker-compose.yml)
if docker compose -f docker-compose.yml -f docker-compose.dev.yml ps deployer >/dev/null 2>&1; then
  COMPOSE+=(-f docker-compose.dev.yml)
fi

echo "================ Ключи и доступы ================"
echo
echo "— Convex self-hosted admin key (из .env) —"
if [ -f .env ] && grep -qE '^CONVEX_SELF_HOSTED_ADMIN_KEY=.+' .env; then
  grep -E '^CONVEX_SELF_HOSTED_ADMIN_KEY=' .env
else
  echo "(не найден — запустите 'make dev' или 'make prod')"
fi
echo
echo "— VAPID (Web Push) из деплоймента Convex —"
if "${COMPOSE[@]}" exec -T deployer sh -c 'echo ok' >/dev/null 2>&1; then
  PUB="$("${COMPOSE[@]}" exec -T deployer npx convex env get VAPID_PUBLIC_KEY 2>/dev/null | tr -d '\r' || true)"
  PRIV="$("${COMPOSE[@]}" exec -T deployer npx convex env get VAPID_PRIVATE_KEY 2>/dev/null | tr -d '\r' || true)"
  echo "VAPID_PUBLIC_KEY=${PUB:-<нет>}"
  echo "VAPID_PRIVATE_KEY=${PRIV:-<нет>}"
else
  echo "(контейнер deployer не запущен — ключи также видны в дашборде Convex → Settings → Environment Variables)"
fi
echo
echo "Dashboard Convex: http://localhost:${DASHBOARD_PORT:-6791}"
echo "ERP → Настройки: публичный VAPID-ключ и подсказки по admin key"
echo "================================================="
