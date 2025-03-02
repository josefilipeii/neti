import {defineConfig} from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    plugins: [vue(), tailwindcss()],
    build: {
        rollupOptions: {
            output: {
                manualChunks: (id) => {
                    if (id.includes('node_modules')) {
                        if (id.includes('vue')) {
                            return 'vendor-vue';
                        }
                        if (id.includes('tailwindcss')) {
                            return 'vendor-tailwindcss';
                        }
                        return 'vendor';
                    }
                    return 'app' // Everything else goes into 'app'
                },
            },
        },
    }
});
