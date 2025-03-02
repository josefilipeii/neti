import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

export interface FirebaseConfig{
    apiKey?: string;
    authDomain?: string;
    projectId?: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
    devMode?: boolean;
}



const firebaseWithFirestore = (config: FirebaseConfig) => {
    const app =  initializeApp(config);
    const db = getFirestore(app);
    if (config.devMode) {
        connectFirestoreEmulator(db, 'localhost', 8080);
    }
    return  {app, db}
}





export { firebaseWithFirestore };