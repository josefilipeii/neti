import {db, storage} from "../firebase";
import QRCode from "qrcode";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {FUNCTIONS_REGION, QR_BUCKET_NAME} from "./../constants";
import {Registration} from "../../../../packages/shared";


export const generateQrForRegistration = onDocumentCreated(
  {
    document: "competitions/{competitionId}/heats/{heatId}/registrations/{dorsal}",
    region: FUNCTIONS_REGION
  },
  async (event) => {

    const snap = event.data;
    const {competitionId, heatId, dorsal} = event.params;

    if (!snap) {
      console.warn(`No snapshot found for params${event.params}, skipping QR generation.`);
      return;
    }


    try {
      const registration = snap.data() as Registration;
      console.log(`Generating QR Code for registration: ${registration.id}`);


      const qrsCollection = db.collection("qrCodes");
      const qrRef = qrsCollection.doc(); // Generates an auto-ID
      const qrId = qrRef.id; // Get the unique, unguessable Firestore ID


      await qrRef.set({
        type: "registration",
        competition: competitionId,
        heat: heatId,
        createdAt: new Date(),
        dorsal: dorsal,
        ...registration
      });

      const qrCodeData = qrId; // Use Firestore Auto-ID
      const qrCodeBuffer = await QRCode.toBuffer(qrCodeData);

      const bucket = storage.bucket(QR_BUCKET_NAME);
      const qrFilePath = `qr_codes/${competitionId}/registrations/${heatId}/${dorsal}.png`;
      const file = bucket.file(qrFilePath);

      await file.save(qrCodeBuffer, {contentType: "image/png"});
      console.log(`QR Code uploaded to: ${qrFilePath}`);

      const [url] = await file.getSignedUrl({action: "read", expires: "01-01-2030"});

      await snap.ref.update({
        qrCodeUrl: url
      });

      console.log(`QR Code URL saved in Firestore: ${url}`);
      return null;
    } catch (error) {
      console.error("Error generating QR Code:", error);
      return null;
    }
  })
