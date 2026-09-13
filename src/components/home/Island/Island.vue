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
import DatabaseIsland from "@/components/home/Island/DatabaseIsland.vue";
import LogIsland from "@/components/home/Island/LogIsland.vue";

const route = useRoute();

const globalStore = useGlobalStore();

const islandMap: Record<string, any> = {
    "/chat": ChatIsland,
    "/analytics": AnalyticsIsland,
    "/plugin": PluginIsland,
    "/store": StoreIsland,
    "/files": FilesIsland,
    "/manage": ManageIsland,
    "/database": DatabaseIsland,
    "/logs": LogIsland,
};

const currentIsland = computed(() => {
    if (route.path === "/plugin" && route.query.tab === "market") {
        return StoreIsland;
    }
    return islandMap[route.path] || DashboardIsland;
});
</script>

<template>
    <div class="flex space-x-4" v-if="globalStore.isDesktopMode">
        <keep-alive>
            <component :is="currentIsland" />
        </keep-alive>
    </div>
</template>

<style scoped></style>
