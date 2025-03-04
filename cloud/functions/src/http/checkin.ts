import { db } from "../firebase";
import { FUNCTIONS_REGION } from "../constants";
import { CallableRequest, HttpsError, onCall } from "firebase-functions/v2/https";
import { QRDocument } from "../../../../packages/shared";

type RequestType = { token: string };
type ResponseType = { success: boolean; message: string };

/**
 * HTTPS function to check in a user.
 * Requires authentication.
 */
export const checkInUser = onCall({ region: FUNCTIONS_REGION }, async (request: CallableRequest<RequestType>) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in to check in.");
  }

  const userEmail = request.auth.token.email || "self";
  const { token } = request.data;
  const provider = request.auth.token.firebase.sign_in_provider;
  const type = provider === "google.com" ? "lobby" : provider === "self-checkin" ? "self" : "unknown";

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
      const qrCodeSnap = await transaction.get(qrCodeRef);
      if (!qrCodeSnap.exists) {
        throw new HttpsError("not-found", "QR code not found.");
      }

      const { competition, dorsal, heat } = qrCodeSnap.data() as QRDocument;
      const registrationRef = db.doc(`/competitions/${competition}/heats/${heat}/registration/${dorsal}`);

      const redemption = { at: checkInTime, by: userEmail, how: type };

      // Use batch write to update both documents atomically
      transaction.set(qrCodeRef, { redeemed: redemption }, { merge: true });
      transaction.set(registrationRef, { checkin: redemption }, { merge: true });

      return { success: true, message: "User checked in successfully!" } as ResponseType;
    });
  } catch (error) {
    console.error("Check-in failed:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Check-in failed");
  }
});
