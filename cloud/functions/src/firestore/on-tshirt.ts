import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {FIRESTORE_REGION} from "../constants";
import {logger} from "firebase-functions";
import {db, PUBSUB_QR_FILES_TOPIC} from "../firebase";
import {qrCollectionPath} from "../domain/collections";
import {Transaction} from "firebase-admin/firestore";
import {TshirtAddon} from "../../../../packages/shared";
import {PubSub} from "@google-cloud/pubsub";

const pubsub = new PubSub();
export const processTshirts = onDocumentCreated(
  {
    region: FIRESTORE_REGION,
    document: "competitions/{eventId}/addons/types/{type}/{docId}"
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

    await db.runTransaction(async (transaction: Transaction) => {

      const ref = snap.ref;
      const tshirt = data as TshirtAddon;

      const qrRef = db.collection(qrCollectionPath).doc(docId);
      transaction.set(qrRef, {
        createdAt: new Date(),
        type: "addon",
        addonType: "tshirt",
        competition: tshirt.competition,
        name: tshirt.name,
        email: tshirt.email,
        sizes: tshirt.sizes,
        status: "init",
        sent: false,
        provider: tshirt.provider
      });




      transaction.update(ref, {status: "processed"});



    }).then(async () => {
      const messageBuffer = Buffer.from(JSON.stringify({ docId: docId }));
      await pubsub.topic(PUBSUB_QR_FILES_TOPIC).publishMessage({ data: messageBuffer });
    });


    logger.log(`✅ QR Code ${docId} generated and registration completed.`);
  }
);
