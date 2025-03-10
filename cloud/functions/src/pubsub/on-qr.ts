import {FIRESTORE_REGION, QR_BUCKET_NAME} from "../constants";
import {logger} from "firebase-functions";
import {QRDocument, QRRegistrationDocument} from "../../../../packages/shared";
import {Bucket, File} from "@google-cloud/storage";
import {db, PUBSUB_QR_FILES_TOPIC, storage} from "../firebase";
import QRCode from "qrcode";
import bwipjs from "bwip-js";
import {onMessagePublished} from "firebase-functions/v2/pubsub";
import {PubSub} from "@google-cloud/pubsub";

const pubsub = new PubSub();

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

    const {docId, retryCount = 0} = JSON.parse(
      Buffer.from(message.data, "base64").toString("utf8")
    );

    if (!docId) {
      logger.error("❌ No document ID received from Pub/Sub.");
      return;
    }

    try {
      const docRef = db.collection("qrCodes").doc(docId);
      const docSnapshot = await docRef.get();

      if (!docSnapshot.exists) {
        logger.error(`❌ Firestore document ${docId} not found.`);
        return;
      }

      const data = docSnapshot.data() as QRDocument;

      let qrPath;
      let barCodePath;
      if (data.type === "registration") {
        const registrationData = data as QRRegistrationDocument;
        const competition = registrationData.competition;
        const heatId = registrationData.registration.heat.id;
        const dorsal = registrationData.registration.dorsal;
        const directory = `qr_codes/${competition.id}/registrations/${heatId}/${dorsal}`;
        barCodePath = `${directory}/barcode.png`;
        qrPath = `${directory}/qr_code.png`;
      } else {
        logger.warn(`⚠️ Invalid type ${data.type} for ${docId}`);
        return;
      }

      const qrBucket: Bucket = storage.bucket(QR_BUCKET_NAME);
      const qrFile: File = qrBucket.file(qrPath);
      const barCodeFile: File = qrBucket.file(barCodePath);

      try {
        // Generate QR Code
        const qrCodeBuffer: Buffer = await QRCode.toBuffer(docId, {
          errorCorrectionLevel: "H",
          width: 500,
          margin: 2
        });
        await qrFile.save(qrCodeBuffer, {contentType: "image/png"});

        // Generate Barcode
        const barCodeBuffer = await bwipjs.toBuffer({
          bcid: "code128",
          text: docId,
          scale: 2,
          height: 20,
          backgroundcolor: "FFFFFF", // Ensure a pure white background
          paddingwidth: 10,      // Add padding to avoid edges blending
          paddingheight: 10,
          includetext: true,     // Show human-readable text
          textsize: 10,          // Font size for human-readable text
          textyoffset: 10,       // Adjust text vertical position
          rotate: "L"            // Set barcode rotation
        });
        await barCodeFile.save(barCodeBuffer, {contentType: "image/png"});

        // Generate public URLs
        const [qrUrl] = await qrFile.getSignedUrl({action: "read", expires: "01-01-2030"});
        const [barCodeUrl] = await barCodeFile.getSignedUrl({action: "read", expires: "01-01-2030"});

        // 🔹 Update Firestore **without a transaction**
        await docRef.update({
          "status": "ready",
          "files.qr": qrUrl,
          "files.barcode": barCodeUrl,
        });

        logger.info(`✅ Successfully generated QR and barcode for ${docId}`);
      } catch (error) {
        logger.error(`❌ Error processing QR for ${docId}:`, error);
      }
    } catch (error) {
      logger.error(`❌ Processing failed for ${docId}:`, error);

      // 🔄 Retry Logic with Exponential Backoff
      if (retryCount < 3) {
        const newRetryCount = retryCount + 1;
        const delay = Math.pow(2, newRetryCount) * 1000; // 2s, 4s, 8s

        logger.warn(`🔁 Retrying processing for ${docId} in ${delay / 1000} seconds (attempt ${newRetryCount}/3)`);

        setTimeout(async () => {
          const messageBuffer = Buffer.from(JSON.stringify({docId, retryCount: newRetryCount}));
          await pubsub.topic(PUBSUB_QR_FILES_TOPIC).publishMessage({data: messageBuffer});
        }, delay);
      } else {
        logger.error(`🚨 Max retries reached for ${docId}. Processing failed permanently.`);
      }
    }
  }
);
