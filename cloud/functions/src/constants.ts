

export const participantsDirectory = (event: string) => `participants/${event}`;
export const addonsDirectory = (event: string) => `participants/${event}`;
export const FUNCTIONS_REGION = "europe-west1";



export const CONFIG_BUCKET_NAME = `config-${process.env.GCLOUD_PROJECT}`;
export const QR_BUCKET_NAME = `qr-data-${process.env.GCLOUD_PROJECT}`;