import * as functions from "firebase-functions";
import {CONFIG_BUCKET_NAME, FUNCTIONS_REGION} from "./constants";
import {useCompetitionsHandler} from "./file-upload/on-competitions";
import {useParticipantsHandler} from "./file-upload/on-participants";
import {generateQrForRegistration} from "./firestore/on-registration";
import {checkInUser, selfCheckin} from "./http/checkin";
import {handleEmailQueue} from "./firestore/on-email";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });





export const onCompetitions = functions.storage
  .onObjectFinalized({region: FUNCTIONS_REGION, bucket: CONFIG_BUCKET_NAME}, async (object) => {
    useCompetitionsHandler(object);
  });

export const onParticipants = functions.storage
  .onObjectFinalized({region: FUNCTIONS_REGION, bucket: CONFIG_BUCKET_NAME}, async (object) => {
    useParticipantsHandler(object);
  });


export const onRegistrationCreateQrCode = generateQrForRegistration;

export const handleCheckin = checkInUser;
export const handleSelfCheckin = selfCheckin;

export const onEmailQueueCreate = handleEmailQueue

