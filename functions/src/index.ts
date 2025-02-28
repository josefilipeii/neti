import {processCompetitionFile} from "./file-upload/on-competitions";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });


export const onCompetitionsFileUpload = processCompetitionFile;