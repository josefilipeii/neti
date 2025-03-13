import { FIRESTORE_REGION, QR_BUCKET_NAME } from "../constants";
import { logger } from "firebase-functions";
import { QRAddonDocument, QRDocument, QRRegistrationDocument, QRTShirtDocument } from "../../../../packages/shared";
import { db, PUBSUB_QR_FILES_TOPIC, storage } from "../firebase";
import QRCode from "qrcode";
import bwipjs from "bwip-js";
import { onMessagePublished } from "firebase-functions/v2/pubsub";
import { PubSub } from "@google-cloud/pubsub";
import { Bucket, File } from "@google-cloud/storage";

const pubsub = new PubSub();
const MAX_RETRIES = 3;
const BATCH_SIZE = 50; // Adjustable batch size

export const processQrCodes = onMessagePublished(
  {
    region: FIRESTORE_REGION,
    topic: PUBSUB_QR_FILES_TOPIC,
    retry: false, // We manually handle retries
  },
  async (event) => {
    const message = event.data?.message;
    if (!message?.data) {
      logger.warn("⚠️ No valid data received.");
      return;
    }

    const { docIds, retryCount = 0 } = JSON.parse(
      Buffer.from(message.data, "base64").toString("utf8")
    );

    if (!docIds || !Array.isArray(docIds) || docIds.length === 0) {
      logger.error("❌ No valid document IDs received from Pub/Sub.");
      return;
    }

    // Process in smaller batches if needed
    const chunks = chunkArray(docIds, BATCH_SIZE);

    for (const batch of chunks) {
      await processBatch(batch, retryCount);
    }
  }
);

/**
 * Splits an array into smaller chunks.
 */
function chunkArray(arr: string[], size: number): string[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
}

/**
 * Processes a batch of QR codes.
 */
async function processBatch(docIds: string[], retryCount: number) {
  try {
    // Fetch all documents in one batch
    const snapshots = await db.getAll(...docIds.map((id) => db.collection("qrCodes").doc(id)));

    const tasks = snapshots.map(async (docSnapshot) => {
      if (!docSnapshot.exists) {
        logger.warn(`⚠️ QR Code document ${docSnapshot.id} not found.`);
        return;
      }

      const data = docSnapshot.data() as QRDocument;
      if (!data) return;

      let qrPath, barCodePath;
      if (data.type === "registration") {
        const { competition, provider } = data as QRRegistrationDocument;
        const directory = `qr_codes/${competition}/registrations/${provider}/${docSnapshot.id}`;
        barCodePath = `${directory}/barcode.png`;
        qrPath = `${directory}/qr_code.png`;
      } else if (data.type === "addon" && (data as QRAddonDocument).addonType === "tshirt") {
        const { competition } = data as QRTShirtDocument;
        const directory = `qr_codes/${competition}/addons/tshirt/${docSnapshot.id}`;
        barCodePath = `${directory}/barcode.png`;
        qrPath = `${directory}/qr_code.png`;
      } else {
        logger.warn(`⚠️ Invalid type ${data.type} for ${docSnapshot.id}`);
        return;
      }

      const bucket: Bucket = storage.bucket(QR_BUCKET_NAME);
      const qrFile: File = bucket.file(qrPath);
      const barCodeFile: File = bucket.file(barCodePath);

      try {
        // Generate QR Code
        const qrCodeBuffer = await QRCode.toBuffer(docSnapshot.id, {
          errorCorrectionLevel: "H",
          width: 500,
          margin: 2,
        });
        await qrFile.save(qrCodeBuffer, { contentType: "image/png" });

        // Generate Barcode
        const barCodeBuffer = await bwipjs.toBuffer({
          bcid: "code128",
          text: docSnapshot.id,
          scale: 2,
          height: 20,
          backgroundcolor: "FFFFFF",
          paddingwidth: 10,
          paddingheight: 10,
          includetext: true,
          textsize: 10,
          textyoffset: 10,
          rotate: "L",
        });
        await barCodeFile.save(barCodeBuffer, { contentType: "image/png" });

        // Generate public URLs
        const [qrUrl] = await qrFile.getSignedUrl({ action: "read", expires: "01-01-2030" });
        const [barCodeUrl] = await barCodeFile.getSignedUrl({ action: "read", expires: "01-01-2030" });

        // 🔹 Update Firestore
        await docSnapshot.ref.update({
          status: "ready",
          "files.qr": qrUrl,
          "files.barcode": barCodeUrl,
        });

        logger.info(`✅ Successfully generated QR & barcode for ${docSnapshot.id}`);
      } catch (error) {
        logger.error(`❌ Error processing QR for ${docSnapshot.id}:`, error);
      }
    });

    await Promise.all(tasks); // Run tasks in parallel within the batch
  } catch (error) {
    logger.error("❌ Batch processing failed:", error);

    // 🔄 Retry Logic with Exponential Backoff
    if (retryCount < MAX_RETRIES) {
      const newRetryCount = retryCount + 1;
      const delay = Math.pow(2, newRetryCount) * 1000; // 2s, 4s, 8s

      logger.warn(`🔁 Retrying batch in ${delay / 1000} seconds (attempt ${newRetryCount}/${MAX_RETRIES})`);

      setTimeout(async () => {
        const messageBuffer = Buffer.from(JSON.stringify({ docIds, retryCount: newRetryCount }));
        await pubsub.topic(PUBSUB_QR_FILES_TOPIC).publishMessage({ data: messageBuffer });
      }, delay);
    } else {
      logger.error("🚨 Max retries reached. Processing failed permanently.");
    }
  }
}
