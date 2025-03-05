import { db } from "../firebase";
import { FUNCTIONS_REGION } from "../constants";
import { CallableRequest, HttpsError, onCall } from "firebase-functions/v2/https";
import { QRRedemption, QRRegistrationDocument } from "../../../../packages/shared";
import { logger } from "firebase-functions";
import { Email, Recipient } from "../domain";
import { DocumentReference, Transaction } from "firebase-admin/firestore";
import { Timestamp } from "firebase/firestore";

type CheckinRequestType = { token: string };
type SelfCheckinRequestType = CheckinRequestType & { email: string };
type ResponseType = { success: boolean; message: string };

export const checkInUser = onCall({ region: FUNCTIONS_REGION }, async (request: CallableRequest<CheckinRequestType>) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in to check in.");
  }
  return handleCheckin(request, "lobby");
});

export const selfCheckin = onCall(
  { region: FUNCTIONS_REGION, enforceAppCheck: true },
  async (request: CallableRequest<SelfCheckinRequestType>) => handleCheckin(request, "self")
);

async function triggerEmail(
  qrDocument: QRRegistrationDocument,
  token: string,
  checkInTime: Timestamp,
  type: string,
  transaction: Transaction
) {
  try {
    const newDocRef = db.collection("email-queue").doc();
    const recipients: Recipient[] = qrDocument.registration.participants.map(p => p as Recipient);

    const emailParams: Email = {
      to: recipients,
      type: "checkin",
      ref: token,
      params: {
        checkinTime: checkInTime.toDate(),
        competition: qrDocument.competition?.name,
        heat: qrDocument.registration?.heat?.name,
        time: qrDocument.registration?.heat?.time,
        day: new Date(qrDocument.registration?.heat?.day).toLocaleDateString("en-GB"),
        dorsal: qrDocument.registration?.dorsal,
        category: qrDocument.registration?.category?.name,
        type,
      },
    };

    transaction.set(newDocRef, emailParams);
    logger.info(`✅ Email triggered for ${recipients.length} recipients.`);
  } catch (error) {
    logger.error("❌ Failed to queue email:", error);
  }
}

async function processCheckin(
  transaction: Transaction,
  qrDocument: QRRegistrationDocument,
  qrCodeRef: DocumentReference,
  redemption: QRRedemption,
  token: string
) {
  try {
    const competition = qrDocument.competition;
    const registration = qrDocument.registration;
    if (!competition?.id || !registration?.heat?.id || !registration?.dorsal) {
      throw new HttpsError("invalid-argument", "Invalid registration data.");
    }

    const registrationRef = db.doc(`/competitions/${competition.id}/heats/${registration.heat.id}/registrations/${registration.dorsal}`);

    transaction.set(qrCodeRef, { redeemed: redemption }, { merge: true });
    transaction.set(registrationRef, { checkin: redemption }, { merge: true });
    await triggerEmail(qrDocument, token, redemption.at, redemption.how, transaction);
    logger.info(`✅ Check-in propagated for dorsal ${registration.dorsal} in competition ${competition.name}`);
  } catch (error) {
    logger.error("❌ Error processing check-in:", error);
  }
}

async function ensureNewEntry(
  transaction: Transaction,
  qrCodeRef: DocumentReference
): Promise<QRRegistrationDocument> {
  const qrCodeSnap = await transaction.get(qrCodeRef);
  if (!qrCodeSnap.exists) {
    throw new HttpsError("not-found", "QR code not found.");
  }
  return qrCodeSnap.data() as QRRegistrationDocument;
}

async function handleCheckin(
  request: CallableRequest<CheckinRequestType | SelfCheckinRequestType>,
  type: "lobby" | "self"
): Promise<ResponseType> {
  const { token } = request.data;
  const email = "email" in request.data ? request.data.email : request.auth?.token.email;

  if (!token || !email) {
    throw new HttpsError("invalid-argument", "Missing token or email parameter.");
  }

  const checkInTime = Timestamp.now();
  const qrCodeRef = db.collection("qrCodes").doc(token);

  return await db.runTransaction(async (transaction) => {
    const qrDocument = await ensureNewEntry(transaction, qrCodeRef);
    if (qrDocument.redeemed) {
      console.log("QR code has already been redeemed. Return success");
      return { success: false, message: "QR code has already been redeemed." };
    }
    if (type === "self") validateInputSelfCheckin(email, qrDocument);
    const redemption: QRRedemption = { at: checkInTime, by: email, how: type };
    await processCheckin(transaction, qrDocument, qrCodeRef, redemption, token);
    return { success: true, message: "User checked in successfully!" };
  });
}


function validateInputSelfCheckin(userEmail: string, qrDocument: QRRegistrationDocument) {
  if (!userEmail || (!qrDocument.redeemableBy?.includes(userEmail) && !qrDocument.registration?.participants.some(p => p.email === userEmail))) {
    throw new HttpsError("permission-denied", "Email does not match this token.");
  }
}
