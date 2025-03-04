import {createApp} from 'vue';
import './style.css';
import App from './App.vue';
import {router} from './router';
import {VueFire, VueFireAuth, VueFireDatabaseOptionsAPI, VueFireFirestoreOptionsAPI} from "vuefire";
import {firebaseApp} from "./firebase";

const app = createApp(App)
app.use(router)

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
