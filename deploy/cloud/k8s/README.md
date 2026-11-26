# Kubernetes-манифесты RecipeHub

Здесь появятся манифесты для учебного стенда в Yandex Managed Service for Kubernetes:

- `namespace.yaml` — namespace `recipehub`;
- `postgres-user.yaml`, `postgres-recipe.yaml` — PostgreSQL для user/recipe;
- `rabbitmq.yaml` — RabbitMQ;
- `user-service.yaml`, `recipe-service.yaml`, `api-gateway.yaml` — приложения;
- `ingress.yaml` — ingress-nginx → api-gateway;
- `kustomization.yaml` — общая сборка.

Секреты в git не хранятся: они создаются из GitHub Secrets или локального
`.secrets.env` (в .gitignore) перед `kubectl apply`.
