<script setup>
import { defineAsyncComponent } from 'vue'

import {useWebSocketStore} from '@/store/websocket.js'

import system_status from '@/utils/websocket/system_status.js'

import logs from '@/utils/websocket/logs.js'

const socketStore = useWebSocketStore()

const Menu = defineAsyncComponent(() => import('@/views/menu/Menu.vue'))
const User = defineAsyncComponent(() => import('@/views/nav/User.vue'))
const Setting = defineAsyncComponent(() => import('@/views/nav/Setting.vue'))


onMounted(() => {
    document.documentElement.classList.add('bg-gray-100')
    system_status.initWebSocket(socketStore)
    logs.initWebSocket(socketStore)
})

onUnmounted(() => {
    document.documentElement.classList.remove('bg-gray-100')
})
</script>

<template>
    <!--还没做呢-->
    <!--    <button type="button" @click="dd">点这个取消登录</button>-->
    <div class="flex h-screen space-x-8 bg-gray-100 p-4 py-6">
        <div
            class="left flex h-full w-70 max-w-70 min-w-50 flex-col space-y-4 select-none"
        >
            <User></User>
            <Menu></Menu>
        </div>
        <div class="right flex h-full flex-1 flex-col space-y-4">
            <Setting></Setting>
            <router-view></router-view>
        </div>
    </div>
</template>

<style scoped></style>
