import {QRDocument, QRRegistrationDocument} from "../../../../packages/shared";
import {Timestamp} from "firebase-admin/firestore";
import {db} from "../firebase";
import {RegistrationEmail} from "../domain";
import {QR_BUCKET_NAME} from "../constants";
import {logger} from "firebase-functions";

export const insertOnboardingEmail = async (ticket: string, transaction: FirebaseFirestore.Transaction) => {

  const qrCodeRef = db.collection("qrCodes").doc(ticket);
  const qrDocument = await transaction.get(qrCodeRef);
  if (!qrDocument.exists) {
    logger.log("QR code does not exists");
    return;
  }


  const data = qrDocument.data() as QRDocument;

  if (data.type !== "registration") {
    logger.log("QR code is not valid . Return success");
    return;
  }
  const time = Timestamp.now();
  const registrationData = data as QRRegistrationDocument;

  const emailRef = db.collection("email-queue").doc();
  const registration = registrationData.registration;

  const registrationRef = db.collection(`competitions/${data.competition.id}/heats/${registration.heat}/registrations`)
    .doc(registration.dorsal)
  const registrationSnap =  await transaction.get(registrationRef);
  if(!registrationSnap.exists){
    logger.warn("Registration does not exists");
    return;
  }


  const emailData: RegistrationEmail = {
    to: registration.participants.map((p) => ({
      email: p.email,
      name: p.name
    })),
    type: "tickets",
    createdAt: time,
    ref: `competitions/${registrationData.competition.id}/heats/${registration.heat}/registrations/${registration.dorsal}`,
    params: {
      registrationId: ticket,
      competitionId: registrationData.competition.id,
      heatId: registration.heat,
      dorsal: registration.dorsal
    }
  }

  if (registrationData.files?.ticket?.path) {
    const ticket = {
      bucket: QR_BUCKET_NAME,
      path: registrationData.files?.ticket?.path
    };
    emailData["storageAttachments"] = [ticket];
  }

  transaction.set(emailRef, emailData);
  transaction.set(registrationRef, {ticket: {scheduled:  time}}, {merge: true});
  transaction.set(qrCodeRef, {email: {scheduled: time}}, {merge: true});
}