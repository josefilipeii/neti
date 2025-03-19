import {onMessagePublished} from "firebase-functions/v2/pubsub";
import {logger} from "firebase-functions";
import {FIRESTORE_REGION} from "../constants";
import type {Transaction} from "firebase-admin/firestore";
import {db, PUBSUB_EMAIL_TOPIC} from "../firebase";
import {PubSub} from "@google-cloud/pubsub";
import {processEmail} from "../lib/email";

const pubsub = new PubSub();

export const processEmailQueue = onMessagePublished(
  {
    region: FIRESTORE_REGION,
    topic: PUBSUB_EMAIL_TOPIC,
    retry: false, // We manually handle retries
  },
  async (event) => {
    const message = event.data?.message;
    if (!message?.data) {
      logger.warn("⚠️ No valid email data received.");
      return;
    }

    const {docId, retryCount = 0} = JSON.parse(
      Buffer.from(message.data, "base64").toString("utf8")
    );

    if (!docId) {
      logger.error("❌ No document ID received from Pub/Sub.");
      return;
    }

    try {
      await db.runTransaction(async (transaction: Transaction) => {
        const docRef = db.collection("email-queue").doc(docId);
        const docSnapshot = await transaction.get(docRef);

        if (!docSnapshot.exists) {
          logger.error(`❌ Firestore document ${docId} not found.`);
          return;
        }
        await processEmail(docSnapshot, docId, transaction);
      });

    } catch (error) {
      logger.error(`❌ Email sending failed for ${docId}:`, error);

      // Retry logic
      if (retryCount < 3) {
        const newRetryCount = retryCount + 1;
        const delay = Math.pow(2, newRetryCount) * 1000; // Exponential backoff (2s, 4s, 8s)

        logger.warn(`🔁 Retrying email for ${docId} in ${delay / 1000} seconds (attempt ${newRetryCount}/3)`);

        setTimeout(async () => {

          const messageBuffer = Buffer.from(JSON.stringify({ docId, retryCount: newRetryCount }));
          await pubsub.topic(PUBSUB_EMAIL_TOPIC).publishMessage({ data: messageBuffer });
        }, delay);
      } else {
        logger.error(`🚨 Max retries reached for ${docId}. Email delivery failed permanently.`);
      }
    }
  }
);


