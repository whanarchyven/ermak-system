.PHONY: dev prod down stop logs clean keys help

ARCH := $(shell uname -m)
COMPOSE := docker compose -f docker-compose.yml
ifneq (,$(filter $(ARCH),aarch64 arm64))
COMPOSE += -f docker-compose.arm64.yml
endif
COMPOSE_DEV := $(COMPOSE) -f docker-compose.dev.yml

help:
	@echo "make dev    — запуск в dev-режиме (HMR: правки кода применяются сразу)"
	@echo "make prod   — production-запуск (сборка образов)"
	@echo "make down   — остановить и удалить контейнеры"
	@echo "make clean  — остановить и удалить контейнеры + данные (volume)"
	@echo "make logs   — логи всех сервисов"
	@echo "make keys   — показать admin key и VAPID-ключи Web Push"

keys:
	./scripts/keys.sh

dev:
	./scripts/up.sh dev

prod:
	./scripts/up.sh prod

down:
	$(COMPOSE_DEV) down

stop:
	$(COMPOSE_DEV) stop

logs:
	$(COMPOSE_DEV) logs -f

clean:
	$(COMPOSE_DEV) down -v
