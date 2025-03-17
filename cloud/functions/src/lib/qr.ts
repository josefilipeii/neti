import {createHash} from "crypto";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import {Competition, QRRegistrationDocument, QRTShirtDocument} from "../../../../packages/shared";
import QRCode from "qrcode";
import bwipjs from "bwip-js";
import {TDocumentDefinitions} from "pdfmake/interfaces";
import {Bucket} from "@google-cloud/storage";



pdfMake.vfs = pdfFonts.vfs;




const savePdfToStorage = async (pdfDoc: pdfMake.TCreatedPdf, bucket: Bucket, filePath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    pdfDoc.getBuffer(async (buffer: Buffer) => {
      const file = bucket.file(filePath);
      const stream = file.createWriteStream({metadata: {contentType: "application/pdf"}});
      stream.on("error", reject);
      stream.on("finish", resolve);
      stream.end(buffer);
    });
  });
};


/**
 * Generates a ticket PDF and uploads it.
 */
export const generateTicketPdf = async (
  details: QRRegistrationDocument,
  competition: Competition,
  ticketPath: string,
  bucket: Bucket
) => {
  try {
    const qrImage = await QRCode.toDataURL(details.id, {
      errorCorrectionLevel: "H",
      width: 200,
      margin: 2,
    });

    const barcodeBuffer = await bwipjs.toBuffer({
      bcid: "code128",
      text: details.id,
      scale: 2,
      height: 20,
      includetext: true,
      textsize: 10,
      rotate: "L",
    });
    const barcodeImage = `data:image/png;base64,${barcodeBuffer.toString("base64")}`;

    const docDefinition: TDocumentDefinitions = {
      pageSize: {width: 360, height: 800},
      content: [
        {
          columns: [
            {image: qrImage, width: 200, margin: [0, 0, 10, 0]}, // Right margin of 10
            {image: barcodeImage, width: 82, height: 200, margin: [10, 0, 0, 0]}, // Left margin of 10
          ]
        },
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

export const generateTshirtPdf = async (
  details: QRTShirtDocument,
  competition: Competition,
  ticketPath: string,
  bucket: Bucket
) => {
  try {
    const qrImage = await QRCode.toDataURL(details.id, {
      errorCorrectionLevel: "H",
      width: 500,
      margin: 2,
    });

    const barcodeBuffer = await bwipjs.toBuffer({
      bcid: "code128",
      text: details.id,
      scale: 2,
      height: 20,
      includetext: true,
      textsize: 10,
      rotate: "L",
    });
    const barcodeImage = `data:image/png;base64,${barcodeBuffer.toString("base64")}`;


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

    // Save PDF to storage
    return await savePdfToStorage(pdfDoc, bucket, ticketPath);
  } catch (error) {
    console.error("❌ Error generating ticket PDF:", error);
    throw error;
  }
};



/** Generates a secure QR ID */
export const generateQrId = (prefix: string, eventId: string, code:string):string =>  {
  if (!code || !eventId) {
    throw new Error("Missing QR Data");
  }
  const hash = createHash("md5").update(`${eventId}:${code}`).digest("hex").substring(0, 12);
  const shortId = BigInt("0x" + hash).toString(36).toUpperCase();
  const controlDigit = (BigInt("0x" + hash) % BigInt(36)).toString(36).toUpperCase();
  return `${prefix}${shortId}${controlDigit}`;

}