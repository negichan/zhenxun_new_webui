<script setup>

import avatar from "@/assets/img/avatar.jpg";
import logo from "@/assets/img/title.png";

import {useGlobalStore} from "@/store/global.js";

const globalStore = useGlobalStore()

function avatar_click(){
    globalStore.navHidden=!globalStore.navHidden
}

import {
    Settings
} from 'lucide-vue-next'

</script>

<template>
<div class="w-full h-15 flex flex-row justify-between items-end pr-4">
<!--    ml-auto-->
<!--    <div-->
<!--        v-for="(item, i) in list"-->
<!--        :key="i"-->
<!--        class="px-4 py-2 bg-white rounded-full shadow text-sm flex gap-2 items-center"-->
<!--    >-->
<!--      <span class="font-semibold">-->
<!--        {{ item }}-->
<!--      </span>-->
<!--    </div>-->

    <div class="bg-white p-3 px-5 rounded-full shadow-sm cursor-pointer group duration-300 outline-1 outline-slate-200">
        在线小真寻(1)
    </div>

        <div class="ml-auto bg-white p-3 rounded-full shadow-sm cursor-pointer hover:bg-black group duration-300 outline-1 outline-slate-200" @click="avatar_click">
            <settings class=" size-5 group-hover:text-white duration-300"></settings>
        </div>
</div>
</template>

<style scoped>

</style>