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
        try {
            const tokenResult = await currentUser.getIdTokenResult();
            let claimRoles = tokenResult.claims.roles as string[];
            if (!claimRoles || !claimRoles.includes('lobby')) {
                console.warn("⚠ No custom claims found, redirecting to error page.");
                return {
                    path: '/not-allowed'
                }
            }

            console.log("✅ User claims:", claimRoles);
        } catch (error) {
            console.error("❌ Error fetching claims:", error);
            return {
                path: 'error'
            }
        }
    }
})


export default router
