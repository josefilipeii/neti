import {createApp} from 'vue';
import App from './App.vue';
import router from './router';
import {VueFire, VueFireAppCheck, VueFireAuth, VueFireDatabaseOptionsAPI, VueFireFirestoreOptionsAPI} from "vuefire";
import {firebaseApp} from "./firebase";
import {ReCaptchaEnterpriseProvider} from "firebase/app-check";
import {createPinia} from "pinia";
import './style.css'; // Import Tailwind SCSS globally

const app = createApp(App)
app.use(router)
app.use(createPinia())


app.use(VueFire, {
    // imported above but could also just be created here
    firebaseApp,
    modules: [
        VueFireAppCheck({
            provider: new ReCaptchaEnterpriseProvider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
            // Only use debug during development
            debug: import.meta.env.DEV,
            isTokenAutoRefreshEnabled: true,
        }),
        VueFireAuth(),
        VueFireFirestoreOptionsAPI(),
        VueFireDatabaseOptionsAPI()

    ],
})


app.mount('#app')
