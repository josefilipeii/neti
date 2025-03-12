import { logger } from "firebase-functions";
import { FIRESTORE_REGION } from "../constants";
import { db } from "../firebase";
import { Timestamp, Transaction } from "firebase-admin/firestore";
import { DocumentReference } from "firebase-admin/firestore";
import { CallableRequest, HttpsError, onCall } from "firebase-functions/v2/https";
import { Redemption, QRRegistrationDocument } from "../../../../packages/shared";
import { Email, Recipient } from "../domain";

type CheckinRequestType = { token: string };
type ResponseType = { success: boolean; message: string };

// Function to check allowed origins dynamically
function enforceAllowedOrigin(request: CallableRequest<CheckinRequestType>, allowedOrigins: string[]) {
  const origin = request.rawRequest.headers.origin;
  if (!origin || !allowedOrigins.some((allowed) => origin.startsWith(allowed))) {
    console.error(`Blocked request from origin: ${origin} : Expected ${allowedOrigins}`);
    throw new HttpsError("permission-denied", "Unauthorized origin");
  }
}

// Lobby Check-In Function
export const checkInUser = onCall(
  { region: FIRESTORE_REGION, enforceAppCheck: true },
  async (request: CallableRequest<CheckinRequestType>) => {
    const ALLOWED_ORIGINS_CHECKIN = process.env.ALLOWED_ORIGINS_CHECKIN?.split(",") || [
      "https://heimdall-hybrid-day-checkin.web.app",
      "https://odin-hybrid-day-checkin.web.app",
      "http://localhost:5173",
    ];
    enforceAllowedOrigin(request, ALLOWED_ORIGINS_CHECKIN);

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be logged in to check in.");
    }

    const roles = request.auth.token.roles || [];
    if (!roles.includes("lobby") && !roles.includes("admin") && !roles.includes("dashboard")) {
      throw new HttpsError("permission-denied", `You don't have permissions to do this. ${roles}`);
    }

    return handleCheckin(request);
  }
);

function triggerEmail(
  qrDocument: QRRegistrationDocument,
  token: string,
  checkInTime: FirebaseFirestore.Timestamp,
  transaction: FirebaseFirestore.Transaction
) {
  try {
    const recipients: Recipient[] = qrDocument.registration.participants.map((p) => p as Recipient);
    const email: Email = {
      to: recipients,
      type: "checkin",
      ref: token,
      params: {
        heat: qrDocument.registration?.heat?.name,
        heatId: qrDocument.registration?.heat?.id,
        checkinTime: checkInTime.toDate(),
        competition: qrDocument.competition?.name,
        competitionId: qrDocument.competition?.id,
        time: qrDocument.registration?.time,
        day: new Date(qrDocument.registration?.day)?.toLocaleDateString("en-GB"),
        dorsal: qrDocument.registration?.dorsal,
        category: qrDocument.registration?.category?.name,
      },
    };

    const docRef = db.collection("email-queue").doc();
    transaction.set(docRef, email);
    logger.info(`✅ Email job written to Firestore (Queued): ${docRef.id}`);

    return docRef;
  } catch (error) {
    logger.error("❌ Failed to queue email:", error);
    throw error;
  }
}

async function processCheckin(
  transaction: Transaction,
  qrDocument: QRRegistrationDocument,
  qrCodeRef: DocumentReference,
  redemption: Redemption,
  token: string
) {
  try {
    const competition = qrDocument.competition;
    const registration = qrDocument.registration;

    if (!competition?.id || !registration?.heat || !registration?.dorsal) {
      throw new HttpsError("unknown", "Invalid registration data.");
    }

    const registrationRef = db.doc(
      `/competitions/${competition.id}/heats/${registration.heat.id}/registrations/${registration.dorsal}`
    );

    const emailRef = triggerEmail(qrDocument, token, redemption.at, transaction);

    transaction.set(qrCodeRef, { redeemed: redemption }, { merge: true });
    transaction.set(registrationRef, { checkin: { ...redemption, email: emailRef.id } }, { merge: true });

    logger.info(`✅ Check-in recorded for dorsal ${registration.dorsal} in competition ${competition.name}`);
  } catch (error) {
    logger.error("❌ Error processing check-in:", error);
    throw new HttpsError("unavailable", "Invalid registration data.");
  }
}

async function ensureNewEntry(transaction: Transaction, qrCodeRef: DocumentReference): Promise<QRRegistrationDocument> {
  const qrCodeSnap = await transaction.get(qrCodeRef);
  if (!qrCodeSnap.exists) {
    throw new HttpsError("not-found", "QR code not found.");
  }
  return qrCodeSnap.data() as QRRegistrationDocument;
}

async function handleCheckin(request: CallableRequest<CheckinRequestType>): Promise<ResponseType> {
  const { token } = request.data;
  const agent = request.auth?.token.email || request.auth?.token.user_id;

  if (!token) {
    throw new HttpsError("invalid-argument", "Missing token parameter.");
  }

  const checkInTime = Timestamp.now();
  const qrCodeRef = db.collection("qrCodes").doc(token);

  return await db.runTransaction(async (transaction) => {
    const qrDocument = await ensureNewEntry(transaction, qrCodeRef);

    if (qrDocument.redeemed) {
      logger.log("QR code has already been redeemed.");
      return { success: false, message: "QR code has already been redeemed." };
    }

    const redemption: Redemption = { at: checkInTime, by: agent, how: "lobby" };
    await processCheckin(transaction, qrDocument, qrCodeRef, redemption, token);
    return { success: true, message: "User checked in successfully!" };
  });
}
