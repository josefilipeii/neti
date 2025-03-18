import {FIRESTORE_REGION, QR_BUCKET_NAME} from "../constants";
import {logger} from "firebase-functions";
import {db, PUBSUB_QR_FILES_TOPIC, storage} from "../firebase";
import {onMessagePublished} from "firebase-functions/v2/pubsub";
import {
  Competition,
  QRAddonDocument,
  QRDocument,
  QRRegistrationDocument,
  QRTShirtDocument
} from "../../../../packages/shared";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import {generateQrAndBarcode, generateTicketPdf, generateTshirtPdf} from "../lib/qr";
import * as fs from "fs";

pdfMake.vfs = pdfFonts.vfs;

const BATCH_SIZE = 5; // Adjustable batch size

export const processQrCodes = onMessagePublished(
  {
    region: FIRESTORE_REGION,
    topic: PUBSUB_QR_FILES_TOPIC,
    retry: false,
    memory: "512MiB",
  },
  async (event) => {
    const message = event.data?.message;
    if (!message?.data) {
      logger.warn("⚠️ No valid data received.");
      return;
    }

    const {docIds} = JSON.parse(
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
 * Process a batch of QR documents in parallel.
 */
const processBatch = async (docIds: string[]) => {
  await Promise.all(docIds.map(async (qrId) => {
    try {
      const docSnapshot = await db.collection("qrCodes").doc(qrId).get();
      if (!docSnapshot.exists) {
        console.warn(`⚠️ QR Code document ${qrId} not found.`);
        return;
      }

      const data = docSnapshot.data() as QRDocument;
      await processQrDocument(qrId, data);
    } catch (error) {
      console.error(`❌ Error processing QR Code ${qrId}:`, error);
    }
  }));
};

/**
 * Process QR codes in batches with parallel execution.
 */
const processChunkQrCodes = async (docIds: string[]) => {
  const chunks = chunkArray(docIds, BATCH_SIZE);

  await Promise.all(chunks.map(async (batch) => {
    await processBatch(batch);
  }));
};

/**
 * Splits an array into smaller chunks.
 */
function chunkArray(arr: string[], size: number) {
  return Array.from({length: Math.ceil(arr.length / size)}, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
}


/**
 * Process QR document: generate QR code, barcode, and PDF, then upload PDF.
 */ const processQrDocument = async (qrId: string, data: QRDocument) => {
  const bucket = storage.bucket(QR_BUCKET_NAME);
  const competitionDoc = await db.collection("competitions").doc(data.competition.id).get();

  if (!competitionDoc.exists) {
    throw new Error(`Competition ${data.competition.id} not found.`);
  }

  const competition = competitionDoc.data() as Competition;

  // Generate QR and Barcode in /tmp
  const {tmpQrPath, tmpBarcodePath} = await generateQrAndBarcode(qrId);

  // Generate PDF in /tmp
  let ticketFunction: () => Promise<string>;
  let ticketPath;
  if (data.type === "registration") {
    ticketPath = `qr_codes/${data.competition.id}/registrations/${data.provider}/${qrId}/ticket.pdf`;
    ticketFunction = () => generateTicketPdf(data as QRRegistrationDocument, competition, tmpQrPath, tmpBarcodePath);
  } else if (data.type === "addon" && (data as QRAddonDocument).addonType === "tshirt") {
    ticketPath = `qr_codes/${data.competition.id}/addons/tshirts/${data.provider}/${qrId}/ticket.pdf`;
    ticketFunction = () => generateTshirtPdf(data as QRTShirtDocument, competition, tmpQrPath, tmpBarcodePath);
  } else {
    console.warn(`Invalid type ${data.type} for ${qrId}`);
    return;
  }

  let tmpPdfPath: string = await ticketFunction();

  // Upload final PDF to Storage
  await bucket.upload(tmpPdfPath, {destination: ticketPath});

  const ticketFile = bucket.file(ticketPath);
  const [ticketUrl] = await ticketFile.getSignedUrl({action: "read", expires: "01-01-2100"});

  // Update Firestore document
  await db.collection("qrCodes").doc(qrId).update({
    status: "processed",
    "files.ticket": {url: ticketUrl, path: ticketPath},
  });

  // Cleanup /tmp files
  fs.unlinkSync(tmpQrPath);
  fs.unlinkSync(tmpBarcodePath);
  fs.unlinkSync(tmpPdfPath);
};




