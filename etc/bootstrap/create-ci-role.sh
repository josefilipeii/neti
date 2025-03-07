#!/bin/zsh

PROJECT_ID="$1"
SERVICE_ACCOUNT_NAME="cicd-deploy"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
SERVICE_ACCOUNT="serviceAccount:${SERVICE_ACCOUNT_EMAIL}"

echo "serviceAccount:$SERVICE_ACCOUNT_EMAIL"

gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
    --display-name "Ci/CD Service Account"

gcloud iam service-accounts keys create github-actions-key.json \
    --iam-account $SERVICE_ACCOUNT_EMAIL

