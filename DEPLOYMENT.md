# Ермак — гайд по развёртыванию на VPS (Ubuntu)

Пошаговая инструкция: как взять готовый проект и поднять его на **VPS с Ubuntu** в production.
Весь стек (Convex backend + dashboard + ERP + PWA) запускается одной командой через Docker.

> Для разработки локально достаточно `make dev`. Этот документ — про **боевой VPS**.
>
> **Поддерживаемая платформа:** VPS с **Ubuntu 22.04 или 24.04** (x86_64 или ARM Graviton у облачного провайдера).
> Одноплатники (Orange Pi, Raspberry Pi и т.п.) **не поддерживаются** — self-hosted Convex backend на них не запускается.

---

## Содержание

1. [Что вам понадобится](#1-что-вам-понадобится)
2. [Шаг 1. Сервер и DNS](#шаг-1-сервер-и-dns)
3. [Шаг 2. Установка Docker](#шаг-2-установка-docker)
4. [Шаг 3. Загрузка кода](#шаг-3-загрузка-кода)
5. [Шаг 4. Настройка `.env`](#шаг-4-настройка-env)
6. [Шаг 5. Первый запуск](#шаг-5-первый-запуск)
7. [Шаг 6. Проверка](#шаг-6-проверка)
8. [Шаг 7. Reverse proxy и HTTPS (Caddy)](#шаг-7-reverse-proxy-и-https-caddy)
9. [Шаг 8. Безопасность](#шаг-8-безопасность)
10. [Эксплуатация: ключи, логи, бэкапы, обновления](#9-эксплуатация)
11. [Траблшутинг](#10-траблшутинг)

---

## 1. Что вам понадобится

- **VPS с Ubuntu 22.04 или 24.04** (чистая установка, доступ по SSH).
- Ресурсы: минимум **2 vCPU / 4 GB RAM / 40 GB SSD** (для первой сборки и работы всего стека).
- Доменное имя и поддомены (для HTTPS, Auth и Web Push).
- Права `sudo` на сервере.
- Открытые порты: `22` (SSH), `80`, `443`. Порты приложений (`3000`, `3001`, `3210`, …) наружу не публикуем — доступ через reverse proxy.

Подойдут, например: Hetzner, Timeweb Cloud, Selectel, Yandex Cloud, DigitalOcean.

Понадобится 5 публичных адресов (поддоменов):

| Сервис | Порт контейнера | Поддомен (пример) |
|--------|-----------------|-------------------|
| PWA (клиенты) | 3001 | `app.example.com` |
| ERP (персонал) | 3000 | `erp.example.com` |
| Convex API | 3210 | `api.example.com` |
| Convex Site (HTTP actions) | 3211 | `site.example.com` |
| Dashboard | 6791 | `cvx.example.com` |

---

## Шаг 1. VPS и DNS

1. Создайте VPS у провайдера, выберите **Ubuntu 22.04 или 24.04**, получите публичный IP.
2. Подключитесь по SSH:
   ```bash
   ssh root@<IP>
   # или ssh ubuntu@<IP> — зависит от провайдера
   ```
3. В DNS добавьте A‑записи на IP VPS:
   ```
   app.example.com   A   <IP>
   erp.example.com   A   <IP>
   api.example.com   A   <IP>
   site.example.com  A   <IP>
   cvx.example.com   A   <IP>
   ```
3. Дождитесь распространения DNS (`ping app.example.com` должен возвращать IP VPS).

> Без домена можно запустить и по IP/портам, но Web Push и Convex Auth корректно работают только по HTTPS — для боевого использования домен обязателен.

---

## Шаг 2. Установка Docker на Ubuntu

На VPS выполните:

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER     # чтобы запускать docker без sudo
newgrp docker                     # применить группу в текущей сессии
docker --version && docker compose version
```

Установите `git` и `make`:

```bash
sudo apt install -y git make
```

---

## Шаг 3. Загрузка кода

```bash
cd /opt
sudo mkdir -p ermak-erp && sudo chown $USER:$USER ermak-erp
git clone <URL-вашего-репозитория> ermak-erp
cd ermak-erp
```

(Или скопируйте папку проекта через `scp`/`rsync`, если репозитория нет.)

Структура, которая должна быть на месте:
```
ermak-erp/
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env.example
├── Makefile
├── scripts/        (up.sh, keys.sh)
├── docker/         (Dockerfile.erp, Dockerfile.pwa, Dockerfile.deployer, app-entrypoint.sh, deployer/)
├── ermak-system/   (ERP + convex/)
└── pwa/            (клиентское приложение)
```

---

## Шаг 4. Настройка `.env`

Скопируйте шаблон и отредактируйте:

```bash
cp .env.example .env
nano .env
```

Заполните под боевой домен. Пример для поддоменов выше:

```env
# Convex self-hosted
INSTANCE_NAME=ermak
# СГЕНЕРИРУЙТЕ свой секрет (см. ниже) и больше не меняйте его!
INSTANCE_SECRET=<ваш-64-символьный-hex>

# Публичные origin backend (как видит браузер) — ПО HTTPS
CONVEX_CLOUD_ORIGIN=https://api.example.com
CONVEX_SITE_ORIGIN=https://site.example.com

# Заполнится автоматически при первом запуске
CONVEX_SELF_HOSTED_ADMIN_KEY=

# URL backend для фронтендов (браузер обращается напрямую) — публичный HTTPS
PUBLIC_CONVEX_URL=https://api.example.com

# Базовый URL клиентского приложения (для редиректов Convex Auth)
SITE_URL=https://app.example.com

# Порты на host (контейнеры слушают локально, наружу отдаёт прокси)
CONVEX_PORT=3210
CONVEX_SITE_PORT=3211
DASHBOARD_PORT=6791
ERP_PORT=3000
PWA_PORT=3001

# Учётка администратора ERP при первичном сиде — СМЕНИТЕ пароль!
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=<надёжный-пароль>
```

Сгенерировать `INSTANCE_SECRET`:

```bash
openssl rand -hex 32
```

> ⚠️ **`INSTANCE_SECRET` нельзя менять после первого запуска** — от него зависит admin key и доступ к данным.
> ⚠️ `PUBLIC_CONVEX_URL` и `CONVEX_CLOUD_ORIGIN` должны указывать на **один и тот же** публичный адрес backend.

---

## Шаг 5. Первый запуск

```bash
make prod
```

Что произойдёт (скрипт `scripts/up.sh prod`):
1. Поднимется `backend` и `dashboard`, скрипт дождётся healthcheck backend.
2. Автоматически сгенерируется **admin key** и допишется в `.env` (`CONVEX_SELF_HOSTED_ADMIN_KEY`).
3. Соберутся образы и запустится `deployer`: поставит env (JWT/JWKS, VAPID, SITE_URL),
   задеплоит Convex‑функции и выполнит сид (админ, цеха, настройки, **склад с продуктами и рецептурой меню**).
4. Поднимутся `erp` и `pwa`.

Первая сборка занимает несколько минут (ставятся зависимости и собираются Next.js standalone‑билды).

В конце скрипт выведет адреса и admin key. Полный список ключей в любой момент:

```bash
make keys
```

---

## Шаг 6. Проверка

```bash
docker compose ps                 # все сервисы Up, deployer — Exited (0)
curl -fsS http://localhost:3210/version   # версия Convex backend
curl -fsS http://localhost:3000 >/dev/null && echo ERP_OK
curl -fsS http://localhost:3001 >/dev/null && echo PWA_OK
```

`deployer` в prod **должен завершиться с кодом 0** — это нормально (он разовый).

Логи при проблемах:
```bash
docker compose logs deployer --tail=100
docker compose logs erp --tail=100
docker compose logs pwa --tail=100
```

---

## Шаг 7. Reverse proxy и HTTPS (Caddy)

Caddy сам получает и продлевает сертификаты Let’s Encrypt. Это самый простой путь.

Установка:
```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

`/etc/caddy/Caddyfile`:
```caddyfile
app.example.com {
    reverse_proxy localhost:3001
}

erp.example.com {
    reverse_proxy localhost:3000
}

api.example.com {
    reverse_proxy localhost:3210
}

site.example.com {
    reverse_proxy localhost:3211
}

# Дашборд — закройте basic-auth, это админ-инструмент
cvx.example.com {
    basicauth {
        admin <bcrypt-хэш-пароля>
    }
    reverse_proxy localhost:6791
}
```

Хэш пароля для basicauth: `caddy hash-password`. Применить:
```bash
sudo systemctl reload caddy
```

После этого:
- Клиенты: `https://app.example.com`
- Персонал: `https://erp.example.com`
- Дашборд БД: `https://cvx.example.com`

> Значения `CONVEX_CLOUD_ORIGIN`, `CONVEX_SITE_ORIGIN`, `PUBLIC_CONVEX_URL`, `SITE_URL` в `.env`
> уже должны соответствовать этим HTTPS‑адресам (см. Шаг 4). Если меняли `.env` после запуска —
> пересоберите фронтенды: `make down && make prod` (URL зашивается в билд на этапе сборки).

---

## Шаг 8. Безопасность

- Смените `SEED_ADMIN_PASSWORD` до первого запуска (после сида пароль уже в БД).
- Закройте файрволом всё, кроме `22/80/443`:
  ```bash
  sudo ufw allow OpenSSH
  sudo ufw allow 80,443/tcp
  sudo ufw enable
  ```
- Закройте dashboard (`:6791`) basic‑auth (см. Caddy) — это прямой доступ к БД.
- Храните `.env` в секрете (там admin key и секрет инстанса). Сделайте бэкап `.env` в надёжном месте.

---

## 9. Эксплуатация

### Ключи
```bash
make keys     # admin key (для входа в dashboard) + VAPID Web Push ключи
```

### Логи и статус
```bash
docker compose logs -f            # все сервисы
docker compose ps                 # статусы
```

### Перезапуск / остановка
```bash
docker compose restart erp pwa    # перезапустить фронтенды
make down                         # остановить и удалить контейнеры (данные сохраняются)
```

### Бэкап данных
Все данные Convex — в Docker volume `ermak_convex-data`.
```bash
# Бэкап
docker run --rm -v ermak_convex-data:/data -v $PWD:/backup alpine \
  tar czf /backup/convex-backup-$(date +%F).tar.gz -C /data .

# Восстановление (контейнеры остановлены)
docker run --rm -v ermak_convex-data:/data -v $PWD:/backup alpine \
  sh -c "cd /data && tar xzf /backup/convex-backup-YYYY-MM-DD.tar.gz"
```
Дополнительно сохраняйте `.env`.

### Обновление кода
```bash
cd /opt/ermak-erp
git pull
make prod        # пересоберёт образы, заново задеплоит функции и прогонит идемпотентный сид
```
Сид при обновлении не дублирует данные и доставит ингредиенты к уже существующему меню.

### Полный сброс (ОПАСНО — удаляет все данные)
```bash
make clean       # down -v: удалит контейнеры И volume с данными
```

---

## 10. Траблшутинг

| Симптом | Причина / решение |
|---------|-------------------|
| `deployer` упал, в логах ошибка авторизации | Не подхватился admin key. Проверьте строку `CONVEX_SELF_HOSTED_ADMIN_KEY=` в `.env`, при необходимости удалите её и снова `make prod` (сгенерируется заново). |
| ERP/PWA не видят backend, в консоли браузера CORS/connection | `PUBLIC_CONVEX_URL`/`CONVEX_CLOUD_ORIGIN` не совпадают с реальным публичным адресом backend. Исправьте `.env` и пересоберите: `make down && make prod`. |
| Web Push не приходит | Push требует HTTPS и валидных VAPID. Проверьте `make keys`, что VAPID заданы; PWA открыта по `https://`. |
| Баллы не начисляются | Начисление происходит только при **завершении** заказа (статус `completed`), не при подтверждении. |
| Склад не списывается | У блюд должны быть заданы ингредиенты, а у продуктов — партии. Прогоните сид (`make prod`) или сделайте «Приход» на складе. |
| `next build` падает на чужих ошибках типов/линта | В prod уже включены `eslint.ignoreDuringBuilds` и (для ERP) `typescript.ignoreBuildErrors`, чтобы легаси‑ошибки не блокировали сборку. |
| Изменил `.env`, но фронтенд не подхватил URL | `NEXT_PUBLIC_CONVEX_URL` вшивается на этапе сборки. Нужен ребилд: `make down && make prod`. |
| Порт занят | Поменяйте `*_PORT` в `.env` или освободите порт; затем `make prod`. |
| `backend exited (132)` | Контейнер Convex упал на уровне CPU (SIGILL). Обычно это **не VPS Ubuntu**, а одноплатник или эмуляция. Разворачивайте только на VPS по этому гайду. |
| `429 Too Many Requests` при сборке ERP/PWA | Лимит Docker Hub на анонимные pull. См. [ниже](#лимит-docker-hub-429). |

### Лимит Docker Hub (429)

При `make prod` образы Convex (`ghcr.io`) качаются нормально, а сборка `deployer`/`erp`/`pwa` падает на `node:20-alpine` с `toomanyrequests`.

**Решение 1 (рекомендуется): войти в Docker Hub**

```bash
docker login
# логин и пароль от https://hub.docker.com (бесплатная регистрация)
make prod
```

**Решение 2:** подождать 1–6 часов и повторить (лимит сбрасывается для IP).

**Решение 3:** зеркало registry (если провайдер даёт), в `/etc/docker/daemon.json`:

```json
{
  "registry-mirrors": ["https://mirror.gcr.io"]
}
```

```bash
sudo systemctl restart docker
make prod
```

---

---

Готово. После `make prod` на Ubuntu VPS и настройки Caddy система доступна клиентам и персоналу по HTTPS.
Техническое устройство и сущности — в `DOCUMENTATION.md`.
