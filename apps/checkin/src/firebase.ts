import {firebaseWithFirestore} from "@shared";
import {FirebaseConfig} from "@shared";

export const firebaseConfig: FirebaseConfig = {
    apiKey: import.meta.env.FIREBASE_API_KEY,
    authDomain: import.meta.env.FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.FIREBASE_PROJECT_ID || 'hybrid-day-checkin',
    storageBucket: import.meta.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.FIREBASE_APP_ID,
    devMode: location.hostname === 'localhost'
};

const config = firebaseWithFirestore(firebaseConfig);
export const db = config.db;