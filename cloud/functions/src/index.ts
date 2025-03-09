import * as functions from "firebase-functions";
import {STORAGE_REGION} from "./constants";
import {useCompetitionsHandler} from "./file-upload/on-competitions";
import {processParticipants} from "./file-upload/on-participants";
import {checkInUser, selfCheckin} from "./http/checkin";
import {processRegistrations} from "./firestore/on-registration";
import {processEmailQueue} from "./pubsub/on-email";
import {handleEmailQueue} from "./firestore/on-email-queue";
import {userImportHandler} from "./file-upload/on-users";
import {processQrCodes} from "./pubsub/on-qr";
import {retryQrCodes} from "./http/manual-actions";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });





export const onCompetitions = functions.storage
  .onObjectFinalized({region: STORAGE_REGION}, async (object) => {
    useCompetitionsHandler(object);
  });

export const onParticipants = functions.storage
  .onObjectFinalized({region: STORAGE_REGION}, async (object) => {
    processParticipants(object);
  });

export const onUsers = functions.storage
  .onObjectFinalized({region: STORAGE_REGION}, async (object) => {
    userImportHandler(object);
  });


export const handleCheckin = checkInUser;
export const handleSelfCheckin = selfCheckin;

export const triggerRetryQrCodeFile = retryQrCodes;

export const triggerEmail = handleEmailQueue;
export const sendQueueEmail = processEmailQueue;
export const onParticipantsCreate = processRegistrations
export const onQrCodes = processQrCodes