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
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "You must be logged in to check in.");
  }

  const authToken = auth.token;
  const userEmail = authToken.email || authToken.allowedEmail;
  const { token } = request.data;
  const provider = authToken.firebase.sign_in_provider;
  const type = provider === "google.com" ? "lobby" : provider === "custom" ? "self" : "unknown";


  if (!token) {
    throw new HttpsError("invalid-argument", "Missing token parameter.");
  }
  if (type === "unknown" || (type === "self" && authToken.custom_provider !== "self_checkin")) {
    throw new HttpsError("invalid-argument", "Invalid sign-in provider.");
  }
  if(authToken.allowedToken !== token){
    throw new HttpsError("permission-denied", "Invalid token.");
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

      const { competition, dorsal, heat, redeemableBy } = qrCodeSnap.data() as QRDocument;

      if(!redeemableBy?.includes(userEmail)){
        throw new HttpsError("permission-denied", "Email does not match this token.");
      }

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
