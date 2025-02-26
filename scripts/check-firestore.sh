#!/bin/bash

PROJECT_ID="$1"
COLLECTION_NAME="$2"


# Check if the collection exists
COLLECTION_COUNT=$(firebase firestore:export --project "$PROJECT_ID" --quiet | jq '. | length')

if [[ "$COLLECTION_COUNT" -eq 0 ]]; then
  echo "⚠️ Collection '$COLLECTION_NAME' does not exist. Creating it now..."
  firebase firestore:import --project "$PROJECT_ID" "data/firestore-$COLLECTION_NAME-init.json"
else
  echo "✅ Collection '$COLLECTION_NAME' already exists."
fi
