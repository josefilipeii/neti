import { db, storage } from "../firebase";
import QRCode from "qrcode";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { FUNCTIONS_REGION, QR_BUCKET_NAME } from "./../constants";
import { Registration } from "../../../../packages/shared";
import crypto from "crypto"; // Node.js built-in crypto module
import bs58 from "bs58"
import { defineSecret } from "firebase-functions/params";



const selfCheckinSecret = process.env.QR_CODE_SECRET_KEY;
/**
 * Generates a deterministic but non-guessable hash-based QR ID.
 */
function generateQrId(competitionId: string, heatId: string, dorsal:string, secretKey?: string): string {
  if (!secretKey) {
    throw new Error("Secret key not set in Firebase Functions Config.");
  }

  const rawString = `${competitionId}-${heatId}-${dorsal}`;

  // Generate HMAC-SHA256 hash
  const hash = crypto.createHmac("sha256", secretKey)
    .update(rawString)
    .digest(); // Returns a 32-byte Buffer

  // Slice the first 16 bytes (128 bits) and encode with Base58
  return bs58.encode(hash.subarray(0, 20));
}

export const generateQrForRegistration = onDocumentCreated(
  {
    document: "competitions/{competitionId}/heats/{heatId}/registrations/{dorsal}",
    region: FUNCTIONS_REGION
  },
  async (event) => {
    const snap = event.data;
    const {competitionId, heatId, dorsal} = event.params;

    if (!snap || !snap.exists) {
      console.warn(`⚠️ No valid snapshot found for params: ${JSON.stringify(event.params)}, skipping QR generation.`);
      return;
    }

    try {
      const registration = snap.data() as Registration;
      console.log(`📌 Processing QR Code for registration: ${registration.category} - Dorsal ${dorsal}`);

      await db.runTransaction(async (transaction) => {
        // ✅ Generate a deterministic but non-guessable QR ID
        const qrId = generateQrId(competitionId, heatId, dorsal, selfCheckinSecret);
        const qrRef = db.collection("qrCodes").doc(qrId);

        // ✅ Avoid generating duplicate QR codes
        const qrSnap = await transaction.get(qrRef);
        if (qrSnap.exists) {
          console.log(`⚠️ QR Code already exists for ${qrId}, skipping regeneration.`);
          return;
        }

        // ✅ Generate the QR Code
        const qrCodeBuffer = await QRCode.toBuffer(qrId);

        // ✅ Save QR data in Firestore
        transaction.set(qrRef, {
          type: "registration",
          competition: competitionId,
          heat: heatId,
          createdAt: new Date(),
          dorsal: dorsal,
          redeemableBy: registration.participants.map(it => it.email),
          category: registration.category,
          day: registration.day,
          time: registration.time,
          self: qrId,
          participants: registration.participants.map(it => it.name),
        });

        // ✅ Store QR Code in Cloud Storage
        const qrFilePath = `qr_codes/${competitionId}/registrations/${heatId}/${dorsal}.png`;
        const bucket = storage.bucket(QR_BUCKET_NAME);
        const file = bucket.file(qrFilePath);

        await file.save(qrCodeBuffer, {contentType: "image/png"});

        console.log(`✅ QR Code successfully stored at: ${qrFilePath}`);
        // ✅ Update the registration document with the QR ID
        transaction.update(snap.ref, {qrId});
      });

    } catch (error) {
      console.error("❌ Error generating QR Code:", error);
    }
  }
);
