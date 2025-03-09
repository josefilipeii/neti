import {HttpsError, onCall} from "firebase-functions/v2/https";
import {db, PUBSUB_QR_FILES_TOPIC} from "../firebase";
import { PubSub } from "@google-cloud/pubsub";
import { logger } from "firebase-functions";
import {FIRESTORE_REGION} from "../constants";
import {CallableRequest} from "firebase-functions/lib/v2/providers/https";

const pubsub = new PubSub();



function enforceAllowedOrigin(request: CallableRequest, allowedOrigins: string[]) {
  const origin = request.rawRequest.headers.origin;

  if (!origin || !allowedOrigins.some((allowed) => origin.startsWith(allowed))) {
    console.error(`Blocked request from origin: ${origin} : Expected ${allowedOrigins}`);
    throw new HttpsError("permission-denied", "Unauthorized origin");
  }
}


export const retryQrCodes = onCall(
  { region: FIRESTORE_REGION, enforceAppCheck: true },
  async (request : CallableRequest) => {
    const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS_ADMIN?.split(",") || [
      "https://odin-hybrid-day-checkin.web.app",
      "http://localhost:5173"
    ];
    enforceAllowedOrigin(request, ALLOWED_ORIGINS); // ✅ Allow only Odin domains
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be logged in to check in.");
    }

    const roles = request.auth.token.roles|| [];
    if (!roles?.includes("admin")) {
      throw new HttpsError("permission-denied", `You dont have permissions to do it. ${roles}`);
    }

    try {
      logger.info("🔍 Fetching QR codes with files...");

      // Fetch all documents from Firestore that contain the "files" object
      const snapshot = await db.collection("qrCodes")
        .where("files.qr", "==", null) // Missing QR Code
        .where("files.barcode", "==", null) // Missing Barcode
        .get();

      if (snapshot.empty) {
        logger.warn("⚠️ No QR codes found without 'files' object.");
        return  { success: true, message: "No QR codes found without 'files' object." };
      }

      let retryCount = 0;

      // Process each document and send a Pub/Sub message
      const publishPromises = snapshot.docs.map(async (doc) => {
        const docId = doc.id;

        // Prepare Pub/Sub message
        const messageData = { docId };
        await pubsub.topic(PUBSUB_QR_FILES_TOPIC).publishMessage({ json: messageData });

        logger.info(`📢 Published retry message for docId: ${docId}`);
        retryCount++;
      });

      // Wait for all messages to be published
      await Promise.all(publishPromises);
      return  { success: true, message: `Published retry messages for ${retryCount} QR codes.` };
    } catch (error) {
      logger.error("❌ Error fetching QR codes or publishing messages:", error);
      return new HttpsError("internal", "Error fetching QR codes or publishing messages.");
    }
  });
