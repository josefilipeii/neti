import {Category, Participant} from "../../../../packages/shared";
import {db, storage} from "../firebase";
import QRCode from "qrcode";
import crypto from "crypto";
import bs58 from "bs58";
import {FUNCTIONS_REGION, QR_BUCKET_NAME} from "./../constants";
import {Bucket, File} from "@google-cloud/storage";
import {Transaction} from "firebase-admin/firestore";
import {logger} from "firebase-functions";
import {onDocumentCreated} from "firebase-functions/v2/firestore";

/** Generates a secure QR ID */
function generateQrId(competitionId: string, heatId: string, dorsal: string, secretKey?: string): string {
  if (!secretKey) {
    throw new Error("Secret key not set in Firebase Functions Config.");
  }
  const rawString = `${competitionId}-${heatId}-${dorsal}`;
  const hash = crypto.createHmac("sha256", secretKey).update(rawString).digest();
  return bs58.encode(hash.subarray(0, 20));
}

function qrCollectionPath(): string {
  return "qrCodes";
}

function heatCollectionPath(eventId: string): string {
  return `competitions/${eventId}/heats`;
}

async function ensureCategory(eventId: string, categoryName: string, transaction: Transaction): Promise<Category | null> {
  const categoriesCollection = db.collection(`competitions/${eventId}/categories`);
  const categoryQuery = await transaction.get(categoriesCollection.where("name", "==", categoryName));
  if (categoryQuery.empty) return null;
  return categoryQuery.docs[0].data() as Category;
}


function registrationCollectionPath(eventId: string, heatId: string): string {
  return `${heatCollectionPath(eventId)}/${heatId}/registrations`;
}


export const generateQRCodes = onDocumentCreated(
  {
    region: FUNCTIONS_REGION,
    document: "competitions/{eventId}/heats/{heatId}/registrations/{dorsal}"
  }, async (event) => {
    const snap = event.data;
    if (!snap?.exists) {
      logger.warn(`⚠️ No valid snapshot found for params: ${JSON.stringify(event.params)}, skipping QR code generation.`);
      return;
    }
    const data = snap.data();

    if (!data || data.status !== "pending") return;

    const {eventId, heatId, dorsal, categoryName, participants} = data;
    const selfCheckinSecret = process.env.QR_CODE_SECRET_KEY;
    if (!selfCheckinSecret) {
      logger.error("❌ Secret key missing.");
      return;
    }

    const qrId: string = generateQrId(eventId, heatId, dorsal, selfCheckinSecret);
    const qrBucket: Bucket = storage.bucket(QR_BUCKET_NAME);
    const qrCodeBuffer: Buffer = await QRCode.toBuffer(qrId);

    const qrFilePath: string = `qr_codes/${eventId}/registrations/${heatId}/${dorsal}.png`;
    const qrFile: File = qrBucket.file(qrFilePath);
    await qrFile.save(qrCodeBuffer, {contentType: "image/png"});

    await db.runTransaction(async (transaction) => {
      const registrationRef = db.collection(registrationCollectionPath(eventId, heatId)).doc(dorsal);
      const qrRef = db.collection(qrCollectionPath()).doc(qrId);

      const categoryDoc = await ensureCategory(eventId, categoryName, transaction);
      if (!categoryDoc) return;

      transaction.update(registrationRef, {
        qrId,
        status: "processed",
        category: categoryDoc.id,
        processedAt: new Date(),
      });

      transaction.set(qrRef, {
        createdAt: new Date(),
        type: "registration",
        competition: {id: eventId, name: data.competitionName},
        redeemableBy: participants.map((p: Participant) => p.email),
        registration: {
          heat: {id: heatId, name: data.heatName, day: data.heatDay, time: data.heatTime},
          dorsal,
          category: {id: categoryDoc.id, name: categoryName},
          participants,
        },
        self: qrId,
      });
    });

    logger.log(`✅ QR Code ${qrId} generated and saved.`);
  });
