import {CallableRequest, onCall} from "firebase-functions/v2/https";
import {FIRESTORE_REGION} from "../constants";
import {adminActionsValidation} from "../lib/security";
import {db} from "../firebase";
import {insertOnboardingEmail} from "../lib/onboarding";

interface OnboardingRequestType {
    tickets: string[];
}

export const processOnboarding = onCall(
  {region: FIRESTORE_REGION, enforceAppCheck: true},
  async (request: CallableRequest<OnboardingRequestType>) => {
    adminActionsValidation(request);

    const {tickets} = request.data;
    for (const ticket of tickets) {

      await db.runTransaction(async (transaction) => {

        await insertOnboardingEmail(ticket, transaction);

      });
    }
    return {status: "ok"};

  }
);





