<script setup>

import avatar from "@/assets/img/avatar.jpg";
import logo from "@/assets/img/title.png";
</script>

<template>
<div class="w-full h-15 flex flex-row-reverse justify-between">
    <div class="bg-white rounded-full shadow-sm flex p-1 ">
        <div class="avatar">
            <img :src="avatar" alt="" class="h-full rounded-full">
        </div>
    </div>
</div>
</template>

<style scoped>

</style>