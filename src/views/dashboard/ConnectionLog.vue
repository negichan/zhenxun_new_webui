<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { PlugZap } from "lucide-vue-next";
import { useConnectionLogStore } from "@/store/connectionLog.ts";
import { useBotStore } from "@/store/bot";
import { storeToRefs } from "pinia";
import defaultAva from "@/assets/img/avatar.jpg";

const logStore = useConnectionLogStore();
const { entries } = storeToRefs(logStore);
const botStore = useBotStore();

onMounted(() => {
    logStore.load();
});

// 昵称/头像从 bot 列表实时解析（后端只存 bot_id）
const displayEntries = computed(() =>
    entries.value.map((entry) => {
        const bot = botStore.botList.find((b) => b.self_id === entry.botId);
        return {
            ...entry,
            nickname: bot?.nickname?.trim() || entry.botId,
            avaUrl: bot?.ava_url || defaultAva,
        };
    }),
);

// ==================== 固定行高虚拟滚动（与 LogEntries 同款） ====================
// 行高锁死 ROW_HEIGHT，只渲染可视窗口 ± OVERSCAN 的行，几千条也不卡
const ROW_HEIGHT = 60;
const OVERSCAN = 6;

const container = ref<HTMLElement | null>(null);
const scrollTop = ref(0);
const viewportHeight = ref(0);
let resizeObserver: ResizeObserver | null = null;

const totalHeight = computed(
    () => displayEntries.value.length * ROW_HEIGHT,
);

const startIndex = computed(() =>
    Math.max(0, Math.floor(scrollTop.value / ROW_HEIGHT) - OVERSCAN),
);

const endIndex = computed(() =>
    Math.min(
        displayEntries.value.length,
        Math.ceil((scrollTop.value + viewportHeight.value) / ROW_HEIGHT) +
            OVERSCAN,
    ),
);

const visibleEntries = computed(() =>
    displayEntries.value.slice(startIndex.value, endIndex.value),
);

const onScroll = () => {
    scrollTop.value = container.value?.scrollTop ?? 0;
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
});

onBeforeUnmount(() => {
    resizeObserver?.disconnect();
    resizeObserver = null;
});

/** 详细连接时间：2026-09-06 14:32:05 */
function formatTime(time: number) {
    if (!time) return "";
    const d = new Date(time);
    const p = (n: number) => String(n).padStart(2, "0");
    return (
        `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
        `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
    );
}
</script>

<template>
    <div
        v-tile-glow
        class="flex h-full min-h-0 flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
    >
        <div
            class="mb-2 flex shrink-0 items-center gap-2 border-b border-slate-100 pb-4"
        >
            <PlugZap class="h-5 w-5 text-zx-primary" />
            <h3 class="text-sm font-semibold text-gray-700 sm:text-base">
                连接日志
            </h3>
            <span
                v-if="displayEntries.length > 0"
                class="ml-auto rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-400"
            >
                {{ displayEntries.length }}
            </span>
        </div>

        <!-- 虚拟滚动列表 -->
        <div
            v-if="displayEntries.length > 0"
            ref="container"
            class="custom-scrollbar min-h-0 flex-1 overflow-y-auto pr-1"
            @scroll.passive="onScroll"
        >
            <div
                class="relative"
                :style="{ height: `${totalHeight}px` }"
            >
                <div
                    v-for="entry in visibleEntries"
                    :key="entry.id"
                    class="absolute left-0 right-0 flex items-center gap-3.5 rounded-2xl px-2 transition-colors hover:bg-slate-50"
                    :style="{
                        top: `${displayEntries.indexOf(entry) * ROW_HEIGHT}px`,
                        height: `${ROW_HEIGHT}px`,
                    }"
                >
                    <div class="relative shrink-0">
                        <img
                            :src="entry.avaUrl"
                            alt=""
                            class="h-10 w-10 rounded-full object-cover ring-1 ring-slate-200"
                        />
                        <!-- 在线状态角标 -->
                        <span
                            class="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-white"
                            :class="
                                entry.type === 'online'
                                    ? 'bg-zx-success'
                                    : 'bg-zx-danger'
                            "
                        ></span>
                    </div>

                    <div class="min-w-0 flex-1 leading-tight">
                        <p
                            class="truncate text-sm font-semibold leading-5 text-slate-700"
                        >
                            {{ entry.nickname }}
                        </p>
                        <p
                            class="mt-1 truncate text-xs leading-4 text-slate-400"
                        >
                            {{ entry.botId }}
                        </p>
                    </div>

                    <div class="flex shrink-0 flex-col items-end">
                        <span
                            class="flex items-center gap-1.5 text-xs font-medium leading-5"
                            :class="
                                entry.type === 'online'
                                    ? 'text-zx-success'
                                    : 'text-zx-danger'
                            "
                        >
                            <span
                                class="h-1.5 w-1.5 rounded-full"
                                :class="
                                    entry.type === 'online'
                                        ? 'bg-zx-success'
                                        : 'bg-zx-danger'
                                "
                            ></span>
                            {{ entry.type === "online" ? "上线" : "下线" }}
                        </span>
                        <span
                            class="mt-1 text-[11px] leading-4 text-slate-400"
                        >
                            {{ formatTime(entry.time) }}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <p
            v-else
            class="flex flex-1 items-center justify-center text-xs text-[var(--zx-color-text-subtle)]"
        >
            暂无连接记录
        </p>
    </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
    width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
    background: var(--zx-color-border);
    border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: var(--zx-slate-300);
}
.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}
</style>
