#!/usr/bin/env bash
# Pull the latest API image from ECR and (re)start the stack with a health check.
set -euo pipefail
cd "$(dirname "$0")"
[ -f .env ] || { echo "Missing .env (copy .env.prod.example)"; exit 1; }
set -a; . ./.env; set +a

REGISTRY="${API_IMAGE%%/*}"
aws ecr get-login-password --region "${AWS_REGION:?}" | docker login --username AWS --password-stdin "$REGISTRY"

docker compose -f docker-compose.prod.yml pull api
docker compose -f docker-compose.prod.yml up -d --remove-orphans

echo "Waiting for the API to become healthy..."
for i in $(seq 1 40); do
  status=$(docker inspect --format '{{.State.Health.Status}}' "$(docker compose -f docker-compose.prod.yml ps -q api)" 2>/dev/null || echo starting)
  [ "$status" = healthy ] && { echo "API healthy."; docker image prune -f >/dev/null; exit 0; }
  sleep 5
done
echo "API did not become healthy. Last logs:"; docker compose -f docker-compose.prod.yml logs --tail=80 api
exit 1
