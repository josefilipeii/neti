import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import {FIRESTORE_REGION} from "../constants";
import {enforceAllowedOrigin} from "../lib/security";
import {db} from "../firebase";
import {insertOnboardingEmail} from "../lib/onboarding";

interface RequestType {
    tickets: string[];
}

export const processOnboarding = onCall(
  {region: FIRESTORE_REGION, enforceAppCheck: true},
  async (request: CallableRequest<RequestType>) => {

    const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS_ADMIN?.split(",") || [
      "https://odin-hybrid-day-checkin.web.app",
      "http://localhost:5173",
    ];
    enforceAllowedOrigin(request, ALLOWED_ORIGINS); // ✅ Allow only Heimdall domains

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be logged in to check in.");
    }

    const roles = request.auth.token.roles || [];
    if (!roles?.includes("lobby") && !roles?.includes("admin") && !roles?.includes("dashboard")) {
      throw new HttpsError("permission-denied", `You dont have permissions to do it. ${roles}`);
    }

    const {tickets} = request.data;


    return await db.runTransaction(async (transaction) => {
      for (const ticket of tickets) {
        await insertOnboardingEmail(ticket, transaction);
      }
    });

  }
);


