<script setup>


/*
图片导入区
 */

import avatar from '@/assets/img/avatar.jpg'


/*
图片导入区结束
 */



</script>

<template>
<div class="w-full h-15 bg-white rounded-full shadow-sm flex p-1">
    <div class="avatar">
        <img :src="avatar" alt="" class="h-full rounded-full">
    </div>
</div>
</template>

<style scoped>

</style>