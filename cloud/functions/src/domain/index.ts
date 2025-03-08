import {StorageEvent} from "firebase-functions/lib/v2/providers/storage";


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
    type: "checkin" | "registration";
    params: Record<string, unknown | undefined>;
    sentAt?: Date;
}


export interface CheckinEmail extends Email{
    type: "checkin";
    params: {
        heat: string;
        heatId: string;
        checkinTime: Date;
        competition: string;
        competitionId: string;
        time?: string;
        day?: string;
        dorsal: string;
        category: string;
        type: string;
    };
}
