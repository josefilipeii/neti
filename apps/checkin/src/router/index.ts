import {createRouter, createWebHistory} from 'vue-router'
import {auth} from "../firebase";
import Checkin from "../views/Checkin.vue";
import Login from "../views/Login.vue";
import NotAllowed from "../views/NotAllowed.vue";
import ErrorPage from "../views/ErrorPage.vue";


let validateLogin = (to, from, next) => {
    if (auth.currentUser) {
        next()
    } else {
        router.push('/not-allowed')
        next('/login')
    }
};
const routes = [
    {path: '/', component: Checkin, beforeEnter: validateLogin},
    {path: '/checkin', component: Checkin, beforeEnter: validateLogin},
    {path: '/login', component: Login},
    {path: '/not-allowed', component: NotAllowed},
    {path: "/:pathMatch(.*)*", component: ErrorPage},
]

const router = createRouter({
    history: createWebHistory(),
    routes
})


export default router