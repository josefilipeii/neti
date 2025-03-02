import * as functions from "firebase-functions";
import {FUNCTIONS_REGION} from "./constants";
import {useCompetitionsHandler} from "./file-upload/on-competitions";
import {useParticipantsHandler} from "./file-upload/on-participants";
import {generateQrForRegistration} from "./firestore/on-registration";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

export const onCompetitions = functions.storage
    .onObjectFinalized({region: FUNCTIONS_REGION}, async (object) => {
        useCompetitionsHandler(object);
    });

export const onParticipants = functions.storage
    .onObjectFinalized({region: FUNCTIONS_REGION}, async (object) => {
        useParticipantsHandler(object);
    });


export const onRegistrationCreateQrCode = generateQrForRegistration;