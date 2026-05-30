#!/bin/sh
set -e

# Пробрасываем localhost:3210/3211 контейнера на self-hosted Convex backend,
# чтобы один и тот же NEXT_PUBLIC_CONVEX_URL=http://localhost:3210 работал
# и в браузере (через опубликованный порт), и на стороне Next.js сервера.
if [ -n "$CONVEX_BACKEND_HOST" ]; then
  socat TCP-LISTEN:3210,fork,reuseaddr TCP:${CONVEX_BACKEND_HOST}:3210 &
  socat TCP-LISTEN:3211,fork,reuseaddr TCP:${CONVEX_BACKEND_HOST}:3211 &
fi

exec "$@"
