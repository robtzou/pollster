#!/usr/bin/env bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════
# Pollster Cloud Relay — Deploy to Google Cloud Run
# ═══════════════════════════════════════════════════════════════
# Usage:
#   ./deploy.sh <GCP_PROJECT_ID> [REGION]
#
# Example:
#   ./deploy.sh my-gcp-project us-central1
# ═══════════════════════════════════════════════════════════════

PROJECT_ID="${1:?Usage: ./deploy.sh <GCP_PROJECT_ID> [REGION]}"
REGION="${2:-us-central1}"
SERVICE_NAME="pollster-relay"
IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "══════════════════════════════════════"
echo "  Pollster Cloud Relay Deployment"
echo "  Project: ${PROJECT_ID}"
echo "  Region:  ${REGION}"
echo "══════════════════════════════════════"

# 0. Copy student-view HTML into relay directory for bundling
STUDENT_HTML="../pollster/resources/student-view/index.html"
if [ -f "$STUDENT_HTML" ]; then
  echo "📄 Copying student-view.html into relay..."
  cp "$STUDENT_HTML" ./student-view.html
else
  echo "⚠️  Warning: Student view not found at $STUDENT_HTML"
  echo "   The /join endpoint won't work without it."
fi

# 1. Build the Docker image (linux/amd64 required by Cloud Run)
echo ""
echo "📦 Building Docker image (linux/amd64)..."
docker buildx build --platform linux/amd64 -t "${IMAGE}" --load .

# 2. Push to Google Container Registry
echo ""
echo "☁️  Pushing to GCR..."
docker push "${IMAGE}"

# 3. Deploy to Cloud Run with SESSION AFFINITY enabled
echo ""
echo "🚀 Deploying to Cloud Run (with session affinity)..."
gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --session-affinity \
  --min-instances 0 \
  --max-instances 10 \
  --memory 256Mi \
  --cpu 1 \
  --timeout 3600

# 4. Get the public URL
echo ""
echo "✅ Deployment complete!"
URL=$(gcloud run services describe "${SERVICE_NAME}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --format "value(status.url)")

echo ""
echo "══════════════════════════════════════"
echo "  🌐 Your relay URL:"
echo "  ${URL}"
echo ""
echo "  Update CLOUD_RELAY_URL in:"
echo "    pollster/src/main/server.ts"
echo "    pollster/resources/student-view/index.html"
echo "══════════════════════════════════════"
