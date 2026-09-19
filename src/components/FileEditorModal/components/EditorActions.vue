<script setup lang="ts">
/**
 * 编辑器悬浮动作组（VSCode 式，编辑区右上角）：
 * 仅在有可用动作时渲染——JSON 格式化。
 * 图片视图三段式已移至标签栏右侧。
 */
import { computed } from "vue";
import { Braces } from "lucide-vue-next";
import type { Workbench } from "../useWorkbench";

const props = defineProps<{
    wb: Workbench;
}>();

const activeTab = computed(() => props.wb.activeTab.value);

const isJson = computed(
    () =>
        activeTab.value?.language === "json" &&
        activeTab.value?.viewMode === "text",
);
</script>

<template>
    <div
        v-if="activeTab && isJson && wb.isMonacoReady.value"
        class="absolute top-1.5 right-3 z-10 flex items-center rounded-full border border-slate-200/70 bg-white/85 px-1 py-0.5 shadow-sm backdrop-blur"
    >
        <ZxButton
            variant="ghost"
            circle
            size="sm"
            class="!h-6 !w-6"
            title="格式化 JSON"
            @click="wb.formatDocument()"
        >
            <Braces class="h-3.5 w-3.5" />
        </ZxButton>
    </div>
</template>
