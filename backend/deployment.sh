gcloud auth configure-docker us-central1-docker.pkg.dev

IMAGE_NAME="us-central1-docker.pkg.dev/tubetor/tubetor-backend/backend:latest"
docker build -t "$IMAGE_NAME" .
docker push "$IMAGE_NAME"

IMAGE_NAME="us-central1-docker.pkg.dev/tubetor/tubetor-backend/backend:latest"
docker run -p 8080:8080 \
  -e GOOGLE_CLIENT_ID="234898757030-aaftnbem1v9kdspku5iq1bo4f1tlneho.apps.googleusercontent.com" \
  -e GOOGLE_CLIENT_SECRET="234898757030-aaftnbem1v9kdspku5iq1bo4f1tlneho.apps.googleusercontent.com" \
  -e GOOGLE_REDIRECT_URI="https://tubetor.uc.r.appspot.com/app" \
  -e APP_SECRET_KEY="kflsngsfd;nrpobjnsfjg;q1284784^5620^^)12v" \
  -e GEMINI_API_KEY="AIzaSyBZy_viGpTeoKCQwah1YZDhkmOy3IapxKo" \
  "$IMAGE_NAME"

# Deploy to Cloud Run (use the same command as before, to ensure secrets are injected)
# Make sure you have IMAGE_NAME set correctly before running this:
# IMAGE_NAME="us-central1-docker.pkg.dev/tubetor/tubetor-backend/backend:latest"

gcloud run deploy tubetor-backend \
    --image "$IMAGE_NAME" \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --port 8000 \
    --set-env-vars "APP_ENV=prod" \
    --update-secrets "GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID:latest,GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest,GOOGLE_REDIRECT_URI=GOOGLE_REDIRECT_URI:latest,APP_SECRET_KEY=APP_SECRET_KEY:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest" \
    --project tubetor

# amd build
IMAGE_NAME="us-central1-docker.pkg.dev/tubetor/tubetor-backend/backend:latest"
docker buildx build --platform linux/amd64 -t "$IMAGE_NAME" . --push

#Test
docker run -p "$LOCAL_PORT":"$CONTAINER_PORT"     -e APP_ENV="dev"     -e GOOGLE_CLIENT_ID="YOUR_LOCAL_GOOGLE_CLIENT_ID"     -e GOOGLE_CLIENT_SECRET="YOUR_LOCAL_GOOGLE_CLIENT_SECRET"     -e APP_SECRET_KEY="YOUR_LOCAL_APP_SECRET_KEY"     -e GEMINI_API_KEY="YOUR_LOCAL_GEMINI_API_KEY"   -e GOOGLE_REDIRECT_URI="http://test.com"  "$IMAGE_NAME"

# Replace 'YOUR_EXACT_GOOGLE_CLIENT_ID' with the client ID you copied from the console
# Example: MY_CLIENT_ID="1234567890-abcdef1234567890abcdef1234567890.apps.googleusercontent.com"
MY_CLIENT_ID="234898757030-aaftnbem1v9kdspku5iq1bo4f1tlneho.apps.googleusercontent.com" # <<< Paste your actual Client ID here

echo -n "$MY_CLIENT_ID" | gcloud secrets versions add GOOGLE_CLIENT_ID --data-file=- --project=tubetor

# Define your service account email (from the error message)
SERVICE_ACCOUNT="234898757030-compute@developer.gserviceaccount.com"
PROJECT_ID="tubetor" # Your project ID

# Grant permission for GOOGLE_CLIENT_ID
gcloud secrets add-iam-policy-binding GOOGLE_CLIENT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor" \
    --project=$PROJECT_ID

# Grant permission for GOOGLE_CLIENT_SECRET
gcloud secrets add-iam-policy-binding GOOGLE_CLIENT_SECRET \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor" \
    --project=$PROJECT_ID

# Grant permission for GOOGLE_REDIRECT_URI
gcloud secrets add-iam-policy-binding GOOGLE_REDIRECT_URI \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor" \
    --project=$PROJECT_ID

# Grant permission for APP_SECRET_KEY
gcloud secrets add-iam-policy-binding APP_SECRET_KEY \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor" \
    --project=$PROJECT_ID

# Grant permission for GEMINI_API_KEY
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor" \
    --project=$PROJECT_ID