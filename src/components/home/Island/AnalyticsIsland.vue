<script setup lang="ts">
import { Activity } from "lucide-vue-next";
import { useAnalyticsStore } from "@/store/analytics";
import { storeToRefs } from "pinia";

const analyticsStore = useAnalyticsStore();
const { granularity, selectedQuickRange } = storeToRefs(analyticsStore);

const quickTimeRanges = [
    { label: "1天", value: "1d", hours: 24 },
    { label: "7天", value: "7d", hours: 7 * 24 },
    { label: "30天", value: "30d", hours: 30 * 24 },
    { label: "90天", value: "90d", hours: 90 * 24 },
    { label: "自定义", value: "custom", hours: null },
] as const;

const granularityOptions = [
    { label: "小时", value: "hour" },
    { label: "天", value: "day" },
    { label: "周", value: "week" },
    { label: "月", value: "month" },
] as const;

const handleRangeChange = (range: (typeof quickTimeRanges)[number]) => {
    selectedQuickRange.value = range.value;
    if (range.value === "custom") {
        // 保留当前起止时间，页面会展开自定义选择器
        if (!analyticsStore.startTime || !analyticsStore.endTime) {
            analyticsStore.setDefaultTimeRange(30 * 24);
        }
        return;
    }
    analyticsStore.setDefaultTimeRange(range.hours || 30 * 24);
    analyticsStore.triggerRefresh();
};

const handleGranularityChange = (val: (typeof granularityOptions)[number]["value"]) => {
    granularity.value = val;
    analyticsStore.triggerRefresh();
};
</script>

<template>
    <div class="flex w-full items-center justify-between">
        <div
            class="group flex items-center space-x-3 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm transition-all hover:scale-105"
        >
            <Activity class="h-5 w-5 text-zx-primary" />
            <span class="text-sm font-medium whitespace-nowrap text-slate-700"
                >数据统计</span
            >
        </div>

        <div class="flex items-center space-x-4">
            <div
                class="flex items-center space-x-1 rounded-full border border-slate-200 bg-white p-0.5 shadow-sm"
            >
                <button
                    v-for="range in quickTimeRanges"
                    :key="range.value"
                    type="button"
                    @click="handleRangeChange(range)"
                    class="btn-touch rounded-2xl px-3 py-2 text-xs font-medium whitespace-nowrap transition-all duration-200"
                    :class="[
                        selectedQuickRange === range.value
                            ? 'bg-gray-200 text-gray-700 shadow-sm'
                            : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700',
                    ]"
                >
                    {{ range.label }}
                </button>
            </div>

            <div
                class="flex items-center space-x-1 rounded-full border border-slate-200 bg-white p-0.5 shadow-sm"
            >
                <button
                    v-for="opt in granularityOptions"
                    :key="opt.value"
                    type="button"
                    @click="handleGranularityChange(opt.value)"
                    class="btn-touch rounded-2xl px-3 py-2 text-xs font-medium whitespace-nowrap transition-all duration-200"
                    :class="[
                        granularity === opt.value
                            ? 'bg-gray-200 text-gray-700 shadow-sm'
                            : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700',
                    ]"
                >
                    {{ opt.label }}
                </button>
            </div>
        </div>
    </div>
</template>
