import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {Email} from "../domain";
const brevoApiKey = process.env.BREVO_API_KEY;
const brevoCheckinTemplateId = process.env.BREVO_CHECKIN_TEMPLATE_ID;




export const handleEmailQueue = onDocumentCreated("/email-queue/{docId}", async (event) => {

    if(!brevoCheckinTemplateId || !brevoApiKey || isNaN(Number(brevoCheckinTemplateId))){
        console.log( brevoApiKey, brevoCheckinTemplateId)
        throw Error("missing brevo configuration not set in Firebase Functions env.");
    }

    const snap = event.data;

    if (!snap || !snap.exists) {
        console.warn(`⚠️ No valid snapshot found for params: ${JSON.stringify(event.params)}, skipping Email sent.`);
        return;
    }

    try{


        const email = snap.data() as Email;
        if(email.type !== "checkin"){
            console.log(`❌ Skipping email of type ${email.type}`);
            return;
        }

        const body = JSON.stringify({
            templateId: Number(brevoCheckinTemplateId), // Replace with your Brevo template ID
            to: email.to,
            cc: email.cc,
            params: email.params
        });
        console.log(body)
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
                "api-key": brevoApiKey || "invalid-api-key",
                "Content-Type": "application/json"
            },
            body
        });

        const result = await response.json();
        if (!response.ok) throw new Error(JSON.stringify(result));
    }catch (error) {
        console.error("Email sent failed:", error);
        throw new Error("Email sent failed");
    }

});