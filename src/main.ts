import { createApp } from 'vue'
import './assets/style.css'
import App from './App.vue'
import { router } from "@/router"
import { createPinia } from 'pinia'
// import 'element-plus/dist/index.css'

const app = createApp(App)
const pinia = createPinia()

app.use(router)
app.use(pinia)

app.mount('#app')
