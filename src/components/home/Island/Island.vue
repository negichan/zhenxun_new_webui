<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

import DashboardIsland from "@/components/home/Island/DashboardIsland.vue";
import AnalyticsIsland from "@/components/home/Island/AnalyticsIsland.vue";
import ChatIsland from "@/components/home/Island/ChatIsland.vue";
import PluginIsland from "@/components/home/Island/PluginIsland.vue";
import StoreIsland from "@/components/home/Island/StoreIsland.vue";
import FilesIsland from "@/components/home/Island/FilesIsland.vue";
import ManageIsland from "@/components/home/Island/ManageIsland.vue";
import { useGlobalStore } from "@/store/global.ts";
import LogIsland from "@/components/home/Island/LogIsland.vue";
import ConfigIsland from "@/components/home/Island/ConfigIsland.vue";

const route = useRoute();

const globalStore = useGlobalStore();

const islandMap: Record<string, any> = {
    "/chat": ChatIsland,
    "/analytics": AnalyticsIsland,
    "/plugin": PluginIsland,
    "/store": StoreIsland,
    "/files": FilesIsland,
    "/manage": ManageIsland,
    "/logs": LogIsland,
    "/config": ConfigIsland,
};

const currentIsland = computed(() => {
    if (route.path === "/plugin" && route.query.tab === "market") {
        return StoreIsland;
    }
    return islandMap[route.path] || DashboardIsland;
});
</script>

<template>
    <!-- 平板/桌面都显示；仅手机隐藏。平板竖屏也占位，配合 header 问候语避让 -->
    <div class="flex space-x-4" v-if="!globalStore.isMobileMode">
        <keep-alive>
            <component :is="currentIsland" />
        </keep-alive>
    </div>
</template>

<style scoped></style>
