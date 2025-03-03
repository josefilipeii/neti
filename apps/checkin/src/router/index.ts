import {createRouter, createWebHistory} from 'vue-router'
import Checkin from "../views/Checkin.vue";
import Login from "../views/Login.vue";
import NotAllowed from "../views/NotAllowed.vue";
import ErrorPage from "../views/ErrorPage.vue";
import {getCurrentUser} from "vuefire";


const routes = [
    {path: '/', component: Checkin, meta: { requiresAuth: true }},
    {path: '/checkin', component: Checkin, meta: { requiresAuth: true }},
    {path: '/login', component: Login},
    {path: '/not-allowed', component: NotAllowed},
    {path: "/:pathMatch(.*)*", component: ErrorPage},
]

const router = createRouter({
    history: createWebHistory(),
    routes
})


router.beforeEach(async (to) => {
    // routes with `meta: { requiresAuth: true }` will check for
    // the users, others won't
    if (to.meta.requiresAuth) {
        const currentUser = await getCurrentUser()
        // if the user is not logged in, redirect to the login page
        if (!currentUser) {
            return {
                path: '/login'
            }
        }
    }
})


export default router
