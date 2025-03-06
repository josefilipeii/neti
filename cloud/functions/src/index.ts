import * as functions from "firebase-functions";
import {STORAGE_REGION} from "./constants";
import {useCompetitionsHandler} from "./file-upload/on-competitions";
import {processParticipants} from "./file-upload/on-participants";
import {checkInUser, selfCheckin} from "./http/checkin";
import {processRegistrations} from "./firestore/registrations";
import {processEmailQueue} from "./pubsub/on-email";
import {handleEmailQueue} from "./firestore/on-email-queue";

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


export const handleCheckin = checkInUser;
export const handleSelfCheckin = selfCheckin;


export const triggerEmail = handleEmailQueue;
export const sendEmail = processEmailQueue;

export const onParticipantsCreate = processRegistrations