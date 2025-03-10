#!/bin/zsh

PROJECT_ID="$1"

PROJECT_NUMBER=$(gcloud projects describe hybrid-day-checkin --format="value(projectNumber)")
SERVICE_ACCOUNT="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com"
echo "$PROJECT_ID:$PROJECT_NUMBER"

ROLES=(
 "roles/iam.serviceAccountTokenCreator"
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



gcloud storage buckets add-iam-policy-binding "gs://qr-data-$PROJECT_ID" \
    --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/storage.objectAdmin"