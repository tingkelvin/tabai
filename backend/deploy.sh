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

# Local development port and container port (for local testing)
LOCAL_PORT="8080"
CONTAINER_PORT="8000" # Cloud Run expects this port, ensure your app listens on it

# Path to the secrets file
SECRETS_FILE=".env.prod"

# Service account that needs access to secrets (usually the Cloud Run service account)
# Verify this service account in your Google Cloud Console for your 'tubetor' project.
# Common pattern: PROJECT_ID@appspot.gserviceaccount.com
CLOUD_RUN_SERVICE_ACCOUNT="${PROJECT_ID}@appspot.gserviceaccount.com"

# --- Argument Parsing ---
UPDATE_SECRETS_FLAG=false

# --- Argument Parsing ---
UPDATE_SECRETS_FLAG=false
POSITIONAL_ARGS=() # Array to store non-flag arguments

POSITIONAL_ARGS=()

while [[ "$#" -gt 0 ]]; do
    case "$1" in
        --update-secrets)
            UPDATE_SECRETS_FLAG=true
            shift
            ;;
        --)
            shift
            while [[ "$#" -gt 0 ]]; do
                POSITIONAL_ARGS+=("$1")
                shift
            done
            break
            ;;
        -*)
            echo "Error: Unrecognized option '$1'." >&2
            exit 1
            ;;
        *)
            POSITIONAL_ARGS+=("$1")
            shift
            ;;
    esac
done

# Restore positional arguments if needed (optional, depends on script structure)
# set -- "${POSITIONAL_ARGS[@]}"

