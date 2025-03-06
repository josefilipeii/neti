# IAM roles
```
gcloud projects add-iam-policy-binding hybrid-day-checkin \
  --member="serviceAccount:service-744203796029@gs-project-accounts.iam.gserviceaccount.com" \
  --role="roles/pubsub.publisher"

gcloud projects add-iam-policy-binding hybrid-day-checkin \
  --member="serviceAccount:service-744203796029@gcp-sa-pubsub.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountTokenCreator"

gcloud projects add-iam-policy-binding hybrid-day-checkin \
  --member="serviceAccount:744203796029-compute@developer.gserviceaccount.com" \
  --role="roles/run.invoker"

gcloud projects add-iam-policy-binding hybrid-day-checkin \
  --member="serviceAccount:744203796029-compute@developer.gserviceaccount.com" \
  --role="roles/eventarc.eventReceiver"
  
gcloud projects add-iam-policy-binding hybrid-day-checkin \
  --member="serviceAccount:744203796029-compute@developer.gserviceaccount.com" \
  --role="roles/cloudfunctions.admin"

gcloud projects add-iam-policy-binding hybrid-day-checkin \
  --member="serviceAccount:744203796029-compute@developer.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding hybrid-day-checkin \
  --member="serviceAccount:744203796029-compute@developer.gserviceaccount.com" \
  --role="roles/editor"
  
  gcloud projects add-iam-policy-binding  hybrid-day-checkin \
  --member="serviceAccount:744203796029-compute@developer.gserviceaccount.com" \
  --role="roles/pubsub.editor"
  
    gcloud projects add-iam-policy-binding  hybrid-day-checkin \
  --member="serviceAccount:744203796029-compute@developer.gserviceaccount.com" \
  --role="roles/pubsub.publisher"
  
    gcloud projects add-iam-policy-binding  hybrid-day-checkin \
  --member="serviceAccount:744203796029-compute@developer.gserviceaccount.com" \
  --role="roles/pubsub.subscriber"
  
  


```


```
bucket

gcloud storage buckets create gs://hybrid-day-checkin.firebasestorage.app \
  --location=eu-southwest1 \
  --storage-class=STANDARD

```

``
firebase hosting:sites:create odin-hybrid-day-checkin
firebase target:apply hosting odin-hybrid-day-checkin odin-hybrid-day-checkin
firebase hosting:sites:create heimdall-hybrid-day-checkin
firebase target:apply hosting heimdall-hybrid-day-checkin heimdall-hybrid-day-checkin
firebase hosting:sites:create self-hybrid-day-checkin
firebase target:apply hosting self-hybrid-day-checkin self-hybrid-day-checkin

``