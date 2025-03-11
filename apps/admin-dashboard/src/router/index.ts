import {createRouter, createWebHistory} from 'vue-router'
import Login from "../views/Login.vue";
import {getCurrentUser} from "vuefire";
import CompetitionDashboard from "../views/CompetitionDashboard.vue";
import AdminDashboard from "../views/AdminDashboard.vue";
import NotAllowed from "../views/NotAllowed.vue";
import ErrorPage from "../views/ErrorPage.vue";
import ManualActions from "../views/ManualActions.vue";
import AddonDashboard from "../views/AddonDashboard.vue";


const routes = [
    {path: '/', redirect: '/heats'},
    {path: '/heats', component: CompetitionDashboard, meta: {requiresAuth: true, roles: ['dashboard']}},
    {path: '/admin', component: AdminDashboard, meta: {requiresAuth: true, roles: ['admin']}},
    {path: '/addons', component: AddonDashboard, meta: {requiresAuth: true, roles: ['admin', 'dashboard']}},
    {path: '/manual-actions', component: ManualActions, meta: {requiresAuth: true, roles: ['admin']}},
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
            if (!claimRoles || !(to.meta.roles as string[]).some(expected => claimRoles.includes(expected))) {
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
