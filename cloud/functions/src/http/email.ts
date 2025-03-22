import {CallableRequest, onCall} from "firebase-functions/v2/https";
import {FIRESTORE_REGION} from "../constants";
import {adminActionsValidation} from "../lib/security";
import {db} from "../firebase";
import {logger} from "firebase-functions";
import {processEmail} from "../lib/email";


interface RetryEmailType {
    emails: string[];
}

export const retryScheduledOnboarding = onCall(
  {region: FIRESTORE_REGION, enforceAppCheck: true},
  async (request: CallableRequest<RetryEmailType>) => {
    adminActionsValidation(request);

    const {emails} = request.data;
    for (const email of emails) {

      await db.runTransaction(async (transaction) => {
        const emailRef = db.collection("email-queue").doc(email);
        const emailDoc = await transaction.get(emailRef)
        if (!emailDoc.exists) {
          logger.warn(`Email does not exists ${email}`);
        }
        await processEmail(emailDoc, email, transaction);
      });
    }
    return {status: "ok"};

  }
);