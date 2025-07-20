<script setup>




/*
图片导入区
 */

import logo from '@/assets/img/title.png'
import { auth } from '@/utils/auth.js'
import { router } from '@/router/index.js'


/*
图片导入区结束
 */

const dd = () => {
    auth.setAuthState(false)
    auth.deleteAuthToken()
    router.push({
        name: 'Login'
    })
}


const menus = ref([
    {
        name: '首页'
    },
    {
        name: '控制台'
    },
    {
        name: '插件列表'
    },
    {
        name: '插件市场'
    },
    {
        name: '聊天'
    },
    {
        name: '数据统计'
    },
    {
        name: '文件'
    },
    {
        name: '数据库'
    },
    {
        name: '关于'
    }
])


</script>

<template>
    <div class="flex-1 min-h-100 flex flex-col items-center space-y-4">
        <div class="top  w-full flex-1 flex flex-col items-center space-y-4 bg-white  rounded-4xl  shadow-sm  py-8 mx-4 min-h-80">
            <div class="logo">
                <img :src="logo" alt="" class="w-50">
            </div>
            <div class="menus w-full space-y-4 overflow-y-auto">
                <div v-for="(item, index) in menus" :key="index"
                     class="menus-item h-10 flex justify-center items-center">
                    {{ item.name }}
                </div>
            </div>
        </div>
        <div class="bottom w-full flex flex-col space-y-4  min-h-40 bg-white  rounded-4xl  shadow-sm">
            <div class="w-full p-4">
                sad
            </div>
        </div>
    </div>
</template>

<style scoped>

</style>