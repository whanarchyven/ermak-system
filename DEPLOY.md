# Ермак — запуск стека (ERP + Convex + PWA)

Один стек в общей Docker-сети `ermak-net`:

- **backend** — self-hosted Convex (`ghcr.io/get-convex/convex-backend`), порты `3210` (API) и `3211` (HTTP actions)
- **dashboard** — Convex Dashboard (`6791`)
- **deployer** — служебный контейнер: генерирует ключи (Convex Auth + VAPID), пушит функции, сидит данные
- **erp** — административная панель (Next.js), порт `3000`
- **pwa** — клиентское приложение (Next.js PWA), порт `3001`

## Требования

- Docker Desktop (Docker Engine + Docker Compose v2)
- `make` (опционально; иначе используйте команды из раздела «Без make»)

Платные сервисы не нужны: SMS и онлайн-оплата не используются. VAPID-ключи для web-push генерируются автоматически.

## Быстрый старт

```bash
# DEV (горячая перезагрузка кода ERP/PWA и Convex-функций)
make dev

# PRODUCTION (сборка образов, оптимизированный запуск)
make prod
```

Адреса после запуска:

- ERP: http://localhost:3000 (вход: `admin@ermak.local` / `admin123`)
- PWA: http://localhost:3001
- Convex Dashboard: http://localhost:6791
- Convex API: http://localhost:3210

Первый запуск дольше: тянутся образы Convex, ставятся зависимости, пушатся функции и засеваются демо-данные (категории, меню с кэшбэком, администратор).

## Без make

```bash
# dev
./scripts/up.sh dev
# prod
./scripts/up.sh prod

# остановить
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
# удалить вместе с данными
docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v
```

## Как это работает

- `scripts/up.sh` поднимает backend, дожидается healthcheck, один раз генерирует **admin key**
  (`generate_admin_key.sh` внутри backend) и записывает его в `.env`.
- `deployer` через `CONVEX_SELF_HOSTED_URL` + admin key:
  1. выставляет переменные деплоймента (`JWT_PRIVATE_KEY`, `JWKS`, `SITE_URL`, `VAPID_*`) — идемпотентно;
  2. пушит Convex-функции (`convex deploy` в prod / `convex dev --once` + watch в dev);
  3. запускает сид (`convex run seed:run`).
- ERP и PWA используют один и тот же `NEXT_PUBLIC_CONVEX_URL=http://localhost:3210`.
  Внутри контейнеров `localhost:3210/3211` проброшены на сервис `backend` через `socat`
  (см. `docker/app-entrypoint.sh`), поэтому один URL работает и в браузере, и на сервере Next.

## Переменные окружения

См. `.env.example`. Значимые:

- `INSTANCE_SECRET` — не меняйте после первого запуска (от него зависит admin key).
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — учётка администратора ERP.
- `SITE_URL` — базовый URL для Convex Auth (по умолчанию PWA).

## Подсистемы

- **ERP**: меню (+ поле «Баллы кэшбэка»), заказы, склад, промокоды, клиенты, уведомления (web-push).
- **PWA** (стиль Burger King): меню, карточка блюда, корзина и оформление (самовывоз/доставка,
  оплата наличными/картой, промокод, списание баллов), статусы заказов в реальном времени, акции,
  личный кабинет (история заказов, баланс и история баллов), web-push о смене статуса заказа.
- Авторизация клиента — по номеру телефона и паролю (Convex Auth).
