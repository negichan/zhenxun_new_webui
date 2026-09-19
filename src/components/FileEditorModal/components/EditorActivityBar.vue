<script setup lang="ts">
/**
 * 活动栏（VSCode 式）：无背景高亮，选中态 = 图标高亮 + 左缘全高指示条，
 * 悬停仅提升图标亮度，不铺底色。
 */
import { Database, Files, Search } from "lucide-vue-next";
import type { SidebarPanel } from "../types";

defineProps<{
    activePanel: SidebarPanel;
}>();

const emit = defineEmits<{
    "toggle-panel": [panel: SidebarPanel];
}>();

const panels = [
    { id: "explorer" as const, icon: Files, title: "资源管理器" },
    { id: "search" as const, icon: Search, title: "全局搜索" },
    { id: "database" as const, icon: Database, title: "数据库" },
];
</script>

<template>
    <aside
        class="flex w-12 flex-shrink-0 select-none flex-col items-center gap-1 border-r border-slate-200 bg-white py-3"
    >
        <button
            v-for="panel in panels"
            :key="panel.id"
            class="relative flex h-10 w-full cursor-pointer items-center justify-center transition-colors"
            :class="
                activePanel === panel.id
                    ? 'text-zx-primary'
                    : 'text-zx-text-subtle hover:text-zx-text-muted'
            "
            :title="panel.title"
            type="button"
            @click="emit('toggle-panel', panel.id)"
        >
            <span
                v-if="activePanel === panel.id"
                class="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-zx-primary"
            ></span>
            <component :is="panel.icon" class="h-5 w-5" />
        </button>
    </aside>
</template>
