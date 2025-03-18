import { FIRESTORE_REGION, QR_BUCKET_NAME } from "../constants";
import { logger } from "firebase-functions";
import { db, PUBSUB_QR_FILES_TOPIC, storage } from "../firebase";
import { onMessagePublished } from "firebase-functions/v2/pubsub";
import {
  Competition,
  QRAddonDocument,
  QRDocument,
  QRRegistrationDocument,
  QRTShirtDocument
} from "../../../../packages/shared";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { generateQrAndBarcode, generateTicketPdf, generateTshirtPdf } from "../lib/qr";
import * as fs from "fs";

pdfMake.vfs = pdfFonts.vfs;

const BATCH_SIZE = 5; // Adjustable batch size

export const processQrCodes = onMessagePublished(
  {
    region: FIRESTORE_REGION,
    topic: PUBSUB_QR_FILES_TOPIC,
    timeoutSeconds: 120,
    retry: false,
    memory: "512MiB",
  },
  async (event) => {
    const message = event.data?.message;
    if (!message?.data) {
      logger.warn("⚠️ No valid data received.");
      return;
    }

    const { docIds } = JSON.parse(
      Buffer.from(message.data, "base64").toString("utf8")
    );

    if (!docIds || !Array.isArray(docIds) || docIds.length === 0) {
      logger.error("❌ No valid document IDs received from Pub/Sub.");
      return;
    }

    await processChunkQrCodes(docIds);
  }
);

/**
 * Process QR codes in batches with batch Firestore writes.
 */
const processBatch = async (docIds: string[]) => {
  const bucket = storage.bucket(QR_BUCKET_NAME);
  const batch = db.batch();

  const processTasks = docIds.map(async (qrId) => {
    try {
      const docRef = db.collection("qrCodes").doc(qrId);
      const docSnapshot = await docRef.get();

      if (!docSnapshot.exists) {
        logger.warn(`⚠️ QR Code document ${qrId} not found.`);
        return;
      }

      const data = docSnapshot.data() as QRDocument;
      const competitionDoc = await db.collection("competitions").doc(data.competition.id).get();

      if (!competitionDoc.exists) {
        throw new Error(`Competition ${data.competition.id} not found.`);
      }

      const competition = competitionDoc.data() as Competition;

      // Generate QR and Barcode in /tmp
      const { tmpQrPath, tmpBarcodePath } = await generateQrAndBarcode(qrId);

      // Determine ticket PDF generation function
      let ticketFunction: () => Promise<string>;
      let ticketPath;

      if (data.type === "registration") {
        ticketPath = `qr_codes/${data.competition.id}/registrations/${data.provider}/${qrId}/ticket.pdf`;
        ticketFunction = () => generateTicketPdf(data as QRRegistrationDocument, competition, tmpQrPath, tmpBarcodePath);
      } else if (data.type === "addon" && (data as QRAddonDocument).addonType === "tshirt") {
        ticketPath = `qr_codes/${data.competition.id}/addons/tshirts/${data.provider}/${qrId}/ticket.pdf`;
        ticketFunction = () => generateTshirtPdf(data as QRTShirtDocument, competition, tmpQrPath, tmpBarcodePath);
      } else {
        logger.warn(`⚠️ Invalid type ${data.type} for ${qrId}`);
        return;
      }

      // Generate PDF and upload it to Firebase Storage
      const tmpPdfPath = await ticketFunction();
      await bucket.upload(tmpPdfPath, { destination: ticketPath });

      // Get Signed URL for storage
      const ticketFile = bucket.file(ticketPath);
      const [ticketUrl] = await ticketFile.getSignedUrl({ action: "read", expires: "01-01-2100" });

      // Add update to Firestore batch
      batch.update(docRef, {
        status: "processed",
        "files.ticket": { url: ticketUrl, path: ticketPath },
      });

      // Cleanup temporary files
      fs.unlinkSync(tmpQrPath);
      fs.unlinkSync(tmpBarcodePath);
      fs.unlinkSync(tmpPdfPath);
    } catch (error) {
      logger.error(`❌ Error processing QR Code ${qrId}:`, error);
    }
  });

  // Wait for all processing tasks to finish
  await Promise.all(processTasks);

  // Commit batch updates to Firestore
  await batch.commit();
};

/**
 * Process QR codes in chunks to prevent memory overload.
 */
const processChunkQrCodes = async (docIds: string[]) => {
  const chunks = chunkArray(docIds, BATCH_SIZE);

  for (const batch of chunks) {
    await processBatch(batch);
  }
};

/**
 * Splits an array into smaller chunks.
 */
function chunkArray(arr: string[], size: number) {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
}
