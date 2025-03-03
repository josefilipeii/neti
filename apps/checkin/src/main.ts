import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import {createPinia} from "pinia";
import {VueFire, VueFireAuthWithDependencies} from "vuefire";
import {
    browserLocalPersistence,
    debugErrorMap,
    indexedDBLocalPersistence,
    prodErrorMap,
} from 'firebase/auth'
import {firebaseApp} from "./firebase";



const pinia = createPinia()

const app = createApp(App)
app.use(router)
app.mount('#app')
app.use(pinia)


app.use(VueFire, {
    // imported above but could also just be created here
    firebaseApp,
    modules: [
        VueFireAuthWithDependencies({
            dependencies: {
                errorMap:
                    process.env.NODE_ENV !== 'production'
                        ? debugErrorMap
                        : prodErrorMap,
                persistence: [
                    indexedDBLocalPersistence,
                    browserLocalPersistence,
                ]
            }
        }),
    ],
})
