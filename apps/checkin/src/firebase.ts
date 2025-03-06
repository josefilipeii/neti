import {initializeApp} from "firebase/app";
import {connectFirestoreEmulator, getFirestore} from "firebase/firestore";
import {connectAuthEmulator, getAuth} from "firebase/auth";
import {connectFunctionsEmulator, getFunctions} from "firebase/functions";

export const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_APIKEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTHDOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECTID || 'hybrid-day-checkin',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGEBUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGINGSENDERID,
    appId: import.meta.env.VITE_FIREBASE_APPID,
    devMode: import.meta.env.DEV,
};
const firebaseApp = initializeApp(firebaseConfig);
const firestore = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);
const functions = getFunctions(firebaseApp, "europe-west1");

if (import.meta.env.DEV) {
    console.log('🔥 Using Firebase Emulators');
    connectFirestoreEmulator(firestore, 'localhost', 8080); // Firestore Emulator
    connectAuthEmulator(auth, 'http://localhost:9099'); // Auth Emulator (if used)
    connectFunctionsEmulator(functions, "localhost", 5001);
}


export {firebaseApp, firestore, auth, functions};