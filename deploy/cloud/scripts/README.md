# Скрипты жизненного цикла облачного стенда

Планируемые команды:

- `up.sh` — `terraform apply` + установка ingress-nginx + вывод URL;
- `deploy.sh` — применить K8s-манифесты и дождаться rollout;
- `smoke.sh` — health-check и короткий smoke-тест;
- `down.sh` — удалить K8s-ресурсы, NLB и PVC, затем `terraform destroy`;
- `status.sh` — показать кластер, поды, URL и возможные «орфаны».

Пока это заглушка: скрипты будут добавлены вместе с Terraform-ресурсами.
