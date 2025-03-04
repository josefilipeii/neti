import {RegistrationParticipant} from "shared";

interface QRRedemption {
    at: Date;
    by: string;
    how: string;
}

export interface QRDocument{
    id: string;
    competition: string;
    createdAt: string;
    dorsal?: string;
    heat?: string;
    type: 'registration' | 'addon';
    category?: string;
    participants: RegistrationParticipant[];
    redeemed?: QRRedemption;
}