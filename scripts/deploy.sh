#!/bin/sh
# Rebuilds the image, pushes it and restarts the deployment. Run on the server after git pull:
#   npm run deploy
set -eu
cd "$(dirname "$0")/.."

IMAGE="${IMAGE:-localhost:30500/dimension-analysis:latest}"
NAMESPACE="${NAMESPACE:-dimension-analysis}"

docker build -t "$IMAGE" .
docker push "$IMAGE"

# Applies any manifest changes, then restarts the pod so it pulls the new image
# (the deployment uses imagePullPolicy: Always).
kubectl apply -k k8s
kubectl -n "$NAMESPACE" rollout restart deploy/dimension-analysis
kubectl -n "$NAMESPACE" rollout status deploy/dimension-analysis --timeout=180s
