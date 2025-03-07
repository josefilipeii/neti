#!/bin/zsh

PROJECT_ID="$1"
SERVICE_ACCOUNT_NAME="cicd-deploy"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
SERVICE_ACCOUNT="serviceAccount:${SERVICE_ACCOUNT_EMAIL}"

echo "serviceAccount:$SERVICE_ACCOUNT_EMAIL"



# List of roles to assign
ROLES=(
  "roles/firebase.admin"                # Full access to Firebase services
  "roles/firebasehosting.admin"         # Needed for Firebase Hosting deployments
  "roles/firebaserules.admin"           # Needed for managing Firebase Rules
  "roles/datastore.user"                # Needed for Firestore access
  "roles/cloudfunctions.admin"          # Needed to deploy Cloud Functions
  "roles/cloudbuild.builds.editor"      # Required for Cloud Build to run builds
  "roles/storage.admin"                 # Needed for Firebase Storage access
  "roles/serviceusage.serviceUsageAdmin" # Allows enabling required APIs
  "roles/iam.serviceAccountUser"
  "roles/cloudbuild.builds.editor"
  "roles/artifactregistry.admin"
  "roles/run.admin"
)

# Assign each role to the service account
for ROLE in "${ROLES[@]}"; do
  echo "Assigning $ROLE to $SERVICE_ACCOUNT..."
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="$SERVICE_ACCOUNT" \
    --role="$ROLE" \
    --condition=None\
    --quiet
done


