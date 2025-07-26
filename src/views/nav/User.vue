<script setup>

import { botApi } from '@/utils/api/bot.js'

/*
图片导入区
 */

import avatar from '@/assets/img/avatar.jpg'


/*
图片导入区结束
 */

onMounted(() => {
    // botApi.get_bot_list().then(res => {
    //
    //     console.log(res)
    //
    //
    // }).catch(err => {
    //     console.log(err)
    // })
})

</script>

<template>
<div class="w-full h-15 bg-white rounded-full shadow-sm flex p-1 outline-1 outline-slate-200">
    <div class="avatar">
        <img :src="avatar" alt="" class="h-full rounded-full">
    </div>
</div>
</template>

<style scoped>

</style>