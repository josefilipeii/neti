import {storage, db} from "../firebase";
import QRCode from "qrcode";
import {onDocumentCreated} from "firebase-functions/v2/firestore";


export const generateQrForRegistration = onDocumentCreated("competitions/{competitionId}/registrations/{registrationId}",
    async (event) => {

    const snap = event.data;
    const { competitionId, registrationId } = event.params;

    if(!snap){
        console.warn(`No snapshot found for params${event.params}, skipping QR generation.`);
        return;
    }

    if (!registrationId) {
        console.error("Missing registrationId, skipping QR generation.");
        return null;
    }

    try {
        console.log(`Generating QR Code for registration: ${registrationId}`);


        const qrsCollection = db.collection(`qrCodes`);
        const qrRef = qrsCollection.doc(); // Generates an auto-ID
        const qrId = qrRef.id; // Get the unique, unguessable Firestore ID

        await qrRef.set({
            competitionId: competitionId,
            registrationId: registrationId,
            createdAt: new Date()
        });

        const qrCodeData = qrId; // Use Firestore Auto-ID
        const qrCodeBuffer = await QRCode.toBuffer(qrCodeData);

        const bucket = storage.bucket();
        const qrFilePath = `qr_codes/${competitionId}/registrations/${registrationId}.png`;
        const file = bucket.file(qrFilePath);

        await file.save(qrCodeBuffer, { contentType: "image/png" });
        console.log(`QR Code uploaded to: ${qrFilePath}`);

        const [url] = await file.getSignedUrl({ action: "read", expires: "01-01-2030" });

        await snap.ref.update({
            qrId: registrationId,
            qrCodeUrl: url
        });

        console.log(`QR Code URL saved in Firestore: ${url}`);
        return null;
    } catch (error) {
        console.error("Error generating QR Code:", error);
        return null;
    }
})
