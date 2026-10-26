#!/bin/sh
# Rebuilds the image, pushes it and restarts the deployment. Run on the server after git pull:
#   npm run deploy
set -eu
cd "$(dirname "$0")/.."

IMAGE="${IMAGE:-localhost:30500/dimension-analysis:latest}"
NAMESPACE="${NAMESPACE:-dimension-analysis}"

docker info >/dev/null 2>&1 || { echo "Docker is not running. Start Docker Desktop (or the docker service) and try again." >&2; exit 1; }
kubectl cluster-info >/dev/null 2>&1 || { echo "kubectl cannot reach the cluster (context: $(kubectl config current-context 2>/dev/null || echo none))." >&2; exit 1; }

docker build -t "$IMAGE" .
docker push "$IMAGE"

# Applies any manifest changes, then restarts the pod so it pulls the new image
# (the deployment uses imagePullPolicy: Always).
kubectl apply -k k8s
kubectl -n "$NAMESPACE" rollout restart deploy/dimension-analysis
kubectl -n "$NAMESPACE" rollout status deploy/dimension-analysis --timeout=180s
