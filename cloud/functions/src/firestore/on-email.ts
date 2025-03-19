import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {logger} from "firebase-functions";
import {FIRESTORE_REGION} from "../constants";
import {db} from "../firebase";
import {processEmail} from "../lib/email";


export const handleEmailQueue = onDocumentCreated(
  {document: "email-queue/{docId}", region: FIRESTORE_REGION},
  async (event) => {
    const snap = event.data;

    if (!snap || !snap.exists) {
      logger.warn("⚠️ No valid snapshot found.");
      return;
    }

    const docId = event.params.docId;
    const docRef = snap.ref;

    try {
      await db.runTransaction(async (transaction) => {
        await processEmail(snap, docId, transaction);
      });
    } catch (error) {
      logger.error("❌ Failed to Process Email:", error);
      await docRef.update({status: "failed"});
    }
  }
);
