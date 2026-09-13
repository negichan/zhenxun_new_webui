<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { LogEntry } from "@/types/log.types";

const props = defineProps<{
    logs: LogEntry[];
    autoScroll?: boolean;
}>();

// ==================== 固定行高虚拟滚动 ====================
// 日志会以每秒多条的频率持续推送，全量渲染上千行会把主线程拖死：
// 行高锁死为 ROW_HEIGHT、超长消息截断（完整内容放 title），
// 任意时刻只渲染可视窗口 ± OVERSCAN 的行
const ROW_HEIGHT = 24;
const OVERSCAN = 8;

const container = ref<HTMLElement | null>(null);
const scrollTop = ref(0);
const viewportHeight = ref(0);
let resizeObserver: ResizeObserver | null = null;

const totalHeight = computed(() => props.logs.length * ROW_HEIGHT);

const startIndex = computed(() =>
    Math.max(0, Math.floor(scrollTop.value / ROW_HEIGHT) - OVERSCAN),
);

const endIndex = computed(() =>
    Math.min(
        props.logs.length,
        Math.ceil((scrollTop.value + viewportHeight.value) / ROW_HEIGHT) +
            OVERSCAN,
    ),
);

const visibleLogs = computed(() =>
    props.logs.slice(startIndex.value, endIndex.value),
);

const onScroll = () => {
    scrollTop.value = container.value?.scrollTop ?? 0;
};

// 跟随滚动按帧合并：日志高频推送时每条都会触发滚动，逐条瞬跳会让
// 整块可视区域持续抖动（抽搐）。合并到 rAF 后一帧至多滚一次，
// 多条推送在同一帧内折叠为一次跟随
let scrollRaf = 0;

const scrollToBottom = () => {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        const el = container.value;
        if (el) el.scrollTop = el.scrollHeight;
    });
};

onMounted(() => {
    const el = container.value;
    if (el) {
        viewportHeight.value = el.clientHeight;
        resizeObserver = new ResizeObserver(() => {
            viewportHeight.value = el.clientHeight;
        });
        resizeObserver.observe(el);
    }
    if (props.autoScroll) scrollToBottom();
});

onBeforeUnmount(() => {
    if (scrollRaf) cancelAnimationFrame(scrollRaf);
    scrollRaf = 0;
    resizeObserver?.disconnect();
    resizeObserver = null;
});

// flush: post —— 必须等本帧 DOM 高度更新后再读 scrollHeight，
// 否则滚到的是上一次内容的高度，推送时永远差一行
watch(
    () => props.logs.length,
    () => {
        if (props.autoScroll) scrollToBottom();
    },
    { flush: "post" },
);

const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return "";

    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return timestamp;

    const h = String(date.getHours()).padStart(2, "0");
    const m = String(date.getMinutes()).padStart(2, "0");
    const s = String(date.getSeconds()).padStart(2, "0");

    return `${h}:${m}:${s}`;
};

const levelClass = (level: LogEntry["level"]) => {
    switch (level) {
        case "ERROR":
            return "text-red-600";
        case "WARNING":
            return "text-amber-600";
        case "INFO":
            return "text-sky-600";
        case "DEBUG":
            return "text-slate-500";
        default:
            return "text-slate-500";
    }
};
</script>

<template>
    <div
        ref="container"
        class="h-full min-h-0 flex-1 overflow-x-auto overflow-y-auto pr-2 font-mono text-xs sm:pr-5"
        @scroll.passive="onScroll"
    >
        <!-- 内容按真实宽度展开，日志长消息可横向滚动（虚拟滚动的总高/偏移
             按行高计算，与横向宽度无关，不受影响） -->
        <div
            v-if="logs.length === 0"
            class="flex h-full items-center justify-center text-gray-400"
        >
            <span class="text-sm">暂无日志</span>
        </div>

        <div
            v-else
            class="w-fit min-w-full"
            :style="{
                height: `${totalHeight}px`,
                paddingTop: `${startIndex * ROW_HEIGHT}px`,
            }"
        >
            <div
                v-for="(log, i) in visibleLogs"
                :key="log.seq ?? startIndex + i"
                class="grid h-6 w-fit min-w-full grid-cols-[2.5rem_2.6rem_minmax(0,max-content)] items-center gap-1 rounded-lg px-1 text-slate-700 transition-colors hover:bg-slate-200/70 sm:grid-cols-[3rem_3rem_minmax(0,max-content)] sm:gap-1.5 sm:px-2"
            >
                <span class="text-[10px] text-slate-400 tabular-nums">
                    {{ formatTimestamp(log.timestamp) }}
                </span>
                <span
                    :class="levelClass(log.level)"
                    class="flex h-5 items-center justify-center text-[12px] font-semibold"
                >
                    {{ log.level }}
                </span>

                <div class="flex w-fit min-w-full items-center whitespace-nowrap leading-5">
                    <span
                        v-if="log.module"
                        :title="log.module"
                        class="mr-2 max-w-40 shrink-0 truncate text-[12px] font-bold text-violet-500"
                    >
                        {{ log.module }}
                    </span>
                    <span
                        :title="log.message"
                        class="w-fit whitespace-nowrap text-slate-700 select-text"
                    >
                        {{ log.message }}
                    </span>
                </div>
            </div>
        </div>
    </div>
</template>
