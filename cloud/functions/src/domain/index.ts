import {StorageEvent} from "firebase-functions/lib/v2/providers/storage";
import {Timestamp} from "firebase-admin/lib/firestore";


export type StorageHandler = (event: StorageEvent) => unknown | Promise<unknown>;


export interface Recipient{
    email: string;
    name?: string;
}

export interface Email{
    id?: string;
    to: Recipient[];
    cc?: Recipient[];
    ref: string;
    type: "checkin" | "registration" | "tickets" | "addon-voucher";
    params?: Record<string, unknown | undefined>;
    sentAt?: Date;
    createdAt?: Timestamp;
    storageAttachments?: StorageAttachement[];
    linkAttachments?: LinkAttachement[];
}


export interface RegistrationEmail extends Email{
    params: {
        registrationId: string;
        heatId: string;
        competitionId: string;
        dorsal: string;
    };
}


export interface StorageAttachement {
    bucket: string;
    path: string;
}

export interface LinkAttachement {
    url: string;
    name: string;
}



export interface User {
    email: string;
    roles: string[];
}

export interface Agent {
    user: string;
    pin: string;
    roles: string[];
    enabled: boolean;
}


export interface Row {
    eventId: string;
    heatId: string;
    heatName: string;
    heatDay: string;
    heatTime: string;
    externalId?: string;
    provider: string;
    internalId?: string;
    dorsal: string;
    registrationId: string;
    providerId: string;
    category: string;
    participants: { name: string; email: string; contact: string }[];
    createdAt: Timestamp;
}


export interface Chunk {
    chunkIndex: number;
    eventId: string;
    totalRecords: number;
    processed: boolean;
    retryCount: number;
    status: string;
    data: Row[];
    chunkHeats: string[];
}


export  interface AddonRow {
    provider: string;
    referenceId?: string;
    internalId?: string;
    externalId?: string;
    name: string;
    email: string;
    sizeS?: string;
    sizeM?: string;
    sizeL?: string;
    sizeXL?: string;
    sizeXXL?: string;
}