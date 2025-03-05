import { db } from "../firebase";
import { FUNCTIONS_REGION } from "../constants";
import { CallableRequest, HttpsError, onCall } from "firebase-functions/v2/https";
import {QRDocument, QRRedemption, QRRegistrationDocument} from "../../../../packages/shared";
import {logger} from "firebase-functions";
import {Email} from "../domain";

type CheckinRequestType = { token: string };
type SelfCheckinRequestType = CheckinRequestType & { email: string};
type ResponseType = { success: boolean; message: string };

function triggerEmail(qrDocument: QRRegistrationDocument,
  token: string,
  checkInTime: Date,
  type: string,
  transaction: FirebaseFirestore.Transaction) {
  const newDocRef = db.collection("/email-queue").doc();

  const recipients = qrDocument.recipients;
  const emailParams: Email = {
    to: recipients,
    type: "checkin",
    ref: token,
    params: {
      checkInTime: checkInTime,
      competition: qrDocument.competition,
      heat: qrDocument.registration?.heat?.name,
      time: qrDocument.registration.heat.time,
      dorsal: qrDocument.registration.dorsal,
      type: type
    }
  };
  transaction.set(newDocRef, emailParams);
}

function propagateCheckinStatus(qrDocument: QRRegistrationDocument,
  transaction: FirebaseFirestore.Transaction,
  qrCodeRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData, FirebaseFirestore.DocumentData>,
  redemption: QRRedemption,
  token: string) {
  let competition = qrDocument.competition;
  let registration = qrDocument.registration;
  const registrationRef = db.doc(`/competitions/${competition?.id}/heats/${(registration?.heat?.id)}/registration/${registration?.dorsal}`);

  // Use batch write to update both documents atomically
  transaction.set(qrCodeRef, {redeemed: redemption}, {merge: true});
  transaction.set(registrationRef, {checkin: redemption}, {merge: true});
  triggerEmail(qrDocument, token, redemption.at, redemption.how, transaction);
}


async function ensureNewEntry(transaction: FirebaseFirestore.Transaction,
  qrCodeRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData, FirebaseFirestore.DocumentData>) {
  const qrCodeSnap = await transaction.get(qrCodeRef);
  if (!qrCodeSnap.exists) {
    throw new HttpsError("not-found", "QR code not found.");
  }

  return qrCodeSnap.data() as QRRegistrationDocument;
}



export const checkInUser = onCall({ region: FUNCTIONS_REGION }, async (request: CallableRequest<CheckinRequestType>) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "You must be logged in to check in.");
  }

  const authToken = auth.token;
  const agentEmail = authToken.email || authToken.allowedEmail;
  const { token } = request.data;
  const provider = authToken.firebase.sign_in_provider;
  const type = provider === "google.com" ? "lobby" : "unknown";

  if (!agentEmail) {
    throw new HttpsError("permission-denied", "Email is not authorized.");
  }

  if (!token) {
    throw new HttpsError("invalid-argument", "Missing token parameter.");
  }
  if (type === "unknown") {
    throw new HttpsError("invalid-argument", "Invalid sign-in provider.");
  }
  const checkInTime = new Date();
  const qrCodeRef = db.collection("qrCodes").doc(token);

  try {
    return await db.runTransaction(async (transaction) => {
      // Fetch QR document safely
      const qrDocument = await ensureNewEntry(transaction, qrCodeRef);
      const redemption: QRRedemption = {at: checkInTime, by: agentEmail, how: "lobby"};
      propagateCheckinStatus(qrDocument, transaction, qrCodeRef, redemption, token);
      return {success: true, message: "User checked in successfully!"} as ResponseType;
    });
  } catch (error) {
    console.error("Check-in failed:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Check-in failed");
  }

});

export const selfCheckin = onCall(
  { region: FUNCTIONS_REGION,
    enforceAppCheck: true,
  }, async (
    request: CallableRequest<SelfCheckinRequestType>) => {

    const { token, email } = request.data;
    logger.log("Self check-in request", request);

    const checkInTime = new Date();
    const qrCodeRef = db.collection("qrCodes").doc(token);

    try {
      return await db.runTransaction(async (transaction) => {
        // Fetch QR document safely
        const qrDocument = await ensureNewEntry(transaction, qrCodeRef);
        validateInputSelfCheckin(email, qrDocument);
        const redemption: QRRedemption = {at: checkInTime, by: email, how: "self"};
        propagateCheckinStatus(qrDocument, transaction, qrCodeRef, redemption, token);
        return {success: true, message: "User checked in successfully!"} as ResponseType;
      });
    } catch (error) {
      console.error("Check-in failed:", error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", "Check-in failed");
    }
  });



function validateInputSelfCheckin(userEmail: string, qrDocument: QRDocument) {
  if (!userEmail || !qrDocument.redeemableBy?.includes(userEmail)) {
    throw new HttpsError("permission-denied", "Email does not match this token.");
  }
}


