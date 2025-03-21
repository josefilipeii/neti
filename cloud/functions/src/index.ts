import * as functions from "firebase-functions";
import {STORAGE_REGION} from "./constants";
import {useCompetitionsHandler} from "./file-upload/on-competitions";
import {processParticipants} from "./file-upload/on-participants";
import {checkInUser} from "./http/checkin";
import {processEmailQueue} from "./pubsub/on-email";
import {handleEmailQueue} from "./firestore/on-email";
import {userImportHandler} from "./file-upload/on-users";
import {processQrCodes} from "./pubsub/on-qr";
import {resetQrCodes, retryQrCodes} from "./http/manual-actions";
import {processAddonsCsv} from "./file-upload/on-addons";
import {redeemAddon} from "./http/addons";
import {authenticateAgent} from "./http/agents";
import {processChunk} from "./firestore/on-chunck";
import {processAddonChunks} from "./firestore/on-addon-chunks";
import {processOnboarding} from "./http/onboarding";
import {retryScheduledOnboarding} from "./http/email";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });


export const onAddons = functions.storage
  .onObjectFinalized({region: STORAGE_REGION}, async (object) => {
    processAddonsCsv(object);
  });


export const onCompetitions = functions.storage
  .onObjectFinalized({region: STORAGE_REGION}, async (object) => {
    useCompetitionsHandler(object);
  });

export const onParticipants = functions
  .storage
  .onObjectFinalized({
    region: STORAGE_REGION,
    timeoutSeconds: 300,
    memory: "256MiB"
  },
  async (object) => {
    processParticipants(object);
  });

export const onUsers = functions.storage
  .onObjectFinalized({region: STORAGE_REGION}, async (object) => {
    userImportHandler(object);
  });


export const handleCheckin = checkInUser;
export const handleAddonRedemption = redeemAddon;

export const triggerRetryQrCodeFile = retryQrCodes;

export const triggerResetQrCodes = resetQrCodes;

export const triggerEmail = handleEmailQueue;

export const triggerOnboardingEmail = processOnboarding;
export const triggerRetryEmail = retryScheduledOnboarding

export const sendQueueEmail = processEmailQueue;
export const onQrCodes = processQrCodes

export const onAddonChunks = processAddonChunks


export const handleAgentAuthentication = authenticateAgent


export const onChunk = processChunk;

