import {FIRESTORE_REGION, QR_BUCKET_NAME} from "../constants";
import {logger} from "firebase-functions";
import {db, PUBSUB_QR_FILES_TOPIC, storage} from "../firebase";
import QRCode from "qrcode";
import bwipjs from "bwip-js";
import {onMessagePublished} from "firebase-functions/v2/pubsub";
import {PubSub} from "@google-cloud/pubsub";
import {
  Competition,
  QRAddonDocument,
  QRDocument,
  QRRegistrationDocument,
  QRTShirtDocument
} from "../../../../packages/shared";
import {Bucket} from "@google-cloud/storage";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import {TDocumentDefinitions} from "pdfmake/interfaces";

pdfMake.vfs = pdfFonts.vfs;

const pubsub = new PubSub();
const MAX_RETRIES = 3;
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

    const {docIds, retryCount = 0} = JSON.parse(
      Buffer.from(message.data, "base64").toString("utf8")
    );

    if (!docIds || !Array.isArray(docIds) || docIds.length === 0) {
      logger.error("❌ No valid document IDs received from Pub/Sub.");
      return;
    }

    const chunks = chunkArray(docIds, BATCH_SIZE);
    for (const batch of chunks) {
      await processBatch(batch, retryCount);
    }
  }
);

/**
 * Splits an array into smaller chunks.
 */
