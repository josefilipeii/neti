import {Email, RegistrationEmail} from "../domain";
import {logger} from "firebase-functions";
import {Timestamp} from "firebase-admin/firestore";
import {db, storage} from "../firebase";
import * as Brevo from "@getbrevo/brevo";

export const brevoApiKey = process.env.BREVO_API_KEY;
export const ticketConfig = (emailData: Email, transaction: FirebaseFirestore.Transaction, now: FirebaseFirestore.Timestamp) => {

  const ticketEmailData = emailData as RegistrationEmail;
  const competitionId = ticketEmailData.params.competitionId;
  const ticketTemplateId = process.env[`BREVO_TICKET_${competitionId?.toUpperCase()}_TEMPLATE_ID`];

  const postAction = () => {
    // Update registration document with email reference
    const registrationRef = db.doc(
      `/competitions/${competitionId}/heats/${ticketEmailData.params.heatId}/registrations/${ticketEmailData.params.dorsal}`
    );

    const qrCodeRef = db.collection("qrCodes").doc(ticketEmailData.params.dorsal);
    transaction.set(registrationRef, {
      ticket: {
        sent: now,
      }
    }, {merge: true});
    transaction.set(qrCodeRef, {
      email: {
        sent: now,
      }
    }, {merge: true});

    logger.info(`Ticket email sent for ${ticketEmailData.params.dorsal} and status updated`);
  };

  return {templateId: ticketTemplateId, postAction};
}

export const sendEmail = async (templateId: number, emailData: Email) => {

  const apiInstance = new Brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, brevoApiKey || "invalid-api");
  const sendSmtpEmail = new Brevo.SendSmtpEmail();
  sendSmtpEmail.templateId = templateId;
  sendSmtpEmail.to = emailData.to;
  if (emailData.linkAttachments) {
    sendSmtpEmail.attachment = emailData.linkAttachments;
  }
  if (emailData.linkAttachments) {
    sendSmtpEmail.attachment = emailData.linkAttachments;
  }
  if (emailData.storageAttachments) {
    const attachements = [];
    for (const attachment of emailData.storageAttachments) {
      const [file] = await fetchFileFromBucket(attachment.bucket, attachment.path);
      attachements.push(file);
    }
    sendSmtpEmail.attachment = attachements;
  }
  sendSmtpEmail.params = emailData.params;
  try {
    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    return response;
  } catch (error) {
    logger.error("Error sending email:", error);
    throw new Error("Email API request failed.");
  }
};


export const processEmail = async (docSnapshot: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData, FirebaseFirestore.DocumentData>,
  docId: string,
  transaction: FirebaseFirestore.Transaction) => {
  const docRef = docSnapshot.ref;
  const emailData = docSnapshot.data() as Email;

  if (!emailData.to) {
    logger.error(`❌ Firestore document ${docId} has no recipient.`);
    return;
  }
  if (emailData.type !== "checkin" && emailData.type !== "tickets") {
    logger.error(`❌ Firestore document ${docId} has an invalid type.`);
    return;
  }

  if (!brevoApiKey) {
    logger.error("Missing Brevo configuration not set in Firebase Functions env.");
    return;
  }

  let templateId: number;
  let processEmail = true;
  let postAction: () => void = () => {
  };
  const now = Timestamp.now();
  // Send the email via Brevo API
  switch ((emailData as Email).type) {
  case "tickets":
    const config = ticketConfig(emailData, transaction, now);
    const ticketTemplateId = Number(config.templateId);
    if (isNaN(ticketTemplateId)) {
      logger.error("Invalid Brevo ticket template id");
      return
    }
    templateId = ticketTemplateId;
    postAction = config.postAction;
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

  await sendEmail(templateId, emailData);
  postAction();
  // Update document within the transaction
  transaction.update(docRef, {
    status: "sent",
    sentAt: now,
  });

  logger.info(`Email sent  for ${docId}`);
}


async function fetchFileFromBucket(bucket: string, filePath: string) {
  const file = storage.bucket(bucket).file(filePath);
  const [fileBuffer] = await file.download();
  return [
    {
      content: fileBuffer.toString("base64"),
      name: filePath.split("/").pop(),
    },
  ];
}