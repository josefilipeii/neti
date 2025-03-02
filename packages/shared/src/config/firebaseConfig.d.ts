export interface FirebaseConfig {
    apiKey?: string;
    authDomain?: string;
    projectId?: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
    devMode?: boolean;
}
declare const configureFirestore: (config: FirebaseConfig) => {
    app: import("firebase/app").FirebaseApp;
    db: import("firebase/firestore").Firestore;
};
export { configureFirestore };
//# sourceMappingURL=firebaseConfig.d.ts.map