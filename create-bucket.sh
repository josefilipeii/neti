#!/bin/zsh

prefix="$1"
region="europe-west1"
PROJECT_ID=$(firebase use --json | jq -r '.active')
gcloud storage buckets create gs://$prefix-$PROJECT_ID -location=$region --default-storage-class


