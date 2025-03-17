import {logger} from "firebase-functions/v2";
import {db, storage} from "../firebase";
import {FIRESTORE_REGION, QR_BUCKET_NAME} from "../constants";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {Competition, QRDocument, QRRegistrationDocument, QRTShirtDocument} from "../../../../packages/shared";
import {generateTicketPdf, generateTshirtPdf} from "../lib/qr";

const MAX_RETRIES = 3;

export const processQrCodes = onDocumentWritten(
  {
    region: FIRESTORE_REGION,
    document: "qrCodes/{qrId}",
  },
  async (event) => {
    const before = event.data?.before.data() as QRDocument | undefined;
    const after = event.data?.after.data() as QRDocument | undefined;

    if (!after) return; // Document deleted

    const newDocument  = !before;
    const changeToInit = after.status === "init";

    if (!newDocument && !changeToInit) {
      logger.info(`🔍 QR Code ${event.params.qrId} already processed.`);
      return; // Ignore if status didn't change to "init"
    }

    logger.info(`🔄 Processing QR Code: ${event.params.qrId}`);

    try {
      await processQrDocument(event.params.qrId, after);
      await db.collection("qrCodes").doc(event.params.qrId).update({status: "ready"});
    } catch (error) {
      logger.error(`❌ Error processing QR Code ${event.params.qrId}:`, error);
      await handleRetry(event.params.qrId, after);
    }
  }
);


const processQrDocument = async (qrId: string, data: QRDocument) => {
  const bucket = storage.bucket(QR_BUCKET_NAME);

  const competitionDoc = await db.collection("competitions").doc(data.competition.id).get();
  if (!competitionDoc.exists) {
    throw new Error(`Competition ${data.competition.id} not found.`);
  }

  const competition = competitionDoc.data() as Competition;
  const directory = `qr_codes/${competition.id}/registrations/${data.provider}/${qrId}`;
  const ticketPath = `${directory}/ticket.pdf`;

  if (data.type === "registration") {
    await generateTicketPdf(data as QRRegistrationDocument, competition, ticketPath, bucket);
  } else if (data.type === "addon" && (data as QRTShirtDocument).addonType === "tshirt") {
    await generateTshirtPdf(data as QRTShirtDocument, competition, ticketPath, bucket);
  }

  const ticketFile = bucket.file(ticketPath);
  const [ticketUrl] = await ticketFile.getSignedUrl({action: "read", expires: "01-01-2100"});

  await db.collection("qrCodes").doc(qrId).update({
    status: "processed",
    "files.ticket": {url: ticketUrl, path: ticketPath},
  });

  logger.info(`✅ QR Code ${qrId} processed successfully.`);
};


const handleRetry = async (qrId: string, data: QRDocument) => {
  const retryCount = data.retryCount || 0;

  if (retryCount >= MAX_RETRIES) {
    logger.error(`🚨 Max retries reached for QR Code ${qrId}.`);
    await db.collection("qrCodes").doc(qrId).update({status: "failed"});
    return;
  }

  const newRetryCount = retryCount + 1;
  const delay = Math.pow(2, newRetryCount) * 1000; // 2s, 4s, 8s...

  logger.warn(`🔁 Retrying QR Code ${qrId} in ${delay / 1000} seconds (attempt ${newRetryCount}/${MAX_RETRIES})`);

  setTimeout(async () => {
    await db.collection("qrCodes").doc(qrId).update({retryCount: newRetryCount, status: "init"});
  }, delay);
};
