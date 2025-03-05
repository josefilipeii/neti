import {StorageEvent} from "firebase-functions/lib/v2/providers/storage";

export interface Bucket{
    file: (name: string) => File;
}

export interface File{
    save: (content: string) => Promise<void>;
}


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
    type: 'checkin' | 'registration';
    params: Record<string, unknown | undefined>;
    sentAt?: Date;
}
