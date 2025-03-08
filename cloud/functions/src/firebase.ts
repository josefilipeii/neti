import * as admin from "firebase-admin";

export const app = admin.initializeApp();

export const db = admin.firestore();
export const storage = admin.storage();
export const PUBSUB_EMAIL_TOPIC = "send-email";
