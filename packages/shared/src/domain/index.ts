import { Timestamp } from "firebase-admin/firestore";

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
    id: string;
    name: string;
    day: string;
    time: string;
}


export interface Registration {
    id?: string; //dorsal
    category: Category;
    day?: string;
    time?: string;
    participants: RegistrationParticipant[];
    checkin?: Redemption;
    qrId?: string;
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


export interface QRegistration {
    heat: QRHeat;
    day: string;
    time: string;
    dorsal: string;
    category: QRCategory;
    participants: QRParticipant[];
}

export interface QRHeat {
    id: string,
    name: string
}

export interface QRCategory {
    id: string;
    name: string;
}


interface QRParticipant {
    email: string;
    name?: string;
    contact?: string;
}

export interface QRDocument {
    id: string;
    createdAt: string;
    type: "registration" | "addon";
    redeemed?: Redemption;
    redeemableBy: string[];
}

export interface QRRegistrationDocument extends QRDocument {
    competition: QRCompetition;
    registration: QRegistration;
}

export interface Redemption {
    at: Timestamp;
    how: string;
    by: string;
}
