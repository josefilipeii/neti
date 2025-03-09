import {Category, Competition, Participant} from "../../../../packages/shared";
import {db, PUBSUB_QR_FILES_TOPIC} from "../firebase";
import crypto from "crypto";
import bs58 from "bs58";
import {FIRESTORE_REGION} from "./../constants";
import {Transaction} from "firebase-admin/firestore";
import {logger} from "firebase-functions";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {qrCollectionPath, registrationCollectionPath} from "../domain/collections";
import {PubSub} from "@google-cloud/pubsub";

const pubsub = new PubSub();

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

    const {eventId, heatId, heatName, heatDay, heatTime, dorsal, category, participants} = data;
    const selfCheckinSecret = process.env.QR_CODE_SECRET_KEY;
    if (!selfCheckinSecret) {
      logger.error("❌ Secret key missing.");
      return;
    }

    const qrId: string = generateQrId(eventId, heatId, dorsal, selfCheckinSecret);

    await db.runTransaction(async (transaction) => {

      const tempRef = snap.ref;

      const registrationRef = db.collection(registrationCollectionPath(eventId, heatId)).doc(dorsal);
      const qrRef = db.collection(qrCollectionPath).doc(qrId);

      const eventDoc = await ensureEvent(eventId, transaction);
      if (!eventDoc) {
        logger.warn(`❌ Event with ID ${eventId} does not exist.`);
        return;
      }

      const categoryDoc = await ensureCategory(eventId, category, transaction);
      if (!categoryDoc) {
        logger.warn(`❌ Category ${category} does not exist for event ${eventId}.`);
        return;
      }

      await ensureHeat(eventId, heatId, heatName, heatDay, heatTime, transaction);


      const qrShortCode = `RG${eventId}-${heatId}-${dorsal}`

      transaction.set(registrationRef, {
        qrId,
        status: "processed",
        category: {id: categoryDoc.id, name: category},
        processedAt: new Date(),
        participants,
      });

      transaction.set(qrRef, {
        code: qrShortCode,
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



    }).then(async () => {
      const messageBuffer = Buffer.from(JSON.stringify({ docId: qrId }));
      await pubsub.topic(PUBSUB_QR_FILES_TOPIC).publishMessage({ data: messageBuffer });
    });


    logger.log(`✅ QR Code ${qrId} generated and registration completed.`);
  }
);
