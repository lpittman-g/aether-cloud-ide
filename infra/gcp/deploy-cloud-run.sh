#!/usr/bin/env bash
# Deploy frontend + Go API to Cloud Run (process/Rust sandbox; no Docker-in-Docker).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
export PATH="${HOME}/google-cloud-sdk/bin:${PATH}"

PROJECT_ID="${GCP_PROJECT_ID:-${GOOGLE_CLOUD_PROJECT:-}}"
REGION="${GCP_REGION:-us-central1}"

if [[ -z "$PROJECT_ID" ]]; then
  echo "Set GCP_PROJECT_ID"
  exit 1
fi

gcloud config set project "$PROJECT_ID"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com --project "$PROJECT_ID"

REPO="${REGION}-docker.pkg.dev/${PROJECT_ID}/aether"
gcloud artifacts repositories create aether --repository-format=docker --location="$REGION" --project="$PROJECT_ID" 2>/dev/null || true

echo "==> Build & push API image"
gcloud builds submit "$ROOT" --tag "${REPO}/api:latest" --project "$PROJECT_ID" --timeout=1200 --quiet \
  --config=<(cat <<YAML
steps:
  - name: gcr.io/cloud-builders/docker
    args: ['build', '-t', '${REPO}/api:latest', '-f', 'engine/go-api/Dockerfile', '.']
images: ['${REPO}/api:latest']
YAML
)

echo "==> Deploy Cloud Run API"
gcloud run deploy aether-api \
  --image "${REPO}/api:latest" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --port 4000 \
  --memory 1Gi \
  --cpu 1 \
  --set-env-vars "CLIENT_ORIGIN=*" \
  --project "$PROJECT_ID"

API_URL=$(gcloud run services describe aether-api --region "$REGION" --project "$PROJECT_ID" --format='value(status.url)')
echo "API_URL=$API_URL"

echo "==> Build & push frontend"
gcloud builds submit "$ROOT/frontend" --tag "${REPO}/web:latest" --project "$PROJECT_ID" --timeout=1200 --quiet

# Frontend needs build-arg — use Dockerfile with ARG; Cloud Build:
gcloud builds submit "$ROOT/frontend" --project "$PROJECT_ID" --timeout=1200 --config=<(cat <<YAML
steps:
  - name: gcr.io/cloud-builders/docker
    args: ['build', '-t', '${REPO}/web:latest', '--build-arg', 'NEXT_PUBLIC_API_URL=${API_URL}', '.']
images: ['${REPO}/web:latest']
YAML
)

gcloud run deploy aether-web \
  --image "${REPO}/web:latest" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --memory 512Mi \
  --project "$PROJECT_ID"

WEB_URL=$(gcloud run services describe aether-web --region "$REGION" --project "$PROJECT_ID" --format='value(status.url)')
echo ""
echo "Cloud Run:"
echo "  Web: $WEB_URL"
echo "  API: $API_URL"
