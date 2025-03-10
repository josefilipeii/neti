import {Category, Competition, RegistrationParticipant} from "../../../../packages/shared";
import {db, PUBSUB_QR_FILES_TOPIC} from "../firebase";
import {FIRESTORE_REGION} from "./../constants";
import {Transaction} from "firebase-admin/firestore";
import {logger} from "firebase-functions";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {qrCollectionPath, registrationCollectionPath} from "../domain/collections";
import {PubSub} from "@google-cloud/pubsub";

const pubsub = new PubSub();

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
    const {docId} = event.params;
    if (!snap?.exists) {
      logger.warn("⚠️ No valid snapshot found, skipping registration processing.");
      return;
    }
    const data = snap.data();
    if (!data || data.status !== "pending") return;

    const {eventId, provider, heatId, heatName, heatDay, heatTime, dorsal, category, participants} = data;
    const indexedCode = `${eventId}:${heatId}:${dorsal}`.replace(/[_-]/g, "").toUpperCase();


    await db.runTransaction(async (transaction) => {

      const tempRef = snap.ref;

      const registrationRef = db.collection(registrationCollectionPath(eventId, heatId)).doc(dorsal);
      const qrRef = db.collection(qrCollectionPath).doc(docId);

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



      transaction.set(registrationRef, {
        qrId: docId,
        category: {id: categoryDoc.id, name: category},
        processedAt: new Date(),
        participants,
      });

      transaction.set(qrRef, {
        code: indexedCode,
        createdAt: new Date(),
        type: "registration",
        competition: {id: eventId, name: eventDoc.name},
        redeemableBy: participants.map((p: RegistrationParticipant) => p.email),
        status: "init",
        sent: false,
        registration: {
          heat: {
            id: heatId,
            name: heatName,
          },
          time: heatTime,
          day: heatDay,
          dorsal,
          category: {id: categoryDoc.id, name: category},
          participants
        },
        provider,
        self: docId,
      });

      transaction.update(tempRef, {status: "processed"});



    }).then(async () => {
      const messageBuffer = Buffer.from(JSON.stringify({ docId: docId }));
      await pubsub.topic(PUBSUB_QR_FILES_TOPIC).publishMessage({ data: messageBuffer });
    });


    logger.log(`✅ QR Code ${docId} generated and registration completed.`);
  }
);
