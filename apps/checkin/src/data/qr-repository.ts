import {Registration} from "shared";
import {db} from "../firebase";
import { doc, getDoc} from 'firebase/firestore';

interface QRDocument{
    id: string;
    competitionId: string;
    registrationId: string;
}

export const registrationByQr = async (qr: string) => {
    const qrDocRef = doc(db, 'qrCodes', qr);
    const qrDoc = await getDoc(qrDocRef);
    if (!qrDoc.exists()) {
        console.error(`QR document with ID ${qr} not found`);
        throw new Error('QR document not found');
    }
    const qrData = qrDoc.data() as QRDocument;
    const registration = await getDoc(doc(db, `competitions/${qrData.competitionId}/registrations`, qrData.registrationId));

    if (!registration.exists()) {
        console.error(`Registration  competitions/${qrData.competitionId}/registrations${qrData.registrationId} not found`);
        throw new Error('Registration not found');
    }
    const registrationData = registration.data() as Registration;
    console.log(qrData, registrationData, registration.data())
    return { competitionId: qrData.competitionId, ...registrationData };
}


export const participantsById = async (competitionId: string, participantIds: string[]) => {
    const participants = [];
    for (const id of participantIds) {
        const participantRef = doc(db, `competitions/${competitionId}/participants`, id);
        const participantSnapshot = await getDoc(participantRef);
        if (participantSnapshot.exists()) {
            participants.push(participantSnapshot.data());
        }
    }
    return participants;

}