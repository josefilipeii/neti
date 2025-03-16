import * as admin from "firebase-admin";

export const app = admin.initializeApp();

export const db = admin.firestore();
export const storage = admin.storage();
export const PUBSUB_EMAIL_TOPIC = "send-email";
export const PUBSUB_QR_FILES_TOPIC = "generate-qr-file";

export const PUBSUB_QR_VOID = "void-qr-code";

