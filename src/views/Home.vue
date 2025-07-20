<script setup>
import {defineAsyncComponent} from "vue";

const Menu = defineAsyncComponent(() =>
    import("components/menu/Menu.vue")
)
const User = defineAsyncComponent(() => import('components/nav/User.vue'));
const Setting = defineAsyncComponent(() => import('components/nav/Setting.vue'));


onMounted(() => {
    document.documentElement.classList.add('bg-gray-100');
})

onUnmounted(()=>{
    document.documentElement.classList.remove('bg-gray-100');
})

</script>

<template>
    <!--还没做呢-->
    <!--    <button type="button" @click="dd">点这个取消登录</button>-->
    <div class="flex h-screen bg-gray-100 p-4 py-6 space-x-8">
        <div class="left h-full flex flex-col space-y-4 min-w-50 w-70 max-w-70">
            <User></User>
            <Menu></Menu>
        </div>
        <div class="right h-full flex-1 flex flex-col space-y-4">
            <Setting></Setting>
            <router-view></router-view>
        </div>
    </div>
</template>

<style scoped>

</style>