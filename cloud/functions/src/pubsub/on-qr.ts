import {FIRESTORE_REGION, QR_BUCKET_NAME} from "../constants";
import {logger} from "firebase-functions";
import {db, PUBSUB_QR_FILES_TOPIC, storage} from "../firebase";
import QRCode from "qrcode";
import bwipjs from "bwip-js";
import {onMessagePublished} from "firebase-functions/v2/pubsub";
import {PubSub} from "@google-cloud/pubsub";
import {PDFDocument, PDFFont, PDFPage, rgb, StandardFonts} from "pdf-lib";
import {QRAddonDocument, QRDocument, QRRegistrationDocument, QRTShirtDocument} from "../../../../packages/shared";
import {Bucket} from "@google-cloud/storage";

const pubsub = new PubSub();
const MAX_RETRIES = 3;
const BATCH_SIZE = 10; // Adjustable batch size

export const processQrCodes = onMessagePublished(
  {
    region: FIRESTORE_REGION,
    topic: PUBSUB_QR_FILES_TOPIC,
    retry: false,
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

const addImages = async (
  startingPoint: number,
  spacing: number,
  font: PDFFont,
  page: PDFPage,
  eventDetails: QRDocument,
  bucket: Bucket,
  qrPath: string,
  barCodePath: string,
  pdfDoc: PDFDocument
) => {
  const [qrBuffer] = await bucket.file(qrPath).download();
  const [barCodeBuffer] = await bucket.file(barCodePath).download();
  const qrImage = await pdfDoc.embedPng(qrBuffer);
  const barCodeImage = await pdfDoc.embedPng(barCodeBuffer);

  const actualY = startingPoint - spacing;
  const imageSquareSide = 200;
  const y = actualY - imageSquareSide - 20

  page.drawImage(qrImage, {x: 50, y: y, width: 200, height: imageSquareSide});
  page.drawImage(barCodeImage, {x: 50 + imageSquareSide + 20, y: y, width: 82, height: imageSquareSide});

  return y;
}

async function generateFile(bucket: Bucket,
  pdfDoc: PDFDocument,
  page: PDFPage,
  ticketPath: string,) {

  const pdfBytes = await pdfDoc.save();
  const ticketFile = bucket.file(ticketPath);
  return await ticketFile.save(Buffer.from(pdfBytes), {contentType: "application/pdf"});
}

/**
 * Generates a ticket PDF and uploads it.
 */
const generateTicketPdf = async (details: QRRegistrationDocument,
  qrPath: string,
  barCodePath: string,
  ticketPath: string,
  bucket: Bucket) => {
  try {


    const pdfDoc = await PDFDocument.create();
    // Add a blank page to the document
    const page = pdfDoc.addPage()

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    const {width, height} = page.getSize()

    const xStart = 50;
    const spacing = 10;
    let nextFontSize = 16;
    let actualY = height - 4 * nextFontSize;
    actualY = await addImages(actualY, spacing, font, page, details, bucket, qrPath, barCodePath, pdfDoc);

    nextFontSize = 14;
    actualY = actualY - (spacing + nextFontSize);
    page.drawText(details.code, {x: xStart + 50, y: actualY, size: nextFontSize, font: fontBold});


    nextFontSize = 14;
    actualY = actualY - (spacing + nextFontSize);
    page.drawText("Evento", {x: xStart, y: actualY, size: nextFontSize, font: fontBold});

    nextFontSize = 12;
    actualY = actualY - (spacing + nextFontSize);
    page.drawText(details.competition.name, {x: xStart + spacing, y: actualY, size: nextFontSize, font});

    nextFontSize = 12;
    actualY = actualY - (spacing + nextFontSize);
    page.drawText("Categoria", {x: xStart, y: actualY, size: nextFontSize, font: fontBold});

    nextFontSize = 12;
    actualY = actualY - (spacing + nextFontSize);
    page.drawText(details.registration.category, {x: xStart + spacing, y: actualY, size: nextFontSize, font:fontItalic});

    nextFontSize = 12;
    actualY = actualY - (spacing + nextFontSize);
    page.drawText("Horário", {x: xStart, y: actualY, size: nextFontSize, font:fontItalic});

    nextFontSize = 12;
    actualY = actualY - (spacing + nextFontSize);
    const textDateTime = `${details.registration.day} - ${details.registration.time}`;
    page.drawText(textDateTime, {x: xStart + spacing, y: actualY, size: nextFontSize, font:fontBold});

    nextFontSize = 12;
    actualY = actualY - (spacing + nextFontSize);
    page.drawText("Participante(s)", {x: xStart, y: actualY, size: nextFontSize, font: fontBold});

    nextFontSize = 10;
    actualY = actualY - (spacing + nextFontSize);
    details.registration.participants.forEach((participant) => {
      const y = actualY - (nextFontSize +5);
      page.drawText(`${participant.name}`, {x: 70, y: y, size: nextFontSize, font: fontItalic});
      actualY = y;
    });

    actualY = actualY - spacing;
    drawRectangle(width, spacing, height, actualY, page);
    return await generateFile(bucket, pdfDoc, page, ticketPath);
  } catch (error) {
    logger.error("❌ Error generating ticket PDF:", error);
    throw error;
  }
}

function drawRectangle(width: number, spacing: number, height: number, actualY: number, page: PDFPage) {
  const pageWidth = width - 4 * spacing;
  const boxWidth = pageWidth - 2 * spacing;
  const pageHeight = height - actualY - 4 * spacing;
  const boxHeight = pageHeight - 2 * spacing;

  page.drawRectangle({
    x: 10,
    y: actualY,
    width: boxWidth,
    height: boxHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 2,
    borderDashArray: [5, 5] // Dashed line pattern (5 on, 5 off)
  });
}

const generateTshirtPdf = async (details: QRTShirtDocument,
  qrPath: string,
  barCodePath: string,
  ticketPath: string,
  bucket: Bucket) => {
  try {


    const pdfDoc = await PDFDocument.create();
    // Add a blank page to the document
    const page = pdfDoc.addPage()

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const {width, height} = page.getSize()

    const spacing = 10;
    let nextFontSize = 16;
    let actualY = height - 4 * nextFontSize;
    actualY = await addImages(actualY, spacing, font, page, details, bucket, qrPath, barCodePath, pdfDoc);

    nextFontSize = 14;
    actualY = actualY - (spacing + nextFontSize);
    const xStart = 50;
    page.drawText("Evento", {x: xStart, y: actualY, size: nextFontSize, font: fontBold});

    nextFontSize = 12;
    actualY = actualY - (spacing + nextFontSize);
    page.drawText(details.competition.name, {x: xStart + spacing, y: actualY, size: nextFontSize, font});

    nextFontSize = 12;
    actualY = actualY - (spacing + nextFontSize);
    page.drawText("Tshirts", {x: xStart, y: actualY, size: nextFontSize, font: fontBold});
    nextFontSize = 12;
    actualY = actualY - (spacing + nextFontSize);
    page.drawText("Tamanhos:", {x: xStart + spacing, y: actualY, size: nextFontSize, font});

    nextFontSize = 10;
    actualY = actualY - (spacing + nextFontSize);
    Object.entries(details.sizes).filter(([, count]) => count).forEach(([size, count]) => {
      const y = actualY - 5;
      page.drawText(`${size.toUpperCase()}- ${count}`, {x: 70, y: y, size: nextFontSize, font});
      actualY = y;
    });

    actualY = actualY - spacing;
    drawRectangle(width, spacing, height, actualY, page);
    return await generateFile(bucket, pdfDoc, page, ticketPath);

  } catch (error) {
    logger.error("❌ Error generating ticket PDF:", error);
    throw error;
  }
}

/**
 * Processes a batch of QR codes.
 */
async function processBatch(docIds: string[], retryCount: number) {
  try {
    const bucket = storage.bucket(QR_BUCKET_NAME);
    const snapshots = await db.getAll(...docIds.map((id) => db.collection("qrCodes").doc(id)));

    const tasks = snapshots.map(async (docSnapshot) => {
      if (!docSnapshot.exists) {
        logger.warn(`⚠️ QR Code document ${docSnapshot.id} not found.`);
        return;
      }

      const data = docSnapshot.data() as QRDocument;
      if (!data) return;

      let qrPath: string, barCodePath: string, ticketPath: string
      let ticketFunction: () => Promise<void>;

      if (data.type === "registration") {
        const {competition, provider} = data;
        const directory = `qr_codes/${competition.id}/registrations/${provider}/${docSnapshot.id}`;
        barCodePath = `${directory}/barcode.png`;
        qrPath = `${directory}/qr_code.png`;
        ticketPath = `${directory}/ticket.pdf`;
        const eventDetails = data as QRRegistrationDocument;
        ticketFunction = () => generateTicketPdf(eventDetails, qrPath, barCodePath, ticketPath, bucket);
      } else if (data.type === "addon" && (data as QRAddonDocument).addonType === "tshirt") {
        const {competition} = data;
        const directory = `qr_codes/${competition.id}/addons/tshirt/${docSnapshot.id}`;
        barCodePath = `${directory}/barcode.png`;
        qrPath = `${directory}/qr_code.png`;
        ticketPath = `${directory}/ticket.pdf`;
        const tshirtDetails = data as QRTShirtDocument;
        ticketFunction = () => generateTshirtPdf(tshirtDetails, qrPath, barCodePath, ticketPath, bucket);
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
          "files.qr": qrUrl,
          "files.barcode": barCodeUrl,
          "files.ticket": ticketUrl,
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
