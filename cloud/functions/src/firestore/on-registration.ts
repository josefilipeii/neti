import {onDocumentCreated, onDocumentDeleted} from "firebase-functions/v2/firestore";
import {db, PUBSUB_QR_FILES_TOPIC} from "../firebase";
import {logger} from "firebase-functions";
import {Timestamp} from "firebase-admin/firestore";
import {FIRESTORE_REGION} from "../constants";
import {Registration, RegistrationParticipant} from "../../../../packages/shared";
import {PubSub} from "@google-cloud/pubsub";

const pubsub = new PubSub();

/**
 * Firestore trigger: Runs when a registration is deleted.
 */
export const handleRegistrationDelete = onDocumentDeleted(
  {document: "competitions/{competitionId}/heats/{heatId}/registrations/{registrationId}", region: FIRESTORE_REGION},
  async (event) => {

    const snap = event.data; // Get deleted registration data
    if (!snap?.exists) {
      logger.warn("⚠️ No registration data found.");
      return;
    }


    const data = snap.data() as Registration;

    if (!data) {
      logger.warn("⚠️ No registration data found.");
      return;
    }

    const qrid = data.qrId as string;
    const qrRef = db.collection("qrCodes").doc(qrid);

    try {
      await qrRef.update({
        status: "void",
        voidReason: "Registration deleted",
        lastUpdated: Timestamp.now(),
      });

      logger.log(`🚫 QR Code voided: ${qrid} (Registration deleted)`);
    } catch (error) {
      logger.error(`❌ Error voiding QR code for deleted registration ${data?.providerId}:`, error);
    }
  }
);

/**
 * Firestore trigger: Runs when a new registration is created.
 */
export const handleRegistrationCreate = onDocumentCreated(
  {document: "competitions/{competitionId}/heats/{heatId}/registrations/{registrationId}", region: FIRESTORE_REGION},
  async (event) => {
    const snap = event.data; // Get new registration data
    const {competitionId, heatId, registrationId} = event.params;

    if (!snap?.exists) {
      logger.warn("⚠️ No valid snapshot found, skipping registration processing.");
      return
    }

    const data = snap.data();

    if (!data) {
      logger.warn("⚠️ No registration data found.");
      return;
    }

    const qrCodeId = data.qrId as string;


    const qrRef = db.collection("qrCodes").doc(qrCodeId);

    const qrData = {
      id: qrCodeId,
      code: `${competitionId}:${heatId}:${data.id}`,
      createdAt: Timestamp.now().toDate().toString(),
      type: "registration",
      competition: competitionId,
      registration: {
        dorsal: registrationId,
        category: data.category,
        day: data.day,
        time: data.time!,
        heat: heatId,
        participants: data.participants.map((p: RegistrationParticipant) => ({
          email: p.email,
          name: p.name,
          contact: p.contact,
        })),
      },
      redeemableBy: data.participants.map((p: RegistrationParticipant) => p.email),
      provider: data.provider,
      status: "init",
      sent: false,
    };

    try {
      await qrRef.set(qrData);
      // Prepare Pub/Sub message
      const messageData = {docIds: [qrCodeId]};
      await pubsub.topic(PUBSUB_QR_FILES_TOPIC).publishMessage({json: messageData});

      logger.log(`✅ QR Code created: ${qrCodeId}`);
    } catch (error) {
      logger.error(`❌ Error creating QR code for registration ${registrationId}:`, error);
    }
  }
);
