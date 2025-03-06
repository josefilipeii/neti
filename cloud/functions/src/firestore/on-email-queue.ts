import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { PubSub } from "@google-cloud/pubsub";
import { logger } from "firebase-functions";
import {FIRESTORE_REGION} from "../constants";

const pubsub = new PubSub();
const PUBSUB_TOPIC = "send-email";

export const handleEmailQueue = onDocumentCreated(
  { document: "email-queue/{docId}", region: FIRESTORE_REGION },
  async (event) => {
    const snap = event.data;

    if (!snap || !snap.exists) {
      logger.warn("⚠️ No valid snapshot found.");
      return;
    }

    const emailData = snap.data();
    const docId = event.params.docId;
    const docRef = snap.ref;

    try {
      // **Publish only the Firestore docId to Pub/Sub**
      const messageBuffer = Buffer.from(JSON.stringify({ docId }));
      await pubsub.topic(PUBSUB_TOPIC).publishMessage({ data: messageBuffer });

      // Update Firestore status to "processing"
      await docRef.update({ status: "processing" });

      logger.info(`✅ Published email job to Pub/Sub for ${emailData.to}`);
    } catch (error) {
      logger.error("❌ Failed to publish email job to Pub/Sub:", error);
      await docRef.update({ status: "failed" });
    }
  }
);
