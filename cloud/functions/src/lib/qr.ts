import {createHash} from "crypto";
import {PUBSUB_QR_FILES_TOPIC} from "../firebase";
import {PubSub} from "@google-cloud/pubsub";
import * as fs from "fs";
import * as path from "path";
import QRCode from "qrcode";
import bwipjs from "bwip-js";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import {TDocumentDefinitions} from "pdfmake/interfaces";
import {Competition, QRRegistrationDocument, QRTShirtDocument} from "../../../../packages/shared";

const pubsub = new PubSub();

export const generateQrAndBarcode = async (docId: string) => {
  const tmpQrPath = path.join("/tmp", `${docId}_qr.png`);
  const tmpBarcodePath = path.join("/tmp", `${docId}_barcode.png`);

  // Generate QR Code
  await QRCode.toFile(tmpQrPath, docId, {
    errorCorrectionLevel: "H",
    width: 500,
    margin: 2,
  });

  // Generate Barcode
  fs.writeFileSync(tmpBarcodePath,  await bwipjs.toBuffer({
    bcid: "code128",
    text: docId,
    scale: 2,
    height: 20,
    backgroundcolor: "FFFFFF",
    paddingwidth: 10,
    paddingheight: 10,
    includetext: true,
    textsize: 10,
    textyoffset: 10,
    rotate: "L",
  }));

  return {tmpQrPath, tmpBarcodePath};
};


pdfMake.vfs = pdfFonts.vfs;

/**
 * Generates a ticket PDF and saves it to /tmp.
 */
export const generateTicketPdf = async (
  details: QRRegistrationDocument,
  competition: Competition,
  tmpQrPath: string,
  tmpBarcodePath: string
) => {
  const tmpPdfPath = path.join("/tmp", `${details.id}.pdf`);

  // Convert image files to base64
  const qrImage = loadTmpImageToInclude(tmpQrPath);
  const barcodeImage = loadTmpImageToInclude(tmpBarcodePath);

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
        text: `Deverás efetuar o teu check-in pelo menos ${competition.checkinMinutesBefore} minutos antes da prova no balcão de check-in localizado em:`,
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

  return new Promise<string>((resolve, reject) => {
    pdfDoc.getBuffer((buffer) => {
      try {
        fs.writeFileSync(tmpPdfPath, buffer);
        resolve(tmpPdfPath);
      } catch (error) {
        reject(error);
      }
    });
  });
};


function loadTmpImageToInclude(tmpBarcodePath: string) {
  const content = fs.readFileSync(tmpBarcodePath).toString("base64");
  return `data:image/png;base64,${content}`;
}

export const generateTshirtPdf = async (
  details: QRTShirtDocument,
  competition: Competition,
  tmpQrPath: string,
  tmpBarcodePath: string
) => {
  try {
    const tmpPdfPath = path.join("/tmp", `${details.id}.pdf`);
    const qrImage = loadTmpImageToInclude(tmpQrPath);
    const barcodeImage = loadTmpImageToInclude(tmpBarcodePath);

    const docDefinition: TDocumentDefinitions = {
      defaultStyle: {font: "Roboto"},
      pageSize: {width: 360, height: 800},
      pageMargins: [40, 60, 40, 60], // Left, Top, Right, Bottom
      content: [
        {
          columns: [
            {image: qrImage, width: 200, margin: [0, 0, 10, 0]}, // Right margin of 10
            {image: barcodeImage, width: 82, height: 200, margin: [10, 0, 0, 0]}, // Left margin of 10
          ]
        },
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

    return new Promise<string>((resolve, reject) => {
      pdfDoc.getBuffer((buffer) => {
        try {
          fs.writeFileSync(tmpPdfPath, buffer);
          resolve(tmpPdfPath);
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


/** Generates a secure QR ID */
export const generateQrId = (prefix: string, eventId: string, code: string): string => {
  if (!code || !eventId) {
    throw new Error("Missing QR Data");
  }
  const hash = createHash("md5").update(`${eventId}:${code}`).digest("hex").substring(0, 12);
  const shortId = BigInt("0x" + hash).toString(36).toUpperCase();
  const controlDigit = (BigInt("0x" + hash) % BigInt(36)).toString(36).toUpperCase();
  return `${prefix}${shortId}${controlDigit}`;

}


export const publishQrToGenerate = async (registrationsToQr: string[]) => {
  const PUB_SUB_CHUNK_SIZE = 20;
  const chunks = [];
  for (let i = 0; i < registrationsToQr.length; i += PUB_SUB_CHUNK_SIZE) {
    chunks.push(registrationsToQr.slice(i, i + PUB_SUB_CHUNK_SIZE));
  }

  for (const chunk of chunks) {
    const messageBuffer = Buffer.from(JSON.stringify({docIds: chunk}));
    await pubsub.topic(PUBSUB_QR_FILES_TOPIC).publishMessage({data: messageBuffer});
  }
}

