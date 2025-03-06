import {onMessagePublished} from "firebase-functions/v2/pubsub";
import * as admin from "firebase-admin";
import {logger} from "firebase-functions";
import {FIRESTORE_REGION} from "../constants";
import {Email} from "../domain";
import { Timestamp } from "firebase-admin/firestore";

const brevoApiKey = process.env.BREVO_API_KEY;
const brevoCheckinTemplateId = process.env.BREVO_CHECKIN_TEMPLATE_ID;

export const processEmailQueue = onMessagePublished(
  {
    region: FIRESTORE_REGION,
    topic: "send-email"
  }, async (event) => {
    const message = event.data?.message;
    if (!message?.data) {
      logger.warn("⚠️ No valid email data received.");
      return;
    }

    const {docId} = JSON.parse(Buffer.from(message.data, "base64").toString("utf8"));

    if (!docId) {
      logger.error("❌ No document ID received from Pub/Sub.");
      return;
    }

    try {
      // Retrieve Firestore document
      const docRef = admin.firestore().collection("email-queue").doc(docId);
      const docSnapshot = await docRef.get();

      if (!docSnapshot.exists) {
        logger.error(`❌ Firestore document ${docId} not found.`);
        return;
      }

      const emailData = docSnapshot.data() as Email;

      if (!emailData.to) {
        logger.error(`❌ Firestore document ${docId} has no recipient.`);
        return;
      }
      if (emailData.type !== "checkin") {
        logger.error(`❌ Firestore document ${docId} has invalid type.`);
        return;
      }
      const checkinTemplateId = Number(brevoCheckinTemplateId);
      if (!brevoCheckinTemplateId || !brevoApiKey || isNaN(checkinTemplateId)) {
        logger.error("missing brevo configuration not set in Firebase Functions env.");
        return;
      }

      // Send the email via Brevo API
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": brevoApiKey || "invalid-api-key",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateId: checkinTemplateId,
          ...emailData
        }),
      });

      if (!response.ok) {
        throw new Error("Email API request failed.");
      }

      // Update Firestore document status to "sent"
      await docRef.update({status: "sent", sentAt: Timestamp.now()});

      logger.info(`✅ Email sent successfully ${docId}`);
    } catch (error) {
      logger.error("❌ Email sending failed:", error);
    }
  }
);
