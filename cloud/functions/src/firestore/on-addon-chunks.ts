import {FIRESTORE_REGION} from "../constants";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {logger} from "firebase-functions";
import {firestore} from "firebase-admin";
import {db} from "../firebase";
import {generateQrId} from "../lib/qr";
import {Timestamp} from "firebase-admin/firestore";
import {AddonRow} from "../domain";
import {Competition} from "../../../../packages/shared";
import {qrCollectionPath} from "../domain/collections";

const MAX_RETRIES = 3;

/**
 * 🔥 Step 3: Process Chunks from Firestore
 */
export const processAddonChunks = onDocumentCreated(
  {document: "addon_import_tasks/{chunkId}", region: FIRESTORE_REGION},
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

  const {eventId, data: rows, retryCount = 0} = data;

  const competition = db.collection("competitions").doc(eventId);
  const competitionSnap = await competition.get();
  if (!competitionSnap.exists) {
    logger.warn(`⚠️ Competition ${eventId} not found.`);
    return;
  }

  const competitionData = competitionSnap.data() as Competition;
  const competitionInfo = {
    id: eventId,
    name: competitionData.name,
    address: competitionData.address,
    checkinMinutesBefore: competitionData.checkinMinutesBefore
  }


  try {
    let batch = db.batch();
    logger.log(`🚀 Processing chunk ${snap.id} with ${rows.length} records.`);
    await snap.ref.update({status: "processing"});


    let batchCount = 0;
    for (let i = 0; i < rows.length; i++) {
      const row: AddonRow = rows[i];
      const referenceId = row.internalId || row.externalId as string;
      const referenceProvider = row.provider || "GF";
      const tshirtId = generateQrId(`${referenceProvider}-AT`, eventId, referenceId);
      const tshirtRef = db.collection(`competitions/${eventId}/addons/types/tshirts`).doc(tshirtId);

      let sizes = {
        s: row.sizeS || "",
        m: row.sizeM || "",
        l: row.sizeL || "",
        xl: row.sizeXL || "",
        xxl: row.sizeXXL || "",
      };
      batch.set(tshirtRef, {
        competition: competitionInfo,
        provider: referenceProvider,
        referenceId: referenceId,
        name: row.name,
        email: row.email,
        sizes: sizes,
        status: "pending",
        createdAt: Timestamp.now(),
      });

      batchCount++;

      const qrRef = db.collection(qrCollectionPath).doc(tshirtId);
      batch.set(qrRef, {
        id: tshirtId,
        createdAt: new Date(),
        type: "addon",
        addonType: "tshirt",
        competition: competitionInfo,
        name: row.name,
        email: row.email,
        sizes: sizes,
        status: "init",
        sent: false,
        provider: referenceProvider
      });
      batchCount++;

      if (batchCount >= 150 || i === rows.length - 1) {
        await batch.commit();
        logger.log(`✅ Committed batch of ${batchCount} registrations for chunk ${snap.id}`);
        // Start a new batch
        batch = db.batch();
        batchCount = 0;
      }

    }

    await snap.ref.update({processed: true, status: "completed"});

    logger.log(`✅ Chunk ${snap.id} completed.`);
  } catch (error) {
    logger.error(`❌ Error processing chunk ${snap.id}:`, error);

    if (retryCount < MAX_RETRIES) {
      await snap.ref.update({retryCount: retryCount + 1, status: "failed"});
      logger.warn(`⚠️ Retrying chunk ${snap.id} (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
    } else {
      logger.error(`🛑 Chunk ${snap.id} failed after ${MAX_RETRIES} retries.`);
    }
  }
}
