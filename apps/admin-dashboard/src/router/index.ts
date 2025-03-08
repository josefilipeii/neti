import {createRouter, createWebHistory} from 'vue-router'
import Login from "../views/Login.vue";
import {getCurrentUser} from "vuefire";
import CompetitionDashboard from "../views/CompetitionDashboard.vue";
import AdminDashboard from "../views/AdminDashboard.vue";
import NotAllowed from "../views/NotAllowed.vue";
import ErrorPage from "../views/ErrorPage.vue";


const routes = [
    {path: '/', component: CompetitionDashboard, meta: { requiresAuth: true }},
    {path: '/heats', component: CompetitionDashboard, meta: { requiresAuth: true , role: 'dashboard'}},
    {path: '/admin', component: AdminDashboard, meta: { requiresAuth: true , role: 'admin'}},
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
            console.log(claimRoles, to.meta.role)
            if (!claimRoles || !claimRoles.includes(to.meta.role as string)) {
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
