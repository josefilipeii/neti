import {ref} from "vue";


export const useLoadingStore = () => {
    const loading = ref(false);
    const startLoading = () => {
        console.log('loading');
        loading.value = true;
    }
    const stopLoading = () => {
        console.log('stop loading');
        loading.value = false;
    }

    return {loading, startLoading, stopLoading};
}
