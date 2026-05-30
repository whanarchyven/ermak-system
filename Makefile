.PHONY: dev prod down stop logs clean keys help

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
	docker compose -f docker-compose.yml -f docker-compose.dev.yml down

stop:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml stop

logs:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f

clean:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v
