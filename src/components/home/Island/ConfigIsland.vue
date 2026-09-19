<script lang="ts" setup>
import { Bot } from "lucide-vue-next";
import { useAiStore } from "@/store/ai";
import { storeToRefs } from "pinia";
import { onMounted } from "vue";

const aiStore = useAiStore();
const { providerCount, modelCount } = storeToRefs(aiStore);

onMounted(() => {
    if (aiStore.aiConfig.providers.length === 0) {
        void aiStore.fetchConfig();
    }
});
</script>

<template>
    <!-- w-fit：不要撑满 header -->
    <div class="flex w-fit items-center gap-2">
        <!-- 标题胶囊 -->
        <div
            class="group flex w-fit items-center space-x-3 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm transition-all hover:scale-105"
        >
            <Bot class="h-5 w-5 text-zx-primary" />
            <span class="text-sm font-medium whitespace-nowrap text-zx-text">
                大模型配置
            </span>
        </div>

        <!-- 统计胶囊：服务商与模型数量 -->
        <div class="flex items-center gap-2">
            <!-- 服务商 -->
            <div
                class="group flex w-fit items-center space-x-2 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm transition-all hover:scale-105 sm:px-4"
            >
                <span
                    v-odometer="providerCount"
                    class="text-sm font-black text-purple-500"
                ></span>
                <div class="h-3 w-[1px] bg-black/30"></div>
                <span class="text-xs whitespace-nowrap text-zx-text-muted">
                    服务商
                </span>
            </div>

            <!-- 模型 -->
            <div
                class="group flex w-fit items-center space-x-2 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm transition-all hover:scale-105 sm:px-4"
            >
                <span
                    v-odometer="modelCount"
                    class="text-sm font-black text-blue-500"
                ></span>
                <div class="h-3 w-[1px] bg-black/30"></div>
                <span class="text-xs whitespace-nowrap text-zx-text-muted">
                    模型
                </span>
            </div>
        </div>
    </div>
</template>

<style scoped></style>
