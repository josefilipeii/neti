import {CheckinEmail, Email, RegistrationEmail} from "../domain";
import {logger} from "firebase-functions";
import {Timestamp} from "firebase-admin/firestore";
import {db, storage} from "../firebase";
import * as Brevo from "@getbrevo/brevo";

export const brevoApiKey = process.env.BREVO_API_KEY;
export const brevoCheckinTemplateId = process.env.BREVO_CHECKIN_TEMPLATE_ID;
export const brevoTicketTemplateId = process.env.BREVO_TICKET_TEMPLATE_ID;
export const checkinPostAction = (emailData: Email, transaction: FirebaseFirestore.Transaction, now: FirebaseFirestore.Timestamp) => {
  return () => {
    const checkinEmailData = emailData as CheckinEmail;
    // Update registration document with email reference
    const registrationRef = db.doc(
      `/competitions/${checkinEmailData.params.competitionId}/heats/${checkinEmailData.params.heatId}/registrations/${checkinEmailData.params.dorsal}`
    );

    transaction.set(registrationRef, {
      checkin: {
        sentAt: now,
      }
    }, {merge: true});
  };
}
export const ticketPostAction = (emailData: Email, transaction: FirebaseFirestore.Transaction, now: FirebaseFirestore.Timestamp) => {
  return () => {
    const ticketEmailData = emailData as RegistrationEmail;
    // Update registration document with email reference
    const registrationRef = db.doc(
      `/competitions/${ticketEmailData.params.competitionId}/heats/${ticketEmailData.params.heatId}/registrations/${ticketEmailData.params.dorsal}`
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
}

export const sendEmail = async (templateId: number, emailData: Email) => {

  const apiInstance = new Brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, brevoApiKey || "invalid-api");
  const sendSmtpEmail = new Brevo.SendSmtpEmail();
  sendSmtpEmail.templateId = templateId;
  sendSmtpEmail.to = emailData.to;
  if(emailData.linkAttachments){
    sendSmtpEmail.attachment = emailData.linkAttachments;
  }
  if (emailData.linkAttachments) {
    sendSmtpEmail.attachment = emailData.linkAttachments;
  }
  if(emailData.storageAttachments){
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

  if (!brevoCheckinTemplateId || !brevoTicketTemplateId || !brevoApiKey) {
    logger.error("Missing Brevo configuration not set in Firebase Functions env.");
    return;
  }

  let templateId: number;
  let processEmail = true;
  let postAction: () => void = () => {};
  const now = Timestamp.now();
  // Send the email via Brevo API
  switch ((emailData as Email).type) {
  case "checkin":
    const checkinTemplateId = Number(brevoCheckinTemplateId);
    if (isNaN(checkinTemplateId)) {
      logger.error("Invalid Brevo checkin template id");
      return
    }
    templateId = checkinTemplateId;
    postAction = checkinPostAction(emailData, transaction, now)
    break;
  case "tickets":
    const ticketTemplateId = Number(brevoTicketTemplateId);
    if (isNaN(ticketTemplateId)) {
      logger.error("Invalid Brevo ticket template id");
      return
    }
    templateId = ticketTemplateId;
    postAction = ticketPostAction(emailData, transaction, now);
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