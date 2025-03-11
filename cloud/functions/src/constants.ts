

export const participantsDirectory = (event: string) => `participants/${event}`;
export const addonsDirectory = (event: string) => `addons/${event}`;
export const FIRESTORE_REGION = "europe-southwest1";
export const STORAGE_REGION = "europe-west1";

export const QR_BUCKET_NAME = `qr-data-${process.env.GCLOUD_PROJECT}`;