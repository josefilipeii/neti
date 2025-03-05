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


export interface QRRedemption {
    at: Date | Timestamp;
    by: string;
    how: string;
}

export interface QRDocument{
    id: string;
    competition: string;
    createdAt: string;
    dorsal?: string;
    heat?: string;
    day?: string;
    time?: string;
    type: 'registration' | 'addon';
    category?: string;
    redeemableBy?: string[];
    recipients: Recipient[];
    self: string;
    redeemed?: QRRedemption;
}

export interface Recipient{
    email: string;
    name?: string;
}
