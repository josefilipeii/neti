import { CallableRequest, HttpsError, onCall } from "firebase-functions/v2/https";
import {FUNCTIONS_REGION} from "../constants";
import { db } from "../firebase";
import {QRDocument} from "../../../../packages/shared";
import * as admin from "firebase-admin";


interface RequestType{
    token: string;
    email: string;
}

export const authenticateWithToken =  onCall({ region: FUNCTIONS_REGION }, async (request: CallableRequest<RequestType>) => {
    const { token, email } = request.data;

    if (!token || !email) {
        throw new HttpsError("invalid-argument", "Token and email are required.");
    }

    const qrDataRef = db.collection("qrCodes").doc(token);
    const qrDataDoc = await qrDataRef.get();

    if (!qrDataDoc.exists) {
        throw new HttpsError("permission-denied", "Invalid token.");
    }

    const qrData = qrDataDoc.data() as QRDocument;
    if(qrData.type != 'registration'){
        console.log('Invalid token type', token, qrData.type);
        throw new HttpsError("permission-denied", "Invalid token.");
    }

    // Ensure email matches the record
    if (!qrData.participants.map(it => it.email).includes(email)) {
        throw new HttpsError("permission-denied", "Email does not match this token.");
    }


    // Generate a Firebase custom token with restricted access
    const customToken = await admin.auth().createCustomToken(token, {
        allowedToken: token,
        allowedEmail: email, // Custom claim to restrict Firestore access
        custom_provider: 'self_checkin'
    });

    return { token: customToken };
});
