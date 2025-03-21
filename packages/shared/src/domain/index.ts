import { Timestamp } from "firebase-admin/firestore";

export interface Competition {
    id: string;
    shortId: string;
    name: string;
    location?: string;
    days: string[];
    categories: Category[];
    address: string[]
    checkinMinutesBefore: number;
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
    category: string;
    day?: string;
    time?: string;
    participants: RegistrationParticipant[];
    checkin?: Redemption;
    qrId?: string;
    provider: string;
    providerId: string;
    ticket?: {
        document?: string;
        sent: Timestamp;
        scheduled: Timestamp;
    }
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


export interface CompetitionInfo {
    id: string;
    name: string;
    address: string[];
    checkinMinutesBefore: number;
}


export interface QRegistration {
    heat: string;
    day: string;
    time: string;
    dorsal: string;
    category: string;
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
    competition: CompetitionInfo;
    id: string;
    code: string;
    createdAt: string;
    type: "registration" | "addon";
    redeemed?: Redemption;
    redeemableBy: string[];
    files?: QRFiles;
    provider: string;
    sent: boolean;
    status: "init" | "processed";
}


export interface QRFiles {
    qr: QRFile;
    barcode: QRFile;
    ticket: QRFile;
    name: string;
    email: string;
}


export interface QRFile{
    url: string;
    path: string;
}

export interface QRRegistrationDocument extends QRDocument {
    registration: QRegistration;
}

export interface QRAddonDocument extends QRDocument {
    type: "addon";
    addonType: "tshirt";
    name: string;
}

export interface QRTShirtDocument extends QRAddonDocument{
    addonType: "tshirt";
    sizes: Record<string, string>;
}

export interface Redemption {
    at: Timestamp;
    how: string;
    by: string;
}


export interface TshirtAddon{
    id?: string;
    competition: string;
    provider: string;
    referenceId: string;
    name: string;
    email: string;
    sizes: Record<string, string>;
    status: "pending" | "init" | "processed";
    createdAt: Timestamp;
    redeemed?: Redemption;
}