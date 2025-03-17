import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {db} from "../firebase";
import {logger} from "firebase-functions";
import {firestore} from "firebase-admin";
import {FIRESTORE_REGION} from "../constants";
import {Row} from "../domain";
import {Timestamp} from "firebase-admin/firestore";
import {Competition, RegistrationParticipant} from "../../../../packages/shared";

const MAX_RETRIES = 3;


/**
 * Firestore trigger for processing chunked registrations.
 */
export const processChunk = onDocumentCreated(
  {document: "import_tasks/{chunkId}", region: FIRESTORE_REGION},
  async (event) => {
    const snap = event.data; // Get the document snapshot after the write
    if (!snap || !snap.exists) {
      logger.error("❌ No chunk data found.");
      return;
    }

    await processChunkWithRetries(snap);
  }
);


async function processChunkWithRetries(snap: firestore.DocumentSnapshot) {
  const data = snap.data();
  if (!data) {
    logger.error("❌ Chunk data missing.");
    return;
  }

  const {eventId, chunkIndex, data: registrations, retryCount = 0, chunkHeats} = data;

  if (!registrations || registrations.length === 0) {
    logger.warn(`⚠️ Empty chunk ${snap.id}, skipping.`);
    await snap.ref.update({processed: true, status: "skipped"});
    return;
  }

  try {

    for (const heatId of chunkHeats) {
      await deleteExistingRegistrations(eventId, heatId);
      await voidExistingQRS(registrations)
    }

    logger.log(`🚀 Processing chunk ${snap.id} with ${registrations.length} records. Index: ${chunkIndex}`);
    await snap.ref.update({status: "processing"});

    const competition = db.collection("competitions").doc(eventId);
    const competitionSnap = await competition.get();
    if (!competitionSnap.exists) {
      logger.warn(`⚠️ Competition ${eventId} not found.`);
      return;
    }

    const competitionData = competitionSnap.data() as Competition;
    const competitionInfo = {
      id: eventId,
      name: competitionData.name
    }


    const batchSize = 150; // Firestore batch write limit
    let batch = db.batch();
    let batchCount = 0;

    for (let i = 0; i < registrations.length; i++) {
      const row: Row = registrations[i];

      const regRef = db
        .collection(`competitions/${eventId}/heats/${row.heatId}/registrations`)
        .doc(row.dorsal);

      batch.set(regRef, {
        heatId: row.heatId,
        participants: row.participants,
        category: row.category,
        createdAt: row.createdAt,
        qrId: row.registrationId,
        day: row.heatDay,
        time: row.heatTime,
        provider: row.provider,
        providerId: row.providerId
      });

      batchCount++;

      const qrRef = db.collection("qrCodes").doc(row.registrationId);

      const qrData = {
        id: row.registrationId,
        code: `${eventId}:${row.heatId}:${row.dorsal}`,
        createdAt: Timestamp.now().toDate().toString(),
        type: "registration",
        competition: competitionInfo,
        registration: {
          dorsal: row.dorsal,
          category: row.category,
          day: row.heatDay,
          time: row.heatTime!,
          heat: row.heatId,
          participants: row.participants.map((p: RegistrationParticipant) => ({
            email: p.email,
            name: p.name,
            contact: p.contact,
          })),
        },
        redeemableBy: row.participants.map((p: RegistrationParticipant) => p.email),
        provider: row.provider,
        status: "init",
        sent: false,
      };
      batch.set(qrRef, qrData);
      batchCount++;


      // Commit batch when batch size reaches limit or when processing the last item
      if (batchCount >= batchSize || i === registrations.length - 1) {
        await batch.commit();
        logger.log(`✅ Committed batch of ${batchCount} registrations for chunk ${snap.id}`);
        // Start a new batch
        batch = db.batch();
        batchCount = 0;
      }
    }

    await snap.ref.update({processed: true, status: "completed"});
    await updateImportProgress(eventId);

    logger.log(`✅ Chunk ${snap.id} fully processed.`);
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

/**
 * Deletes existing registrations for a specific heat.
 */
const deleteExistingRegistrations = async (eventId: string, heatId: string) => {
  const registrationsRef = db.collection(`competitions/${eventId}/heats/${heatId}/registrations`);
  const snapshot = await registrationsRef.get();

  const batch = db.batch();
  snapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
}


const voidExistingQRS = async (registration: Row[]) => {
  const qrCodes = db.collection("qrCodes");
  const batch = db.batch();
  for (const row of registration) {
    const qrCode = qrCodes.doc(row.registrationId);
    const qrCodeSnap = await qrCode.get();
    if (qrCodeSnap.exists) {
      batch.update(qrCode, {
        status: "void",
        voidReason: "Registration deleted",
        lastUpdated: Timestamp.now(),
      });
    }
  }
  await batch.commit();

}

/**
 * Updates import progress in Firestore.
 */
async function updateImportProgress(eventId: string) {
  const statusRef = db.collection("import_status").doc(eventId);

  await db.runTransaction(async (transaction) => {
    const statusDoc = await transaction.get(statusRef);
    if (!statusDoc.exists) return;

    const processedChunks = statusDoc.data()?.processedChunks + 1;
    const totalChunks = statusDoc.data()?.totalChunks;
    const newStatus = processedChunks === totalChunks ? "completed" : "in-progress";

    transaction.update(statusRef, {
      processedChunks,
      status: newStatus,
      lastUpdated: Timestamp.now(),
    });

    logger.log(`📊 Progress updated: ${processedChunks}/${totalChunks} chunks completed.`);
  });
}
