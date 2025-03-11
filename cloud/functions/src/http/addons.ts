import {logger} from "firebase-functions";
import {FIRESTORE_REGION} from "../constants";
import {db} from "../firebase";
import {DocumentReference, Timestamp, Transaction} from "firebase-admin/firestore";
import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import {QRAddonDocument, Redemption} from "../../../../packages/shared";


type RequestType = { token: string };


// Function to check allowed origins dynamically
function enforceAllowedOrigin(request: CallableRequest<RequestType>, allowedOrigins: string[]) {
  const origin = request.rawRequest.headers.origin;

  if (!origin || !allowedOrigins.some((allowed) => origin.startsWith(allowed))) {
    console.error(`Blocked request from origin: ${origin} : Expected ${allowedOrigins}`);
    throw new HttpsError("permission-denied", "Unauthorized origin");
  }
}


// Lobby Check-In Function (Heimdall-based origin)
export const redeemAddon = onCall(
  {region: FIRESTORE_REGION, enforceAppCheck: true},
  async (request: CallableRequest<RequestType>) => {

    const ALLOWED_ORIGINS_CHECKIN = process.env.ALLOWED_ORIGINS_CHECKIN?.split(",") || [
      "https://heimdall-hybrid-day-checkin.web.app",
      "https://odin-hybrid-day-checkin.web.app",
      "http://localhost:5173"
    ];
    enforceAllowedOrigin(request, ALLOWED_ORIGINS_CHECKIN); // ✅ Allow only Heimdall domains

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be logged in to check in.");
    }

    const roles = request.auth.token.roles || [];
    if (!roles?.includes("lobby") && !roles?.includes("admin") && !roles?.includes("dashboard")) {
      throw new HttpsError("permission-denied", `You dont have permissions to do it. ${roles}`);
    }

    const by = request.auth.token.email || request.auth.token.uid;

    const {token} = request.data;
    const time = Timestamp.now();
    const redemption: Redemption = {at: time, by, how: "lobby"};


    const qrCodeRef = db.collection("qrCodes").doc(token);
    return await db.runTransaction(async (transaction) => {
      const qrDocument = await ensureNewEntry(transaction, qrCodeRef);
      if (qrDocument.redeemed) {
        logger.log("QR code has already been redeemed. Return success");
        return {success: false, message: "QR code has already been redeemed."};
      }

      if(qrDocument.addonType !== "tshirt"){
        logger.log("QR code is not a tshirt addon. Return success");
        return {success: false, message: "QR code is not a tshirt addon."};
      }
      const addonRef = db.doc(
        `/competitions/${qrDocument.competition}/addons/types/tshirts/${token}`
      );

      transaction.set(qrCodeRef, {redeemed: redemption}, {merge: true});
      transaction.set(addonRef, {redeemed: redemption}, {merge: true});

      return {success: true, message: "User checked in successfully!"};
    });

  }
);

async function ensureNewEntry(transaction: Transaction, qrCodeRef: DocumentReference): Promise<QRAddonDocument> {
  const qrCodeSnap = await transaction.get(qrCodeRef);
  if (!qrCodeSnap.exists) {
    throw new HttpsError("not-found", "QR code not found.");
  }
  return qrCodeSnap.data() as QRAddonDocument;
}