import {createRouter, createWebHistory} from "vue-router";
import SelfCheckin from "../components/SelfCheckin.vue";

const routes = [
    {
        path: '/',
        name: 'Home',
        component: SelfCheckin
    }
];

export const router = createRouter({
    history: createWebHistory(),
    routes,
});

