import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
const configureFirestore = (config) => {
    const app = initializeApp(config);
    const db = getFirestore(app);
    if (config.devMode) {
        connectFirestoreEmulator(db, 'localhost', 8080);
    }
    return { app, db };
};
export { configureFirestore };
//# sourceMappingURL=firebaseConfig.js.map