# Ермак — техническая документация

Платформа домашнего кафе «Ермак»: ERP для персонала + клиентское PWA‑приложение,
работающие на едином самохостинговом backend Convex. Всё поднимается одной командой
в Docker — и в dev (горячая перезагрузка), и в production.

---

## 1. Содержание

1. [Обзор и архитектура](#2-обзор-и-архитектура)
2. [Технологический стек](#3-технологический-стек)
3. [Сервисы Docker](#4-сервисы-docker)
4. [Сетевая модель и `socat`](#5-сетевая-модель-и-socat)
5. [Модель данных (сущности)](#6-модель-данных-сущности)
6. [Backend Convex: модули и функции («контроллеры»)](#7-backend-convex-модули-и-функции)
7. [Ключевые механизмы](#8-ключевые-механизмы)
8. [Аутентификация и роли](#9-аутентификация-и-роли)
9. [Frontend ERP](#10-frontend-erp)
10. [Frontend PWA](#11-frontend-pwa)
11. [Переменные окружения](#12-переменные-окружения)
12. [Сид и первичная инициализация](#13-сид-и-первичная-инициализация)
13. [Команды и скрипты](#14-команды-и-скрипты)

---

## 2. Обзор и архитектура

Система состоит из трёх логических подсистем поверх общего backend:

```
                ┌──────────────────────────────────────────┐
                │            Convex self-hosted             │
                │   (backend + SQLite + functions + auth)   │
                └───────────────┬───────────────┬───────────┘
                                │               │
              реактивные запросы│               │реактивные запросы
                                │               │
                   ┌────────────┴───┐     ┌─────┴────────────┐
                   │  ERP (Next.js) │     │  PWA (Next.js)   │
                   │  персонал      │     │  клиенты         │
                   └────────────────┘     └──────────────────┘
                          │  deployer (CLI): деплой функций + сид
                          ▼
                   Convex Dashboard (админка БД)
```

- **ERP** (`ermak-system/`) — рабочее место персонала: канбан заказов, кухня по цехам,
  доставка, меню, склад, финансы, клиенты/рассылки, промокоды, сотрудники, настройки бренда.
- **PWA** (`pwa/`) — клиентское приложение: меню, корзина, оформление, статусы заказов,
  акции, личный кабинет, баллы лояльности, in‑app + web‑push уведомления.
- **Convex backend** — единая БД и серверная логика (queries/mutations/actions), общая
  для ERP и PWA. Реактивность «из коробки»: изменение в БД мгновенно прилетает во все клиенты.

Принципы:
- Единый источник правды — Convex. Никаких параллельных БД.
- Frontend‑слои тонкие: бизнес‑логика и инварианты живут в Convex‑функциях.
- ERP построен по принципам Feature‑Sliced Design (см. `ermak-system/ARCHITECTURE.md`).

---

## 3. Технологический стек

| Слой | Технологии |
|------|------------|
| Backend / БД | Convex (self‑hosted, образ `ghcr.io/get-convex/convex-backend`), хранилище — SQLite внутри backend |
| Аутентификация | `@convex-dev/auth` (провайдер Password) |
| Frontend | Next.js 15 (App Router), React 19, TypeScript |
| Стили | ERP — Tailwind + shadcn/ui; PWA — Tailwind CSS 4 |
| Тосты/уведомления UI | `sonner` |
| Web Push | `web-push` (VAPID), Service Worker |
| Ключи Convex Auth | `jose` (JWT RS256) |
| Контейнеризация | Docker + Docker Compose |
| Сетевой проброс | `socat` (внутри контейнеров фронтендов) |
| Иконки | `lucide-react` |

---

## 4. Сервисы Docker

Определены в `docker-compose.yml` (prod) и `docker-compose.dev.yml` (override для dev).

| Сервис | Образ / сборка | Порт (host) | Назначение |
|--------|----------------|-------------|------------|
| `backend` | `convex-backend:latest` | 3210 (API), 3211 (site/HTTP actions) | Сам Convex: БД, функции, авторизация. Данные в volume `convex-data`. |
| `dashboard` | `convex-dashboard:latest` | 6791 | Веб‑админка БД Convex (таблицы, функции, env). |
| `deployer` | `docker/Dockerfile.deployer` | — | Разовый/watch‑контейнер: ставит env‑переменные деплоймента, деплоит функции, сидит данные. В prod выполняется и выходит, в dev — `convex dev` в watch‑режиме. |
| `erp` | `docker/Dockerfile.erp` | 3000 | Next.js приложение персонала. |
| `pwa` | `docker/Dockerfile.pwa` | 3001 | Next.js клиентское PWA. |

Зависимости: `dashboard`, `deployer` ждут `backend` (healthcheck `/version`).
`erp` и `pwa` в prod ждут успешного завершения `deployer` (`service_completed_successfully`).

Dockerfile’ы ERP/PWA — многостадийные: `deps → dev → builder → runner`.
В prod собирается standalone‑билд Next.js (`output: "standalone"`), что даёт быстрый рантайм.

---

## 5. Сетевая модель и `socat`

Сложность самохостинга Convex: `NEXT_PUBLIC_CONVEX_URL` должен быть **одинаковым** и в браузере,
и в серверном рантайме Next.js. Браузер обращается к `http://localhost:3210` (опубликованный порт),
а серверный код внутри контейнера `localhost` видит как сам контейнер, а не backend.

Решение — `docker/app-entrypoint.sh`: при старте контейнера фронтенда поднимает `socat`,
который проксирует локальные порты `3210/3211` контейнера на сервис `backend`:

```sh
socat TCP-LISTEN:3210,fork,reuseaddr TCP:${CONVEX_BACKEND_HOST}:3210 &
socat TCP-LISTEN:3211,fork,reuseaddr TCP:${CONVEX_BACKEND_HOST}:3211 &
```

Так один и тот же URL `http://localhost:3210` валиден в обоих контекстах.

> PWA в этой конфигурации обращается к Convex напрямую из браузера, поэтому `NEXT_PUBLIC_CONVEX_URL`
> должен быть доступен и снаружи (на проде — публичный домен backend, см. гайд деплоя).

---

## 6. Модель данных (сущности)

Схема: `ermak-system/convex/schema.ts`. Ниже — ключевые таблицы и индексы.

### Пользователи и клиенты
- **`users`** — учётные записи персонала (и техучётки клиентов из Auth).
  Поля: `email`, `phone`, `name`, `fullName`, `role` (`admin|bartender|cook|courier`).
  Индексы: `email`, `phone`. Роль `undefined` → это клиент PWA, не сотрудник.
- **`clients`** — профиль клиента кафе. `userId` (связь с Auth), `loyaltyPoints`,
  `name/phone`, пулы `name_pool/phone_pool/address_pool`, `cart` (корзина).
  Индекс `by_user`.

### Меню
- **`categories`** — категории меню (`name`, `description`, `image`). Индекс `by_name`.
- **`menuPositions`** — блюда: `name`, `categoryId`, `articleNumber`, `price`,
  `discountPrice?`, `photo`, `gallery`, `weight`, `structure`, `description`,
  `cashback_score` (баллы за единицу), **`ingredients[]`** — `{ productId, quantity }`
  (рецептура для автосписания со склада). Индексы `by_category`, `by_article_number`.

### Заказы
- **`orders`** — подтверждённые заказы. Главные поля:
  `clientId`, `status`, `type` (`delivery|restaurant|self-service`),
  `clientInfo{name,phone}`, `positions[]{menuPositionId,quantity,unitPrice,prepared}`,
  `address?`, `subtotal`, `discountTotal`, `deliveryFee`, `total`, `payment_method`,
  `promocode?`, `pointsEarned?`, `pointsRedeemed?`, `pointsAccrued?` (флаг начисления),
  `workshopId?` (цех), SLA‑поля (`estimateMinutes/acceptedAt/dueAt`),
  доставка (`readyAt/deliveryMinutes/deliveryDue/courierId/deliveryAcceptedAt`).
  Индексы: `by_client`, `by_status_and_created`, `by_workshop_and_status`.
  Жизненный цикл статусов:
  ```
  backlog → pending → ready ─────────────┐
                   └→ delivery → delivery_pending → completed
  backlog → cancelled (отказ)
  ```
- **`orders_temp`** — черновик оформления (из корзины): `positions`, `type`, `clientInfo`,
  `address`, `payment_method`, `promocode`, `redeemPoints` (сколько баллов списать). Индекс `by_client`.

### Цеха (workshops)
- **`workshops`** — кухонные станции: `name`, `slug`. Индекс `by_slug`.
  Заказ привязывается к цеху при приёме на кухню; повар видит доску `/kitchen/<slug>`.

### Лояльность
- **`loyaltyTransactions`** — история баллов: `clientId`, `orderId?`, `delta`,
  `reason` (`accrue|redeem|manual`), `balanceAfter`, `comment`. Индекс `by_client_and_created`.

### Склад и финансы
- **`products`** — сырьё: `name`, `unit`, модель цены `priceBaseQty`/`priceForBase`,
  `estimate` (остаток), `safeEstimate` (неснижаемый остаток). Индекс `by_name`.
- **`productEstimates`** — партии продукта (FIFO‑стек) с `expiresAt` (срок годности).
  Индексы `by_product_and_expires`, `by_product`, `by_expires`.
- **`productTransactions`** — движения склада (`plus/minus`, `estimate` после операции). Индексы `by_product_and_date`, `by_date`.
- **`banks`** — кассы `cash`/`card` с балансом `estimate`. Индекс `by_name`.
- **`moneyTransactions`** — денежные движения: `bankId`, `amount`, `type`,
  `reason` (`sale|direct|productBuy`), `estimate`, `comment`. Индексы `by_date`, `by_bank_and_date`.
- **`dailyRevenue`** — выручка за день: `date`, `profit`, `barmen_id?`. Индекс `by_date`.

### Уведомления и настройки
- **`notifications`** — in‑app уведомления клиента: `clientId`, `title`, `body`, `url?`,
  `read`, `orderId?`. Индексы `by_client_and_created`, `by_client_and_read`.
- **`pushSubscriptions`** — подписки Web Push: `clientId`, `endpoint`, `p256dh`, `auth`. Индексы `by_client`, `by_endpoint`.
- **`siteSettings`** — singleton (`key="site"`) с брендингом: `brandName`, `slogan`,
  `logoUrl`, заголовки главной/акций, `phone`, `address`, `primaryColor`, `secondaryColor`. Индекс `by_key`.
- **`promocodes`** — промокоды: `code`, `scope` (`order|category|position`), `type` (`fixed|percent`),
  `value`, условия (порог суммы, тип заказа), `isActive`, `expiresAt`. Индекс `by_code`.

---

## 7. Backend Convex: модули и функции

Файлы в `ermak-system/convex/`. Тонкие обёртки `query/mutation/action`, логика внутри.

### `auth.ts`
Единый Password‑провайдер. `profile()` раскладывает `email/name/phone`, поэтому
сотрудники логинятся по email, а клиенты PWA — по телефону (передаётся в поле `email`).

### `orders.ts` (ядро заказов)
- `startCheckout`, `setTempPositions`, `setTempClient`, `setName`, `setPhone`,
  `setOrderType`, `setAddress`, `setPaymentMethod`, `setRedeemPoints`, `applyPromocode` — сборка черновика.
- `getPreview` — расчёт `subtotal/discount/delivery/total`, баллы к начислению/списанию, баланс.
- `confirmOrder` — черновик → `orders` (`backlog`), **списывает** баллы (redeem), пишет
  `loyaltyTransactions`, чистит корзину. **Начисление баллов здесь не делается.**
- `acceptOrder` — `backlog → pending`, назначает **цех**, **списывает склад по рецептуре** (FIFO),
  пишет `productTransactions`, уведомляет клиента, ставит SLA.
- `changeWorkshop` — смена цеха (запрещена после передачи в доставку/завершения).
- `setPreparedPositions` — отметка готовности позиций.
- `completePending` — `pending → ready` (самовывоз/ресторан) либо `→ delivery`, уведомление.
- `completeReady` — `→ completed`: денежная транзакция (`sale`), пополнение кассы,
  `dailyRevenue += total`, **начисление баллов** (`pointsEarned`, флаг `pointsAccrued`) + уведомление «Начислили X баллов».
- `assignCourier`, `courierAccept` — доставка.
- `rejectOrder` — отказ, возврат позиций в черновик, уведомление.
- `notifyClient` (action) — **in‑app уведомление (всегда) + Web Push** (если есть подписка).
- `listByDate` — канбан по статусам (включая `workshopId/workshopName/pointsRedeemed`).
- `getDetails`, `listByClient` — детали и история.

### `workshops.ts`
`list`, `getBySlug`, `create`, `update`, `remove`, `ordersBySlug` (заказы цеха в статусе `pending`).
Слаг генерируется транслитерацией кириллицы.

### `notifications.ts`
`myNotifications`, `unreadCount`, `markRead`, `markAllRead` (для текущего клиента),
`createInternal` (внутреннее создание из `notifyClient`).

### `push.ts` (`"use node"`)
`sendWebPush` (internal action) — рассылка Web Push по подпискам клиента через VAPID.

### `settings.ts`
`get` (мерж с дефолтами), `update` — управление брендингом из ERP.

### `restaurant.ts`
CRUD категорий и блюд (`createMenuPosition/updateMenuPosition` с `gallery/description/cashback_score/ingredients`),
список промокодов, расчётные хелперы меню.

### `warehouse.ts` (склад)
- `createProduct/updateProduct/deleteProduct/listProducts/getProduct`.
- **`adjustEstimate`** — приход/расход:
  - `plus` — новая партия в `productEstimates` (со сроком), `+` к остатку, **денежная транзакция закупки** (`productBuy`, списание с кассы).
  - `minus` — FIFO‑списание из партий, `productTransactions`.
- `listTransactionsByProduct`, `listBatchesByProduct`, `listExpirySummary` (просрочка).

### `clients.ts`
CRUD корзины (`addToCart`, `removeFromCart`, `setCartQuantity`), `getCartDetails`, `list` (CRM).

### `customer.ts` (PWA API)
`me`, `ensureProfile`, `getLoyalty`, `updateName`, `addAddress`, `removeAddress`,
`savePushSubscription`, `getVapidPublicKey`.

### `users.ts`
`me` (роль текущего сотрудника), `list` (только сотрудники с ролью), `update`, `remove`, `setProfileByEmail`.

### `transactions.ts`
`stats`, `listBanks`, `list`, `create` (ручные денежные операции).

### `seed.ts`
`run` (action) — создаёт админа через `createAccount` и зовёт `seedData`.
`seedData` — идемпотентно: цеха, настройки, **продукты + стартовые партии**, меню **с рецептурой**,
а для уже существующего меню — **бэкофилл ингредиентов**.

---

## 8. Ключевые механизмы

### 8.1 Оформление заказа
Корзина клиента (`clients.cart`) → `startCheckout` создаёт `orders_temp` → шаги оформления
патчат черновик → `getPreview` считает суммы и баллы → `confirmOrder` фиксирует `orders` (`backlog`).

### 8.2 Цеха и кухня
При `acceptOrder` указывается `workshopId`. Повар открывает `/kitchen` (все цеха со счётчиками)
или `/kitchen/<slug>` (только свой цех). Пока заказ не передан в доставку, цех можно менять (`changeWorkshop`).

### 8.3 Автосписание склада (рецептуры)
У блюда есть `ingredients[] = {productId, quantity}`. При `acceptOrder` для каждой позиции
заказа на каждый ингредиент списывается `quantity × кол-во порций` из `productEstimates`
по FIFO (от ближайшего срока годности), обновляется `products.estimate` и пишется `productTransactions`.
**Важно:** автосписание работает только если у блюд заданы ингредиенты и у продуктов есть партии
(их создаёт сид или приход на складе).

### 8.4 Финансовый учёт
- Завершение заказа (`completeReady`): `+total` в кассу (`cash`/`card`), `moneyTransactions(sale)`,
  `dailyRevenue.profit += total`. Скидка баллами уже «зашита» в `total`, поэтому выручка корректна.
- Закупка сырья (`adjustEstimate.plus`): `−amount` из кассы, `moneyTransactions(productBuy)`.
- Ручные операции: `transactions.create`.

### 8.5 Лояльность (баллы)
- **Списание** — при `confirmOrder` (резерв на момент заказа), `pointsRedeemed`, скидка к `total`.
- **Начисление** — только при `completeReady` (заказ завершён): `pointsEarned`, флаг `pointsAccrued`,
  уведомление «Начислили тебе X баллов за заказ». В корзине — слайдер списания доступных баллов.
- Везде (админ‑канбан, курьер) в карточке показывается «Списано баллов: −N».

### 8.6 Уведомления
- `notifyClient` всегда пишет `notifications` (in‑app, колокольчик в PWA) и пытается Web Push.
- В PWA — колокольчик с непрочитанными и страница `/notifications`.
- В ERP раздел «Клиенты» рассылает уведомления (in‑app + push), без Telegram.

### 8.7 Брендинг
`siteSettings` редактируется в ERP → «Настройки». PWA читает их (`useSiteSettings`):
название, слоган, логотип, заголовки, цвета.

---

## 9. Аутентификация и роли

- **Сотрудники**: email + пароль. Роли: `admin`, `bartender`, `cook`, `courier`.
- **Клиенты PWA**: телефон + пароль (через тот же Password‑провайдер).
- Гейтинг ERP — `ermak-system/middleware.ts` (cookie `app_role`):
  - `bartender` → только `/`;
  - `cook` → только `/kitchen*`;
  - `courier` → только `/deliveries`;
  - `admin` → всё; `/promocodes`, `/transactions`, `/workshops`, `/settings` — только admin.
- Ключи Convex Auth (JWT_PRIVATE_KEY/JWKS) генерирует `deployer` (`setup-env.mjs`) и кладёт в env деплоймента.

---

## 10. Frontend ERP (`ermak-system/`)

- Маршруты: `/` (канбан), `/orders`, `/kitchen`, `/kitchen/[slug]`, `/deliveries`,
  `/menu`, `/menu/create`, `/menu/[id]/edit`, `/categories*`, `/warehouse*`, `/clients`,
  `/clients/[id]/orders`, `/workshops`, `/employees`, `/promocodes`, `/transactions`, `/settings`.
- Навигация: `components/app-sidebar.tsx` (роле‑зависимое меню, бренд/лого из настроек).
- Карточки заказов: `components/orders/Cards.tsx` (приём с выбором цеха, смена цеха,
  готовность, выдача, доставка, отображение скидки баллами).
- Тосты: `sonner` (`<Toaster />` в `app/layout.tsx`).

## 11. Frontend PWA (`pwa/`)

- Маршруты: `/` (меню), `/item/[id]`, `/cart`, `/orders`, `/promos`, `/profile`,
  `/notifications`, `/signin`.
- Каркас: `components/AppChrome.tsx` — верхняя панель `TopBar` (лого, навигация, корзина,
  колокольчик), нижнее меню `BottomNav` (только мобильные), регистрация Service Worker.
- Десктоп: контент центрируется/расширяется (`md:`), меню — адаптивная сетка.
- Уведомления: `NotificationBell` + страница `/notifications` (отметка прочитанным).
- Push: `PushToggle` + `public/sw.js` (события `push`/`notificationclick`).
- Тема и бренд: `app/globals.css` (цвета `#371B03` / `#F8F5EC`), `useSiteSettings`.

---

## 12. Переменные окружения

Файл `.env` (создаётся из `.env.example`). Главное:

| Переменная | Назначение |
|------------|------------|
| `INSTANCE_NAME`, `INSTANCE_SECRET` | Идентификатор/секрет инстанса Convex. **От секрета зависит admin key — не менять после первого запуска.** |
| `CONVEX_CLOUD_ORIGIN`, `CONVEX_SITE_ORIGIN` | Публичные origin backend (как видит браузер). |
| `CONVEX_SELF_HOSTED_ADMIN_KEY` | Admin key (генерируется `scripts/up.sh` при первом старте). |
| `PUBLIC_CONVEX_URL` | URL backend для фронтендов (браузер + контейнер через socat). |
| `SITE_URL` | Базовый URL приложения для редиректов Convex Auth. |
| `*_PORT` | Порты host: `CONVEX_PORT`, `CONVEX_SITE_PORT`, `DASHBOARD_PORT`, `ERP_PORT`, `PWA_PORT`. |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Учётка администратора ERP при сиде. |

Env деплоймента Convex (ставит `deployer`, видны в дашборде → Settings → Environment Variables):
`JWT_PRIVATE_KEY`, `JWKS`, `SITE_URL`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.

---

## 13. Сид и первичная инициализация

`deployer` после готовности backend:
1. `setup-env.mjs` — генерирует/ставит JWT и VAPID, `SITE_URL` (идемпотентно).
2. Деплой функций: `convex deploy -y` (prod) или `convex dev --once` + watch (dev).
3. `convex run seed:run` — админ + цеха + настройки + продукты/партии + меню с рецептурой.

Повторный запуск `seed:run` безопасен (идемпотентность + бэкофилл ингредиентов меню).

---

## 14. Команды и скрипты

| Команда | Действие |
|---------|----------|
| `make dev` | Dev‑режим (HMR): `./scripts/up.sh dev`. |
| `make prod` | Production (сборка образов): `./scripts/up.sh prod`. |
| `make down` | Остановить и удалить контейнеры. |
| `make clean` | Остановить + удалить данные (volume). |
| `make logs` | Логи всех сервисов. |
| `make keys` | Показать admin key и VAPID‑ключи. |

Полезные адреса по умолчанию: ERP `:3000`, PWA `:3001`, Dashboard `:6791`, Convex API `:3210`.
Учётка администратора по умолчанию: `admin@ermak.local` / `admin123`.

Подробный пошаговый деплой на сервер — см. `DEPLOYMENT.md`.
