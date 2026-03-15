<script setup lang="ts">

import { Cpu, MemoryStick, HardDrive } from "lucide-vue-next";



import { useSystemStore } from '@/store/system.js'
import SystemStatus from "@/views/dashboard/SystemStatus.vue";
import Statistics from "@/views/dashboard/Statistics.vue";
import {useBotStore} from "@/store/bot";


const systemStore = useSystemStore()
const botStore = useBotStore()


onMounted(() => {
    systemStore.startPolling()
});

onBeforeUnmount(() => {
    systemStore.stopPolling()
});


</script>

<template>
    <div class="dashboard-fw w-full h-full space-y-4 flex flex-wrap space-x-4">
        <div
            class="list max-w-120 min-w-120 w-full h-64 bg-white rounded-4xl shadow-sm flex flex-1 flex-col justify-between items-center outline-1 p-4 outline-slate-200">
            <div class="bot flex flex-col">
                <div class="top-info">

                </div>
            </div>
        </div>
        <div class="info space-y-4 p-1 flex-1  flex flex-col min-w-50 h-fit overflow-y-auto max-h-66">
            <div class="status gap-4 flex flex-wrap">
                <SystemStatus :data="systemStore.systemStatus.cpu" :icon="Cpu" title="CPU"></SystemStatus>
                <SystemStatus :data="systemStore.systemStatus.memory" :icon="MemoryStick" title="Memory"></SystemStatus>
                <SystemStatus :data="systemStore.systemStatus.disk" :icon="HardDrive" title="Disk"></SystemStatus>

            </div>
            <div class="statistics gap-4 flex flex-wrap">
                <Statistics :data="systemStore.count.chat_num" title="消息总数"></Statistics>
                <Statistics :data="systemStore.count.chat_day" title="今日消息"></Statistics>
                <Statistics :data="systemStore.count.call_num" title="调用总数"></Statistics>
                <Statistics :data="systemStore.count.call_day" title="今日调用"></Statistics>
            </div>
        </div>
    </div>
</template>

<style scoped>

</style>