# --- Helper Function to read a specific secret from the .env file ---
# This function is designed to safely extract a single key's value
# from the .env file, handling comments and basic quoting.
get_secret_from_env_file() {
    local secret_name_to_find="$1"
    local secret_value=""

    # Check if the secrets file exists
    if [ ! -f "$SECRETS_FILE" ]; then
        echo "Error: Secrets file '${SECRETS_FILE}' not found. Cannot retrieve secret '${secret_name_to_find}'." >&2
        return 1
    fi

    # Read the file line by line
    while IFS= read -r line || [[ -n "$line" ]]; do
        # Remove leading/trailing whitespace
        line=$(echo "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

        # Skip comments and empty lines
        [[ "$line" =~ ^#.*$ ]] && continue
        [[ -z "$line" ]] && continue

        # Extract key and value using regex
        # This regex handles KEY=VALUE and KEY="VALUE"
        if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
            local key="${BASH_REMATCH[1]}"
            local value="${BASH_REMATCH[2]}"

            if [[ "$key" == "$secret_name_to_find" ]]; then
                # Remove leading/trailing quotes if present
                secret_value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//')
                echo "$secret_value"
                return 0 # Secret found and returned
            fi
        fi
    done < "$SECRETS_FILE"

    # If we reach here, the secret was not found in the file
    echo "Warning: Secret '${secret_name_to_find}' not found in '${SECRETS_FILE}'." >&2
    return 1 # Secret not found
}


# --- Functions for better organization ---

# Function to upload a secret to Secret Manager
upload_secret() {
    local secret_name="$1"
    local secret_value=$(get_secret_from_env_file "$secret_name")

    # Check if the secret value was successfully retrieved
    if [ -z "$secret_value" ]; then
        echo "Skipping upload for '${secret_name}' as its value could not be retrieved from '${SECRETS_FILE}'."
        return 1
    fi

    echo "Uploading secret: ${secret_name}..."
    echo -n "$secret_value" | gcloud secrets versions add "$secret_name" --data-file=- --project="$PROJECT_ID"
    echo "Secret ${secret_name} uploaded."
    return 0
}

# Function to grant secret accessor permissions
grant_secret_permissions() {
    local secret_name="$1"
    local service_account="$2"
    echo "Granting secretAccessor role to ${service_account} for ${secret_name}..."
    gcloud secrets add-iam-policy-binding "$secret_name" \
        --member="serviceAccount:$service_account" \
        --role="roles/secretmanager.secretAccessor" \
        --project="$PROJECT_ID"
    echo "Permissions granted for ${secret_name}."
}

# --- Script Steps ---

echo "--- Authenticating Docker with Google Cloud Artifact Registry ---"
gcloud auth configure-docker "${REGION}-docker.pkg.dev"

echo "--- Building Docker Image for Linux AMD64 (recommended for Cloud Run) ---"
# Using buildx for multi-platform builds and direct push to registry
docker buildx build --platform linux/amd64 -t "$FULL_IMAGE_NAME" . --push

# docker build -t "$FULL_IMAGE_NAME" .
# docker push "$FULL_IMAGE_NAME"

# echo "--- Local Docker Run Test (Optional) ---"
# echo "Note: This will source environment variables from '${SECRETS_FILE}' for local testing."

# # Source the .env.prod file for local environment variables
# if [ -f "$SECRETS_FILE" ]; then
#     echo "Sourcing secrets from ${SECRETS_FILE} for local run..."
#     set -a # Automatically export all variables that are set or modified
#     . "$SECRETS_FILE"
#     set +a # Turn off automatic export
# else
#     echo "Warning: ${SECRETS_FILE} not found. Local run might be missing environment variables."
# fi

# # Ensure the required variables are set for the local run
# if [ -z "${GOOGLE_CLIENT_ID}" ] || \
#    [ -z "${GOOGLE_CLIENT_SECRET}" ] || \
#    [ -z "${GOOGLE_REDIRECT_URI}" ] || \
#    [ -z "${APP_SECRET_KEY}" ] || \
#    [ -z "${GEMINI_API_KEY}" ]; then
#     echo "Error: One or more required environment variables for local run are missing after sourcing ${SECRETS_FILE}."
#     echo "Please ensure ${SECRETS_FILE} contains all necessary secrets."
#     exit 1
# fi

# docker run -p "${LOCAL_PORT}:${CONTAINER_PORT}" \
#   -e APP_ENV="dev" \
#   -e GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID}" \
#   -e GOOGLE_CLIENT_SECRET="${GOOGLE_CLIENT_SECRET}" \
#   -e GOOGLE_REDIRECT_URI="${GOOGLE_REDIRECT_URI}" \
#   -e APP_SECRET_KEY="${APP_SECRET_KEY}" \
#   -e GEMINI_API_KEY="${GEMINI_API_KEY}" \
#   "$FULL_IMAGE_NAME" &
# LOCAL_RUN_PID=$!
# echo "Local container started (PID: $LOCAL_RUN_PID). Press Enter to stop it and continue."
# read -r # Wait for user to press enter
# kill "$LOCAL_RUN_PID" || true # Kill the background process gracefully
# echo "Local container stopped."

# --- Conditional Secret Operations ---
if "$UPDATE_SECRETS_FLAG"; then
    echo "--- --update-secrets flag detected. Uploading/Updating Secrets and Granting Permissions ---"
    # Upload/Update Secrets
    upload_secret "GOOGLE_CLIENT_ID"
    upload_secret "GOOGLE_CLIENT_SECRET"
    upload_secret "GOOGLE_REDIRECT_URI"
    upload_secret "APP_SECRET_KEY"
    upload_secret "GEMINI_API_KEY"

    # Grant Secret Accessor Permissions
    grant_secret_permissions "GOOGLE_CLIENT_ID" "$CLOUD_RUN_SERVICE_ACCOUNT"
    grant_secret_permissions "GOOGLE_CLIENT_SECRET" "$CLOUD_RUN_SERVICE_ACCOUNT"
    grant_secret_permissions "GOOGLE_REDIRECT_URI" "$CLOUD_RUN_SERVICE_ACCOUNT"
    grant_secret_permissions "APP_SECRET_KEY" "$CLOUD_RUN_SERVICE_ACCOUNT"
    grant_secret_permissions "GEMINI_API_KEY" "$CLOUD_RUN_SERVICE_ACCOUNT"
else
    echo "--- Skipping secret update. To update secrets, run with --update-secrets flag. ---"
fi

echo "--- Deploying to Cloud Run ---"
gcloud run deploy "$SERVICE_NAME" \
    --image "$FULL_IMAGE_NAME" \
    --platform managed \
    --region "$REGION" \
    --allow-unauthenticated \
    --port "$CONTAINER_PORT" \
    --set-env-vars "APP_ENV=prod" \
    --update-secrets "GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID:latest,GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest,GOOGLE_REDIRECT_URI=GOOGLE_REDIRECT_URI:latest,APP_SECRET_KEY=APP_SECRET_KEY:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest" \
    --project "$PROJECT_ID"

echo "--- Deployment Complete! ---"
echo "Your service should be available at the URL provided by the gcloud run deploy command."