import {HttpsError, onCall} from "firebase-functions/v2/https";
import {db} from "../firebase";
import {logger} from "firebase-functions";
import {FIRESTORE_REGION} from "../constants";
import {CallableRequest} from "firebase-functions/lib/v2/providers/https";
import {firestore} from "firebase-admin";
import QueryDocumentSnapshot = firestore.QueryDocumentSnapshot;

const BATCH_SIZE = 500; // Firestore limits batch writes to 500

export const resetQrCodes = onCall(
  {region: FIRESTORE_REGION, enforceAppCheck: true},
  async (request: CallableRequest<{competitionId: string}>) => {
    const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS_ADMIN?.split(",") || [
      "https://odin-hybrid-day-checkin.web.app",
      "http://localhost:5173",
    ];

    enforceAllowedOrigin(request, ALLOWED_ORIGINS); // ✅ Allow only Odin domains

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be logged in to reset QR codes.");
    }

    const roles = request.auth.token.roles || [];
    if (!roles.includes("admin")) {
      throw new HttpsError("permission-denied", `You don't have permission to reset QR codes. ${roles}`);
    }

    const {competitionId} = request.data;

    try {
      logger.info("🔍 Starting QR code reset process...");
      let totalUpdated = await processBatch(competitionId); // Start recursive batch processing
      logger.info(`✅ Reset ${totalUpdated} QR codes to 'init'.`);
      return {success: true, message: `Reset ${totalUpdated} QR codes.`};
    } catch (error) {
      logger.error("❌ Error resetting QR codes:", error);
      throw new HttpsError("internal", "Error resetting QR codes.");
    }
  }
);



export const retryProcessQrCodes = onCall(
  {region: FIRESTORE_REGION, enforceAppCheck: true},
  async (request: CallableRequest<{competitionId: string}>) => {
    const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS_ADMIN?.split(",") || [
      "https://odin-hybrid-day-checkin.web.app",
      "http://localhost:5173",
    ];

    enforceAllowedOrigin(request, ALLOWED_ORIGINS); // ✅ Allow only Odin domains

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be logged in to reset QR codes.");
    }

    const roles = request.auth.token.roles || [];
    if (!roles.includes("admin")) {
      throw new HttpsError("permission-denied", `You don't have permission to reset QR codes. ${roles}`);
    }

    const {competitionId} = request.data;

    try {
      logger.info("🔍 Starting QR code reset process...");
      let totalUpdated = await reProcessBatch(competitionId); // Start recursive batch processing
      logger.info(`✅ Reset ${totalUpdated} QR codes to 'init'.`);
      return {success: true, message: `Reset ${totalUpdated} QR codes.`};
    } catch (error) {
      logger.error("❌ Error resetting QR codes:", error);
      throw new HttpsError("internal", "Error resetting QR codes.");
    }
  }
);

/**
 * Recursively processes QR code updates in batches of 500
 */
async function processBatch(competitionId: string, lastDoc: QueryDocumentSnapshot | null = null, totalUpdated = 0) {
  let query = db.collection("qrCodes")
    .where("status", "!=", "init")
    .where("competition.id", "==", competitionId)
    .orderBy("status").limit(BATCH_SIZE);

  if (lastDoc) {
    query = query.startAfter(lastDoc);
  }

  const snapshot = await query.get();

  if (snapshot.empty) {
    return totalUpdated; // All done
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, {status: "init"});
  });

  await batch.commit();
  totalUpdated += snapshot.size;
  logger.info(`🔄 Updated ${snapshot.size} QR codes, total so far: ${totalUpdated}`);

  // Recursive call for next batch
  return processBatch(competitionId, snapshot.docs[snapshot.docs.length - 1], totalUpdated);
}
async function reProcessBatch(competitionId: string, lastDoc: QueryDocumentSnapshot | null = null, totalUpdated = 0) {
  let query = db.collection("qrCodes")
    .where("status", "==", "init")
    .where("competition.id", "==", competitionId)
    .orderBy("status").limit(BATCH_SIZE);

  if (lastDoc) {
    query = query.startAfter(lastDoc);
  }

  const snapshot = await query.get();

  if (snapshot.empty) {
    return totalUpdated; // All done
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, {status: "init"});
  });

  await batch.commit();
  totalUpdated += snapshot.size;
  logger.info(`🔄 Updated ${snapshot.size} QR codes, total so far: ${totalUpdated}`);

  // Recursive call for next batch
  return processBatch(competitionId, snapshot.docs[snapshot.docs.length - 1], totalUpdated);
}


function enforceAllowedOrigin(request: CallableRequest, allowedOrigins: string[]) {
  const origin = request.rawRequest.headers.origin;

  if (!origin || !allowedOrigins.some((allowed) => origin.startsWith(allowed))) {
    logger.error(`Blocked request from origin: ${origin} : Expected ${allowedOrigins}`);
    throw new HttpsError("permission-denied", "Unauthorized origin");
  }
}




