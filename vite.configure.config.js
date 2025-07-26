import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { viteSingleFile } from 'vite-plugin-singlefile'
import * as path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        tailwindcss(),
        AutoImport({
            resolvers: [ElementPlusResolver()],
            imports: [
                'vue',
                'vue-router',
                'pinia',
            ],
        }),
        Components({
            resolvers: [ElementPlusResolver()],
        }),
        {
            name: 'log-visits',
            configureServer(server) {
                server.middlewares.use((req, res, next) => {
                    const ip = req.socket.remoteAddress || 'unknown'
                    const path = req.url
                    console.log(`[访问记录] IP: ${ip} 路径: ${path}`)
                    next()
                })
            }
        },
        viteSingleFile(),
        // visualizer({
        //     filename: 'stats.html', // 打包后生成的分析文件
        //     open: true,             // 构建后自动打开浏览器查看
        //     gzipSize: true,
        //     brotliSize: true,
        // })
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
            'components': fileURLToPath(new URL('./src/components', import.meta.url)),
        }
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        assetsDir: 'configure/assets',
        copyPublicDir: false,
        // minify: false,
        // sourcemap: true,
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true
            }
        },
        rollupOptions: {
            input: path.resolve(__dirname, 'configure/index.html'),
            treeshake: {
                moduleSideEffects: false // 移除没用的模块
            },
            output: {
                // manualChunks(id) {
                //     if (id.includes('node_modules')) {
                //         if (id.includes('vue')) {
                //             return 'vendor_vue'
                //         }
                //         if (id.includes('element-plus')) {
                //             return 'vendor_element'
                //         }
                //         return id.toString().split("node_modules/")[1].split("/")[0].toString();
                //     }
                // }
            }
        },

    },
    preview:{
      open:'/configure/'
    },
    server: {
        proxy: {
            "/zhenxun/api": {
                target: "http://localhost:8080",
                changeOrigin: true,
                ws: false,
            },
        },
        host: '::',
    },
})
