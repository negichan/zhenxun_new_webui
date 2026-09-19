<script setup lang="ts">
/**
 * SQL 侧栏面板 — 位于左侧数据库栏右侧、编辑器左侧（非底部）
 * VSCode 风格标签栏 + 左右拖宽
 */
import { ref } from "vue";
import { X } from "lucide-vue-next";
import SqlResultsPanel from "./db/SqlResultsPanel.vue";
import { startPointerDrag } from "../pointerDrag";
import type { Workbench } from "../useWorkbench";

type PanelTab = "sql" | "output";

const props = withDefaults(
    defineProps<{
        open: boolean;
        mode?: "sql" | "empty";
        wb?: Workbench;
    }>(),
    { mode: "empty" },
);

const emit = defineEmits<{ close: [] }>();

const activeTab = ref<PanelTab>("sql");
const width = ref(320);

const tabs: { id: PanelTab; label: string }[] = [
    { id: "sql", label: "SQL" },
    { id: "output", label: "输出" },
];

if (props.mode === "sql") activeTab.value = "sql";

/** 左缘拖拽调宽（鼠标/触控） */
const onDragStart = (e: PointerEvent) => {
    const startX = e.clientX;
    const startW = width.value;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    startPointerDrag(e, {
        onMove: (ev) => {
            width.value = Math.max(
                200,
                Math.min(560, startW - (ev.clientX - startX)),
            );
        },
        onUp: () => {
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        },
    });
};
</script>

<template>
    <div
        v-if="open"
        class="relative flex h-full flex-shrink-0 flex-col overflow-hidden border-l border-slate-200 bg-white"
        :style="{ width: width + 'px' }"
    >
        <!-- 左缘拖拽条（触控热区加大） -->
        <div
            class="absolute inset-y-0 left-0 z-20 w-1 cursor-col-resize touch-none bg-transparent"
            title="拖拽调节面板宽度"
            @pointerdown.prevent="onDragStart"
        >
            <div
                class="absolute inset-y-0 -left-2 -right-2 cursor-col-resize"
            />
        </div>

        <!-- 标签栏 -->
        <div
            class="flex h-8 flex-shrink-0 items-stretch border-b border-slate-200 bg-slate-50/80 select-none pl-1"
        >
            <div class="flex min-w-0 flex-1 items-stretch overflow-x-auto">
                <button
                    v-for="t in tabs"
                    :key="t.id"
                    type="button"
                    class="btn-touch relative flex items-center px-3 text-[11px] font-semibold tracking-wide transition-colors"
                    :class="
                        activeTab === t.id
                            ? 'bg-white text-zx-primary'
                            : 'text-zx-text-subtle hover:text-zx-text-muted'
                    "
                    @click="activeTab = t.id"
                >
                    <span class="uppercase">{{ t.label }}</span>
                    <span
                        v-if="activeTab === t.id"
                        class="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-zx-primary"
                    />
                </button>
            </div>
            <div class="flex flex-shrink-0 items-center px-1">
                <button
                    type="button"
                    class="btn-touch flex h-6 w-6 cursor-pointer items-center justify-center rounded text-zx-text-subtle transition-colors hover:bg-slate-200/80 hover:text-zx-text"
                    title="关闭面板"
                    @click="emit('close')"
                >
                    <X class="h-3.5 w-3.5" />
                </button>
            </div>
        </div>

        <!-- 内容 -->
        <div class="min-h-0 flex-1 overflow-hidden bg-white text-xs">
            <template v-if="activeTab === 'sql'">
                <SqlResultsPanel
                    v-if="mode === 'sql' && wb"
                    :wb="wb"
                    class="h-full"
                />
                <div
                    v-else
                    class="flex h-full items-center justify-center p-4 text-center text-[11px] text-zx-text-subtle"
                >
                    打开 SQL 文件后可在此运行并查看结果
                </div>
            </template>
            <div
                v-else
                class="h-full overflow-auto px-3 py-2 font-mono text-[11px] leading-5 text-zx-text-muted"
            >
                <p class="text-zx-text-subtle">输出面板暂无内容</p>
            </div>
        </div>
    </div>
</template>
