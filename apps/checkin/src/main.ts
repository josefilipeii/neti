import {createApp} from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import {createPinia} from "pinia";
import {
    VueFire,
    VueFireAuth,
    VueFireAuthWithDependencies,
    VueFireDatabaseOptionsAPI,
    VueFireFirestoreOptionsAPI
} from "vuefire";
import {
    browserLocalPersistence, connectAuthEmulator,
    debugErrorMap,
    indexedDBLocalPersistence,
    prodErrorMap,
} from 'firebase/auth'
import {initializeApp} from "firebase/app";
import {useFirebaseAuth, useFirestore} from "vuefire";
import {connectFirestoreEmulator} from "firebase/firestore";


export const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'hybrid-day-checkin',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    devMode: import.meta.env.DEV,
};
export const firebaseApp = initializeApp(firebaseConfig);


export const initEmulators = () => {
    if (firebaseConfig.devMode) {
        connectAuthEmulator(useFirebaseAuth(), 'http://localhost:9099');
        connectFirestoreEmulator(useFirestore(), 'localhost', 8080);
    }
}

const pinia = createPinia()

const app = createApp(App)
app.use(router)
app.use(pinia)


app.use(VueFire, {
    // imported above but could also just be created here
    firebaseApp,
    modules: [
        VueFireAuth(),
        VueFireFirestoreOptionsAPI(),
        VueFireDatabaseOptionsAPI(),
    ],
})


app.mount('#app')