function chunkArray(arr: string[], size: number) {
  return Array.from({length: Math.ceil(arr.length / size)}, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
}


/**
 * Generates a ticket PDF and uploads it.
 */
export const generateTicketPdf = async (
  details: QRRegistrationDocument,
  competition: Competition,
  qrPath: string,
  barCodePath: string,
  ticketPath: string,
  bucket: Bucket
) => {
  try {

    const qrImage = await loadImageFromStorage(bucket, qrPath);
    const barcodeImage = await loadImageFromStorage(bucket, barCodePath);

    const docDefinition: TDocumentDefinitions = {
      pageSize: { width: 360, height: 800 },
      content: [
        {columns: [
          {image: qrImage, width: 200, margin: [0, 0, 10, 0]}, // Right margin of 10
          {image: barcodeImage, width: 82, height: 200, margin: [10, 0, 0, 0]}, // Left margin of 10
        ]},
        {text: details.code, style: "header"},

        {text: "Evento", style: "subheader"},
        {text: details.competition.name, style: "text"},

        {text: "Categoria", style: "subheader"},
        {text: details.registration.category, style: "text"},

        {text: "Horário", style: "subheader"},
        {text: `${details.registration.day} - ${details.registration.time}`, style: "text"},

        {text: "Participante(s)", style: "subheader"},
        {
          ul: details.registration.participants.filter(name => name).map((p) => p.name as string),
          style: "text",
        },
        {text: "Instruções", style: "subheader"},
        {
          text: `Deverás efectuar o teu checkin ${competition.checkinMinutesBefore} minutos antes da prova no balão de checkin localizado em:`,
          style: "text",
        },

        {text: competition.address.join("\n"), style: "text"},

        {canvas: [{type: "rect", x: 5, y: 5, w: 500, h: 0.5}]}, // Bottom separator
      ],
      styles: {
        header: {fontSize: 16, bold: true, alignment: "center", margin: [0, 10]},
        subheader: {fontSize: 14, bold: true, margin: [0, 10, 0, 5]},
        text: {fontSize: 12, margin: [0, 0, 0, 5]},
      },
      defaultStyle: {font: "Roboto"},
    };

    // Generate PDF
    const pdfDoc = pdfMake.createPdf(docDefinition);

    return new Promise<void>((resolve, reject) => {
      pdfDoc.getBuffer(async (buffer) => {
        try {
          await bucket.file(ticketPath).save(buffer, {contentType: "application/pdf"});
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error("❌ Error generating ticket PDF:", error);
    throw error;
  }
};

const generateTshirtPdf = async (
  details: QRTShirtDocument,
  competition: Competition,
  qrPath: string,
  barCodePath: string,
  ticketPath: string,
  bucket: Bucket
) => {
  try {
    // Load images from Storage bucket
    const qrImage = await loadImageFromStorage(bucket, qrPath);
    const barcodeImage = await loadImageFromStorage(bucket, barCodePath);

    const docDefinition: TDocumentDefinitions = {
      defaultStyle: {font: "Roboto"},
      pageSize: { width: 360, height: 800 },
      pageMargins: [40, 60, 40, 60], // Left, Top, Right, Bottom
      content: [
        {columns: [
          {image: qrImage, width: 200, margin: [0, 0, 10, 0]}, // Right margin of 10
          {image: barcodeImage, width: 82, height: 200, margin: [10, 0, 0, 0]}, // Left margin of 10
        ]},
        {text: "Evento", style: "header"},
        {text: details.competition.name, style: "subheader"},

        {text: "Tshirts", style: "header"},
        {text: "Tamanhos:", style: "subheader"},
        {
          ul: Object.entries(details.sizes)
            .filter(([, count]) => count)
            .map(([size, count]) => `${size.toUpperCase()} - ${count}`),
          margin: [10, 5, 0, 10],
        },

        {text: "Informação", style: "header"},
        {
          text: "Deverás efetuar o levantamento da(s) T-Shirts no balcão de check-in em:",
          style: "subheader",
        },
        {text: competition.address.join("\n"), style: "text"},
      ],
      styles: {
        header: {fontSize: 14, bold: true, margin: [0, 10, 0, 5]},
        subheader: {fontSize: 12, bold: false, margin: [0, 5, 0, 5]},
      },
    };

    // Generate the PDF
    const pdfDoc = pdfMake.createPdf(docDefinition);

    // Save PDF to storage
    return await savePdfToStorage(pdfDoc, bucket, ticketPath);
  } catch (error) {
    console.error("❌ Error generating ticket PDF:", error);
    throw error;
  }
};

/**
 * Helper function to load an image from Google Cloud Storage as Base64
 */
const loadImageFromStorage = async (bucket: Bucket, filePath: string): Promise<string> => {
  const file = bucket.file(filePath);
  const [fileBuffer] = await file.download();
  return `data:image/png;base64,${fileBuffer.toString("base64")}`;
};

/**
 * Helper function to save the PDF to Google Cloud Storage
 */
const savePdfToStorage = async (pdfDoc: pdfMake.TCreatedPdf, bucket: Bucket, filePath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    pdfDoc.getBuffer(async (buffer: Buffer) => {
      const file = bucket.file(filePath);
      const stream = file.createWriteStream({
        metadata: {contentType: "application/pdf"},
      });

      stream.on("error", reject);
      stream.on("finish", resolve);
      stream.end(buffer);
    });
  });
};


/**
 * Processes a batch of QR codes.
 */
async function processBatch(docIds: string[], retryCount: number) {
  try {
    const bucket = storage.bucket(QR_BUCKET_NAME);
    const snapshots = await db.getAll(...docIds.map((id) => db.collection("qrCodes").doc(id)));

    const competitionCache = new Map<string, Competition>();
    const tasks = snapshots.map(async (docSnapshot) => {
      if (!docSnapshot.exists) {
        logger.warn(`⚠️ QR Code document ${docSnapshot.id} not found.`);
        return;
      }

      const data = docSnapshot.data() as QRDocument;
      if (!data) return;

      let qrPath: string, barCodePath: string, ticketPath: string
      let ticketFunction: () => Promise<void>;

      const {competition: competitionInfo, provider} = data;
      await manageCompetitionCache(competitionInfo.id, competitionCache);

      if (!competitionInfo.id && !competitionCache.has(competitionInfo.id)) {
        logger.warn(`⚠️ Competition ${competitionInfo.id} not found.`);
        return;
      }

      const competition = competitionCache.get(competitionInfo.id)!;

      if (!competition) {
        logger.warn(`⚠️ Competition ${competitionInfo.id} not found.`);
        return;
      }

      if (data.type === "registration") {
        const directory = `qr_codes/${competitionInfo.id}/registrations/${provider}/${docSnapshot.id}`;
        barCodePath = `${directory}/barcode.png`;
        qrPath = `${directory}/qr_code.png`;
        ticketPath = `${directory}/ticket.pdf`;
        const eventDetails = data as QRRegistrationDocument;
        ticketFunction = () => generateTicketPdf(eventDetails, competition, qrPath, barCodePath, ticketPath, bucket);
      } else if (data.type === "addon" && (data as QRAddonDocument).addonType === "tshirt") {
        const directory = `qr_codes/${competitionInfo.id}/addons/tshirt/${docSnapshot.id}`;
        barCodePath = `${directory}/barcode.png`;
        qrPath = `${directory}/qr_code.png`;
        ticketPath = `${directory}/ticket.pdf`;
        const tshirtDetails = data as QRTShirtDocument;
        ticketFunction = () => generateTshirtPdf(tshirtDetails, competition, qrPath, barCodePath, ticketPath, bucket);
      } else {
        logger.warn(`⚠️ Invalid type ${data.type} for ${docSnapshot.id}`);
        return;
      }

      const qrFile = bucket.file(qrPath);
      const barCodeFile = bucket.file(barCodePath);

      try {
        const qrCodeBuffer = await QRCode.toBuffer(docSnapshot.id, {
          errorCorrectionLevel: "H",
          width: 500,
          margin: 2,
        });
        await qrFile.save(qrCodeBuffer, {contentType: "image/png"});


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
        await barCodeFile.save(barCodeBuffer, {contentType: "image/png"});

        await ticketFunction();
        const ticketFile = bucket.file(ticketPath);

        const [qrUrl] = await qrFile.getSignedUrl({action: "read", expires: "01-01-2100"});
        const [barCodeUrl] = await barCodeFile.getSignedUrl({action: "read", expires: "01-01-2100"});
        const [ticketUrl] = await ticketFile.getSignedUrl({action: "read", expires: "01-01-2100"});
        await docSnapshot.ref.update({
          status: "ready",
          "files.qr": {url: qrUrl, path: qrPath},
          "files.barcode": {url: barCodeUrl, path: barCodePath},
          "files.ticket": {url: ticketUrl, path: ticketPath}
        });

        logger.info(`✅ Successfully generated ticket for ${docSnapshot.id}`);
      } catch (error) {
        logger.error(`❌ Error processing ticket for ${docSnapshot.id}:`, error);
      }
    });

    await Promise.all(tasks);
  } catch (error) {
    logger.error("❌ Batch processing failed:", error);

    // 🔄 Retry Logic with Exponential Backoff
    if (retryCount < MAX_RETRIES) {
      const newRetryCount = retryCount + 1;
      const delay = Math.pow(2, newRetryCount) * 1000; // 2s, 4s, 8s

      logger.warn(`🔁 Retrying batch in ${delay / 1000} seconds (attempt ${newRetryCount}/${MAX_RETRIES})`);

      setTimeout(async () => {
        const messageBuffer = Buffer.from(JSON.stringify({docIds, retryCount: newRetryCount}));
        await pubsub.topic(PUBSUB_QR_FILES_TOPIC).publishMessage({data: messageBuffer});
      }, delay);
    } else {
      logger.error("🚨 Max retries reached. Processing failed permanently.");
    }
  }
}

export const manageCompetitionCache = async (competitionId: string, competitionCache: Map<string, Competition>) => {
  if (!competitionCache.has(competitionId)) {
    const competitionDoc = await db.collection("competitions").doc(competitionId).get();
    if (!competitionDoc.exists) {
      logger.warn(`⚠️ Competition document ${competitionId} not found.`);
      return;
    }
    const competitionData = competitionDoc.data() as Competition;
    competitionCache.set(competitionId, competitionData);
  }
};


