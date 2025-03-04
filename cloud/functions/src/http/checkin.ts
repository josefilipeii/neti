import {db} from "../firebase";
import * as admin from "firebase-admin";
import {FUNCTIONS_REGION} from "../constants";
import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";


type RequestType = { token: string };
type ResponseType = { success: boolean; message: string };
/**
 * HTTPS function to check in a user.
 * Requires authentication.
 */
export const checkInUser = onCall({region: FUNCTIONS_REGION},
        async (request: CallableRequest<RequestType>) => {
            // 🔒 Ensure the request is authenticated
            if (!request.auth) {
                throw new HttpsError(
                    "unauthenticated",
                    "You must be logged in to check in."
                );
            }
            const userEmail = request.auth.token.email || "self";
            const {token} = request.data;
            const provider = request.auth.token.firebase.sign_in_provider;
            const type = provider === 'google.com' ? 'lobby' :
                provider === 'self-checkin' ? 'self'
                    : 'unknown';

            if (!token) {
                throw new HttpsError(
                    "invalid-argument",
                    "Missing token parameter."
                );
            }
            if (type === 'unknown') {
                throw new HttpsError(
                    "invalid-argument",
                    "Invalid sign-in provider."
                );
            }

            const checkInTime = new Date();

            try {
                // 🔹 Step 1: Update qrCodes document
                const qrCodeRef = db.collection("qrCodes").doc(token);
                await qrCodeRef.set(
                    {
                        redeemed: {
                            at: checkInTime,
                            by: userEmail,
                            how: type, // "lobby" or "self"
                        },
                    },
                    {merge: true}
                );

                // 🔹 Step 2: Update registrations under heats
                const registrationRef = db.collection("registrations").doc(token);
                await registrationRef.set(
                    {
                        heats: {
                            checkInStatus: true,
                        },
                    },
                    {merge: true}
                );

                return {success: true, message: "User checked in successfully!"} as ResponseType;
            } catch (error) {
                console.error("Check-in failed:", error);
                throw new HttpsError("internal", "Check-in failed", error);
            }
        }
    )
;
