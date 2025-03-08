import {Category, Competition, Participant} from "../../../../packages/shared";
import {db, storage} from "../firebase";
import QRCode from "qrcode";
import crypto from "crypto";
import bs58 from "bs58";
import {FIRESTORE_REGION, QR_BUCKET_NAME} from "./../constants";
import {Bucket, File} from "@google-cloud/storage";
import {Transaction} from "firebase-admin/firestore";
import {logger} from "firebase-functions";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {qrCollectionPath, registrationCollectionPath} from "../domain/collections";

/** Generates a secure QR ID */
function generateQrId(competitionId: string, heatId: string, dorsal: string, secretKey?: string): string {
  if (!secretKey) {
    throw new Error("Secret key not set in Firebase Functions Config.");
  }
  const rawString = `${competitionId}-${heatId}-${dorsal}`;
  const hash = crypto.createHmac("sha256", secretKey).update(rawString).digest();
  return bs58.encode(hash.subarray(0, 20));
}


const ensureCategory = async (eventId: string, categoryName: string, transaction: Transaction): Promise<Category | null> => {
  const categoriesCollection = db.collection(`competitions/${eventId}/categories`);
  const categoryQuery = await transaction.get(categoriesCollection.where("name", "==", categoryName));
  if (categoryQuery.empty) return null;
  return categoryQuery.docs[0].data() as Category;
}

const ensureEvent = async (eventId: string, transaction: Transaction): Promise<Competition | null> => {
  const eventRef = db.doc(`competitions/${eventId}`);
  const eventSnap = await transaction.get(eventRef);
  if (!eventSnap.exists) {
    logger.error(`❌ Event with ID ${eventId} does not exist.`);
    return null;
  }
  return eventSnap.data() as Competition;
}

/**
 * Ensures the heat exists in Firestore.
 */
const ensureHeat = async (eventId: string, heatId: string, heatName: string, heatDay: string, heatTime: string, transaction: Transaction): Promise<void> => {
  const heatRef = db.collection(`competitions/${eventId}/heats`).doc(heatId);
  const heatSnap = await transaction.get(heatRef);
  if (!heatSnap.exists) {
    transaction.set(heatRef, {
      name: heatName,
      day: heatDay,
      time: heatTime,
    });
    logger.log(`✅ Heat '${heatName}' created.`);
  }
};

export const processRegistrations = onDocumentCreated(
  {
    region: FIRESTORE_REGION,
    document: "tempRegistrations/{docId}"
  },
  async (event) => {
    const snap = event.data;
    if (!snap?.exists) {
      logger.warn("⚠️ No valid snapshot found, skipping registration processing.");
      return;
    }
    const data = snap.data();
    if (!data || data.status !== "pending") return;

    const {eventId, heatId, heatName, heatDay, heatTime,  dorsal, category, participants} = data;
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

      const tempRef = snap.ref;

      const registrationRef = db.collection(registrationCollectionPath(eventId, heatId)).doc(dorsal);
      const qrRef = db.collection(qrCollectionPath).doc(qrId);

      const eventDoc = await ensureEvent(eventId, transaction);
      if(!eventDoc) {
        logger.warn(`❌ Event with ID ${eventId} does not exist.`);
        return;
      }

      const categoryDoc = await ensureCategory(eventId, category, transaction);
      if (!categoryDoc) {
        logger.warn(`❌ Category ${category} does not exist for event ${eventId}.`);
        return;
      }

      await ensureHeat(eventId, heatId, heatName, heatDay, heatTime, transaction);


      transaction.set(registrationRef, {
        qrId,
        status: "processed",
        category: {id: categoryDoc.id, name: category},
        processedAt: new Date(),
        participants,
      });

      transaction.set(qrRef, {
        createdAt: new Date(),
        type: "registration",
        competition: {id: eventId, name: eventDoc.name},
        redeemableBy: participants.map((p: Participant) => p.email),
        registration: {
          heat: {
            id: heatId,
            name: heatName,
          },
          time: heatTime,
          day: heatDay,
          dorsal,
          category: {id: categoryDoc.id, name: category},
          participants,
        },
        self: qrId,
      });

      transaction.update(tempRef, {status: "processed"});

    });


    logger.log(`✅ QR Code ${qrId} generated and registration completed.`);
  }
);
