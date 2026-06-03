#!/usr/bin/env bash
# Запускает весь стек одной командой: self-hosted Convex + ERP + PWA.
# Использование: ./scripts/up.sh [dev|prod]
set -euo pipefail

MODE="${1:-prod}"
cd "$(dirname "$0")/.."

COMPOSE=(docker compose -f docker-compose.yml)
if [ "$MODE" = "dev" ]; then
  COMPOSE+=(-f docker-compose.dev.yml)
fi
ARCH="$(uname -m)"
if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
  COMPOSE+=(-f docker-compose.arm64.yml)
  echo "[up] ARM64 ($ARCH): platform linux/arm64"
fi

# 1) .env по умолчанию
if [ ! -f .env ]; then
  echo "[up] Создаю .env из .env.example"
  cp .env.example .env
fi

# 2) Поднимаем Convex backend + dashboard
echo "[up] Запуск Convex backend и dashboard ..."
"${COMPOSE[@]}" up -d backend dashboard

# 3) Ждём готовности backend
BID="$("${COMPOSE[@]}" ps -q backend)"
echo "[up] Ожидание готовности backend ..."
for _ in $(seq 1 60); do
  STATUS="$(docker inspect -f '{{.State.Health.Status}}' "$BID" 2>/dev/null || echo starting)"
  [ "$STATUS" = "healthy" ] && break
  sleep 2
done
echo "[up] backend: ${STATUS:-unknown}"
if [ "${STATUS:-}" != "healthy" ]; then
  echo "[up] ОШИБКА: backend не стартовал. Логи:" >&2
  "${COMPOSE[@]}" logs backend --tail=40 >&2 || true
  echo "[up] Подсказка: на ARM (Orange Pi) проверьте RAM/swap и: docker compose logs backend" >&2
  exit 1
fi

# 4) Генерируем admin key (один раз) и кладём в .env
if ! grep -qE '^CONVEX_SELF_HOSTED_ADMIN_KEY=.+' .env; then
  echo "[up] Генерация admin key ..."
  RAW="$("${COMPOSE[@]}" exec -T backend ./generate_admin_key.sh 2>/dev/null || true)"
  KEY="$(printf '%s\n' "$RAW" | grep -Eo '[A-Za-z0-9_-]+\|[A-Za-z0-9_-]+' | tail -n1)"
  if [ -z "$KEY" ]; then
    echo "[up] ОШИБКА: не удалось получить admin key. Вывод:" >&2
    printf '%s\n' "$RAW" >&2
    exit 1
  fi
  # удаляем пустой плейсхолдер, если есть
  if grep -qE '^CONVEX_SELF_HOSTED_ADMIN_KEY=' .env; then
    sed -i.bak '/^CONVEX_SELF_HOSTED_ADMIN_KEY=/d' .env && rm -f .env.bak
  fi
  echo "CONVEX_SELF_HOSTED_ADMIN_KEY=$KEY" >> .env
  echo "[up] admin key сохранён в .env"
fi

# 5) Поднимаем deployer + приложения
echo "[up] Сборка и запуск deployer, ERP и PWA ..."
"${COMPOSE[@]}" up -d --build deployer erp pwa

echo ""
echo "================ Готово ($MODE) ================"
echo " ERP:        http://localhost:${ERP_PORT:-3000}"
echo " PWA:        http://localhost:${PWA_PORT:-3001}"
echo " Dashboard:  http://localhost:${DASHBOARD_PORT:-6791}"
echo " Convex API: http://localhost:${CONVEX_PORT:-3210}"
echo " Админ ERP:  admin@ermak.local / admin123"
echo "-----------------------------------------------"
echo " Convex admin key (для дашборда):"
grep -E '^CONVEX_SELF_HOSTED_ADMIN_KEY=' .env | sed 's/^/   /' || echo "   (не найден)"
echo " Полный список ключей (включая VAPID Web Push): make keys"
echo "==============================================="
