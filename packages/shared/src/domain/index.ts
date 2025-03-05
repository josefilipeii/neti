import { Timestamp } from 'firebase/firestore';

export interface Competition {
    id: string;
    name: string;
    location?: string;
    days: string[];
    categories: Category[];
}

export interface Category {
    id: string;
    name: string;
    type: string;
}


export interface Heat {
    id?: string
    name: string;
    time: string;
    day: string;
}

export interface Registration {
    id?: string; //dorsal
    category: string;
    day?: string;
    time?: string;
    participants: RegistrationParticipant[];
}

export interface RegistrationParticipant{
    name: string;
    email: string;
    contact: string;
}


export interface Participant {
    id: string;
    name: string;
    email: string;
    contact: string;
}


export interface QRCompetition {
    id: string;
    name: string;
}

interface QRHeat{
    id: string;
    name: string;
    day: string;
    time: string;
}

export interface QRegistration {
    heat: QRHeat;
    dorsal: string;
    category: QRCategory;
}

export interface QRCategory {
    id: string;
    name: string;
}


interface QRRecipient {
    email: string;
    name?: string;
}

export interface QRDocument {
    id: string;
    createdAt: string;
    type: "registration" | "addon";
    redeemed?: QRRedemption;
    redeemableBy: string[];
    recipients: QRRecipient[];
}

export interface QRRegistrationDocument extends QRDocument {
    competition: QRCompetition;
    registration: QRegistration;
}

export interface QRRedemption {
    at: Date;
    how: string;
    by: string;
}
