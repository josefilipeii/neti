import {onMessagePublished} from "firebase-functions/v2/pubsub";
import {logger} from "firebase-functions";
import {FIRESTORE_REGION} from "../constants";
import {CheckinEmail, Email} from "../domain";
import type {Transaction} from "firebase-admin/firestore";
import {Timestamp} from "firebase-admin/firestore";
import {db, PUBSUB_EMAIL_TOPIC} from "../firebase";
import {PubSub} from "@google-cloud/pubsub";

const brevoApiKey = process.env.BREVO_API_KEY;
const brevoCheckinTemplateId = process.env.BREVO_CHECKIN_TEMPLATE_ID;
const pubsub = new PubSub();

export const processEmailQueue = onMessagePublished(
  {
    region: FIRESTORE_REGION,
    topic: PUBSUB_EMAIL_TOPIC,
    retry: false, // We manually handle retries
  },
  async (event) => {
    const message = event.data?.message;
    if (!message?.data) {
      logger.warn("⚠️ No valid email data received.");
      return;
    }

    const {docId, retryCount = 0} = JSON.parse(
      Buffer.from(message.data, "base64").toString("utf8")
    );

    if (!docId) {
      logger.error("❌ No document ID received from Pub/Sub.");
      return;
    }

    try {
      await db.runTransaction(async (transaction: Transaction) => {
        const docRef = db.collection("email-queue").doc(docId);
        const docSnapshot = await transaction.get(docRef);

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
          logger.error(`❌ Firestore document ${docId} has an invalid type.`);
          return;
        }

        if (!brevoCheckinTemplateId || !brevoApiKey) {
          logger.error("Missing Brevo configuration not set in Firebase Functions env.");
          return;
        }

        let templateId: number;
        let processEmail = true;
        let postAction: () => void = () => {
        };
        const now = Timestamp.now();
        // Send the email via Brevo API
        switch (emailData.type) {
        case "checkin":
          const checkinTemplateId = Number(brevoCheckinTemplateId);
          if (isNaN(checkinTemplateId)) {
            logger.error("Invalid Brevo checkin template id");
            return
          }
          templateId = checkinTemplateId;
          const checkinEmailData = emailData as CheckinEmail;
          postAction = () => {
            // Update registration document with email reference
            const registrationRef = db.doc(
              `/competitions/${checkinEmailData.params.competitionId}/heats/${checkinEmailData.params.heatId}/registrations/${checkinEmailData.params.dorsal}`
            );

            transaction.set(registrationRef, {
              checkin: {
                sentAt: now,
              }
            }, { merge: true });
          }

          break;
        default:
          logger.error(`❌ Firestore document ${docId} has an invalid type.`);
          processEmail = false;
          return;
        }

        if (!processEmail) {
          logger.error(`❌ Email not sent for ${docId}`);
          return;
        }

        sendEmail(templateId, emailData);
        postAction();
        // Update document within the transaction
        transaction.update(docRef, {
          status: "sent",
          sentAt: now,
        });

        logger.info(`Email sent  for ${docId}`);
      });

    } catch (error) {
      logger.error(`❌ Email sending failed for ${docId}:`, error);

      // Retry logic
      if (retryCount < 3) {
        const newRetryCount = retryCount + 1;
        const delay = Math.pow(2, newRetryCount) * 1000; // Exponential backoff (2s, 4s, 8s)

        logger.warn(`🔁 Retrying email for ${docId} in ${delay / 1000} seconds (attempt ${newRetryCount}/3)`);

        setTimeout(async () => {

          const messageBuffer = Buffer.from(JSON.stringify({ docId, retryCount: newRetryCount }));
          await pubsub.topic(PUBSUB_EMAIL_TOPIC).publishMessage({ data: messageBuffer });
        }, delay);
      } else {
        logger.error(`🚨 Max retries reached for ${docId}. Email delivery failed permanently.`);
      }
    }
  }
);


const sendEmail = async (templateId: number, emailData: Email) => {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": brevoApiKey || "invalid-api-key",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      templateId: templateId,
      ...emailData
    }),
  });

  if (!response.ok) {
    throw new Error("Email API request failed.");
  }

}
