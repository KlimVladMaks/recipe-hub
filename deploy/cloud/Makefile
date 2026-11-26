# Жизненный цикл облачного стенда RecipeHub (Yandex Cloud).
#
#   make init-state — одноразово: SA для CI, бакет для state, backend.hcl
#   make up      — создать инфраструктуру (~10–20 мин, с этого момента платно)
#   make build   — собрать и запушить образы
#   make deploy  — выкатить приложение в кластер
#   make smoke   — проверить health и Swagger
#   make test    — smoke + E2E-тесты
#   make pause   — остановить кластер (дешевле, но диски/IP/NLB остаются)
#   make resume  — запустить кластер после pause
#   make down    — удалить всё платное
#   make status  — что создано и не осталось ли лишнего

SHELL := /bin/bash
.DEFAULT_GOAL := help

.PHONY: help init-state up build deploy smoke test pause resume down status url logs

help:
	@grep -E '^#   ' Makefile | sed 's/^#   //'

init-state:
	./scripts/init-state.sh

up:
	./scripts/up.sh

build:
	./scripts/build-push.sh

deploy:
	./scripts/deploy.sh

smoke:
	./scripts/smoke.sh

test:
	RUN_E2E=1 ./scripts/smoke.sh

pause:
	./scripts/pause.sh

resume:
	./scripts/resume.sh

down:
	./scripts/down.sh

status:
	./scripts/status.sh

url:
	@cat .url 2>/dev/null && echo || echo "стенд не поднят"

logs:
	kubectl -n recipehub logs -f deploy/api-gateway
