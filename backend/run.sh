#!/bin/bash
# Exit immediately if a command exits with a non-zero status.
set -e

# --- Configuration Variables ---
PROJECT_ID="tubetor"
REGION="us-central1"
SERVICE_NAME="tubetor-backend"
IMAGE_REPO="us-central1-docker.pkg.dev/${PROJECT_ID}/${SERVICE_NAME}" # Base repository path
IMAGE_TAG="latest"
FULL_IMAGE_NAME="${IMAGE_REPO}/backend:${IMAGE_TAG}" # Full image name with tag
LOCAL_PORT=8000
CONTAINER_PORT=8000

# Path to the secrets file
SECRETS_FILE=".env.dev"

echo "--- Local Docker Run ---"
echo "Note: This will source environment variables from '${SECRETS_FILE}' for local testing."

# Source the .env.prod file for local environment variables
if [ -f "$SECRETS_FILE" ]; then
    echo "Sourcing secrets from ${SECRETS_FILE} for local run..."
    set -a # Automatically export all variables that are set or modified
    . "$SECRETS_FILE"
    set +a # Turn off automatic export
else
    echo "Warning: ${SECRETS_FILE} not found. Local run might be missing environment variables."
fi

# Ensure the required variables are set for the local run
if [ -z "${GOOGLE_CLIENT_ID}" ] || \
   [ -z "${GOOGLE_CLIENT_SECRET}" ] || \
   [ -z "${GOOGLE_REDIRECT_URI}" ] || \
   [ -z "${APP_SECRET_KEY}" ] || \
   [ -z "${GEMINI_API_KEY}" ]; then
    echo "Error: One or more required environment variables for local run are missing after sourcing ${SECRETS_FILE}."
    echo "Please ensure ${SECRETS_FILE} contains all necessary secrets."
    exit 1
fi

docker build -t "$FULL_IMAGE_NAME" .

docker run -p "${LOCAL_PORT}:${CONTAINER_PORT}" \
  -e APP_ENV="dev" \
  -e GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID}" \
  -e GOOGLE_CLIENT_SECRET="${GOOGLE_CLIENT_SECRET}" \
  -e GOOGLE_REDIRECT_URI="${GOOGLE_REDIRECT_URI}" \
  -e APP_SECRET_KEY="${APP_SECRET_KEY}" \
  -e GEMINI_API_KEY="${GEMINI_API_KEY}" \
  -e APP_ENV=dev \
  "$FULL_IMAGE_NAME"
