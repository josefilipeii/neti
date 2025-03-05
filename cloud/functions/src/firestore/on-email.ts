import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {Email} from "../domain";
import * as admin from "firebase-admin";
import {Timestamp} from "firebase/firestore";
import {logger} from "firebase-functions";

const brevoApiKey = process.env.BREVO_API_KEY;
const brevoCheckinTemplateId = process.env.BREVO_CHECKIN_TEMPLATE_ID;

export const handleEmailQueue = onDocumentCreated("/email-queue/{docId}", async (event) => {
  const checkinTemplateId = Number(brevoCheckinTemplateId);
  if (!brevoCheckinTemplateId || !brevoApiKey || isNaN(checkinTemplateId)) {
    logger.log(brevoApiKey, brevoCheckinTemplateId);
    throw Error("missing brevo configuration not set in Firebase Functions env.");
  }

  const snap = event.data;

  if (!snap || !snap.exists) {
    logger.warn(`⚠️ No valid snapshot found for params: ${JSON.stringify(event.params)}, skipping Email sent.`);
    return;
  }

  const email = snap.data() as Email;
  if (email.type !== "checkin") {
    logger.log(`❌ Skipping email of type ${email.type}`);
    return;
  }

  const emailRef = snap.ref;

  try {
    await admin.firestore().runTransaction(async (transaction) => {
      const body = JSON.stringify({
        templateId: checkinTemplateId,
        to: email.to,
        cc: email.cc,
        params: email.params
      });

      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": brevoApiKey || "invalid-api-key",
          "Content-Type": "application/json"
        },
        body
      });

      const result = await response.json();
      if (!response.ok) throw new Error(JSON.stringify(result));

      transaction.update(emailRef, { sentAt: Timestamp.now() });
    });
  } catch (error) {
    logger.error("Email sent failed:", error);
    await emailRef.update({ failedAt: Timestamp.now() });
    throw new Error("Email sent failed");
  }
});