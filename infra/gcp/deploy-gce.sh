#!/usr/bin/env bash
# Deploy Aether to Google Compute Engine (Docker Compose) — closest to Replit's GCP model.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
export PATH="${HOME}/google-cloud-sdk/bin:${PATH}"

PROJECT_ID="${GCP_PROJECT_ID:-${GOOGLE_CLOUD_PROJECT:-}}"
REGION="${GCP_REGION:-us-central1}"
ZONE="${GCP_ZONE:-us-central1-a}"
INSTANCE="${GCP_INSTANCE:-aether-ide}"
MACHINE="${GCP_MACHINE_TYPE:-e2-medium}"

if [[ -z "$PROJECT_ID" ]]; then
  echo "Set GCP_PROJECT_ID (or GOOGLE_CLOUD_PROJECT)"
  exit 1
fi

echo "==> Project $PROJECT_ID ($ZONE)"
gcloud config set project "$PROJECT_ID"
gcloud services enable compute.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com --project "$PROJECT_ID"

if ! gcloud compute instances describe "$INSTANCE" --zone "$ZONE" --project "$PROJECT_ID" >/dev/null 2>&1; then
  echo "==> Creating GCE instance $INSTANCE"
  gcloud compute instances create "$INSTANCE" \
    --project "$PROJECT_ID" \
    --zone "$ZONE" \
    --machine-type "$MACHINE" \
    --image-family=ubuntu-2204-lts \
    --image-project=ubuntu-os-cloud \
    --boot-disk-size=40GB \
    --tags=aether-ide \
    --metadata=startup-script='#!/bin/bash
set -e
apt-get update
apt-get install -y docker.io docker-compose-v2 git
usermod -aG docker ubuntu || true
systemctl enable --now docker
'
  gcloud compute firewall-rules create aether-ide-http \
    --project "$PROJECT_ID" \
    --allow=tcp:22,tcp:3000,tcp:4000,tcp:5001 \
    --target-tags=aether-ide \
    --description="Aether IDE ports" || true
fi

IP=$(gcloud compute instances describe "$INSTANCE" --zone "$ZONE" --project "$PROJECT_ID" --format='get(networkInterfaces[0].accessConfigs[0].natIP)')
echo "==> Instance IP: $IP"

echo "==> Syncing repo"
gcloud compute scp --recurse --zone "$ZONE" --project "$PROJECT_ID" \
  "$ROOT/engine" "$ROOT/frontend" "$ROOT/workspace" "$ROOT/docker-compose.yml" "$ROOT/package.json" \
  "$INSTANCE":~/aether/ \
  --compress

echo "==> Building and starting stack"
gcloud compute ssh "$INSTANCE" --zone "$ZONE" --project "$PROJECT_ID" --command "
set -e
cd ~/aether
export NEXT_PUBLIC_API_URL=http://${IP}:4000
export CLIENT_ORIGIN=http://${IP}:3000
sudo docker compose up -d --build
sudo docker compose ps
"

echo ""
echo "Aether on Google Cloud:"
echo "  Frontend: http://${IP}:3000"
echo "  API:      http://${IP}:4000/api/health"
echo "  Stack:    http://${IP}:3000/stack"
echo "  SSH:      gcloud compute ssh ${INSTANCE} --zone ${ZONE} --project ${PROJECT_ID}"
