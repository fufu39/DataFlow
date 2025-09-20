// 导入ElementPlus样式
import 'element-plus/dist/index.css'
// 引入黑暗模式专属样式
import 'element-plus/theme-chalk/dark/css-vars.css'
// 导入全局样式
import '@/styles/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
