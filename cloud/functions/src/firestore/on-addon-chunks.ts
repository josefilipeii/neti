import {FIRESTORE_REGION} from "../constants";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {logger} from "firebase-functions";
import {firestore} from "firebase-admin";
import {db} from "../firebase";
import {generateQrId} from "../lib/qr";
import {Timestamp} from "firebase-admin/firestore";
import {AddonRow} from "../domain";

const MAX_RETRIES = 3;

/**
 * 🔥 Step 3: Process Chunks from Firestore
 */
export const processAddonChunks = onDocumentCreated(
  { document: "addon_import_tasks/{chunkId}", region: FIRESTORE_REGION },
  async (event) => {
    const snap = event.data;
    if (!snap || !snap.exists) {
      logger.error("❌ No chunk data found.");
      return;
    }

    await processChunkWithRetries(snap);
  }
);

/**
 * 🔥 Step 4: Process Each Chunk with Retry Logic
 */
async function processChunkWithRetries(snap: firestore.DocumentSnapshot) {
  const data = snap.data();
  if (!data) {
    logger.error("❌ Chunk data missing.");
    return;
  }

  const { eventId, data: rows, retryCount = 0 } = data;
  const batch = db.batch();

  try {
    logger.log(`🚀 Processing chunk ${snap.id} with ${rows.length} records.`);
    await snap.ref.update({ status: "processing" });

    rows.forEach((row: AddonRow) => {
      const referenceId = row.internalId || row.externalId as string;
      const referenceProvider = row.provider || "GF";
      const tshirtId = generateQrId(`${referenceProvider}-AT`, referenceId);
      const tshirtRef = db.collection(`competitions/${eventId}/addons/types/tshirts`).doc(tshirtId);

      batch.set(tshirtRef, {
        competition: eventId,
        provider: referenceProvider,
        referenceId: referenceId,
        name: row.name,
        email: row.email,
        sizes: {
          s: row.sizeS || "",
          m: row.sizeM || "",
          l: row.sizeL || "",
          xl: row.sizeXL || "",
          xxl: row.sizeXXL || "",
        },
        status: "pending",
        createdAt: Timestamp.now(),
      });
    });

    await batch.commit();
    await snap.ref.update({ processed: true, status: "completed" });

    logger.log(`✅ Chunk ${snap.id} completed.`);
  } catch (error) {
    logger.error(`❌ Error processing chunk ${snap.id}:`, error);

    if (retryCount < MAX_RETRIES) {
      await snap.ref.update({ retryCount: retryCount + 1, status: "failed" });
      logger.warn(`⚠️ Retrying chunk ${snap.id} (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
    } else {
      logger.error(`🛑 Chunk ${snap.id} failed after ${MAX_RETRIES} retries.`);
    }
  }
}