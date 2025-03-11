import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
    plugins: [vue(), tailwindcss()],
    css:{
        postcss: './postcss.config.js',
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: (id) => {
                    if (id.includes('node_modules')) {
                        if (id.includes('vue')) {
                            return 'vendor-vue';
                        }
                        return 'vendor';     }
                    return 'app' // Everything else goes into 'app'
                },
            },
        },
    }
})
