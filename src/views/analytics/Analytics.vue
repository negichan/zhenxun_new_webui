<script setup lang="ts">
import { computed, onActivated, onMounted, ref, watch } from "vue";
import { Bar } from "vue-chartjs";
import {
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    type ChartDataset,
    type ChartOptions,
    Filler,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    Title,
    Tooltip,
} from "chart.js";
import { RefreshCw, TrendingDown, TrendingUp } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import { analyticsApi, mainApi } from "@/utils/api-next";
import { ZXNotification } from "@/services/ui";
import { useGlobalStore } from "@/store/global";
import { useAnalyticsStore } from "@/store/analytics";
import type { ActiveGroup, HotPlugin } from "@/types/main.types";
import type {
    AnalyticsOverview,
    FavorabilityRank,
    FriendStatistics,
    GoldRank,
    Granularity,
    GroupStatistics,
    MessageHeatmap,
    TrendData,
} from "@/types/api-next.types";
import { createBarOptions, getChartColors } from "@/utils/chart-theme";
import ZxButton from "@/components/zxcomponent/ZxButton.vue";
import RankList, { type RankListItem } from "./components/RankList.vue";
import DetailStatsTable from "./components/DetailStatsTable.vue";
import ActivityHeatmap from "./components/ActivityHeatmap.vue";
import FunnelBarList from "./components/FunnelBarList.vue";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    BarElement,
);

const globalStore = useGlobalStore();
const analyticsStore = useAnalyticsStore();
const { startTime, endTime, granularity, selectedQuickRange, refreshSignal } =
    storeToRefs(analyticsStore);

// ==================== 时间范围 ====================
const quickTimeRanges = [
    { label: "1天", value: "1d", hours: 24 },
    { label: "7天", value: "7d", hours: 7 * 24 },
    { label: "30天", value: "30d", hours: 30 * 24 },
    { label: "90天", value: "90d", hours: 90 * 24 },
    { label: "自定义", value: "custom", hours: null },
] as const;

const granularityOptions = [
    { label: "小时", value: "hour" as Granularity },
    { label: "天", value: "day" as Granularity },
    { label: "周", value: "week" as Granularity },
    { label: "月", value: "month" as Granularity },
] as const;

const showCustomRange = computed(() => selectedQuickRange.value === "custom");

const formatLocalIso = (date: Date): string => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const startTimeLocal = computed({
    get: () => (startTime.value || "").slice(0, 19),
    set: (v: string) => {
        startTime.value = v ? (v.length === 16 ? `${v}:00` : v) : "";
    },
});

const endTimeLocal = computed({
    get: () => (endTime.value || "").slice(0, 19),
    set: (v: string) => {
        endTime.value = v ? (v.length === 16 ? `${v}:00` : v) : "";
    },
});

const rangeLabel = computed(() => {
    if (!startTime.value || !endTime.value) return "";
    const start = startTime.value.slice(0, 10);
    const end = endTime.value.slice(0, 10);
    const days = Math.max(
        1,
        Math.round(
            (new Date(endTime.value).getTime() -
                new Date(startTime.value).getTime()) /
                86400000,
        ),
    );
    return `${start} ~ ${end}`;
});

const handleQuickRange = (range: (typeof quickTimeRanges)[number]) => {
    selectedQuickRange.value = range.value;
    if (range.value === "custom") {
        if (!startTime.value || !endTime.value) {
            analyticsStore.setDefaultTimeRange(30 * 24);
        }
        return;
    }
    analyticsStore.setDefaultTimeRange(range.hours || 30 * 24);
    void refreshAll();
};

const handleGranularity = (value: Granularity) => {
    granularity.value = value;
    void loadTrendData();
};

const applyCustomRange = () => {
    if (!startTime.value || !endTime.value) {
        ZXNotification({
            title: "呜呼～",
            message: "请先选择起止时间 (っ °Д °;) っ",
            type: "😭",
            position: "top-right",
        });
        return;
    }
    if (new Date(startTime.value) >= new Date(endTime.value)) {
        ZXNotification({
            title: "呜呼～",
            message: "起始时间要早于结束时间 (っ °Д °;) っ",
            type: "😭",
            position: "top-right",
        });
        return;
    }
    const diffHours =
        (new Date(endTime.value).getTime() -
            new Date(startTime.value).getTime()) /
        3600000;
    if (diffHours > 7 * 24 && granularity.value === "hour") {
        granularity.value = "day";
    }
    void refreshAll();
};

// ==================== 加载状态 ====================
const isOverviewLoading = ref(false);
const isTrendLoading = ref(false);
const isRankLoading = ref(false);
const isDetailLoading = ref(false);
const isEconomyLoading = ref(false);
const isHeatmapLoading = ref(false);

const isRefreshing = computed(
    () =>
        isOverviewLoading.value ||
        isTrendLoading.value ||
        isRankLoading.value ||
        isDetailLoading.value ||
        isEconomyLoading.value ||
        isHeatmapLoading.value,
);

// ==================== 数据 ====================
const overview = ref<AnalyticsOverview | null>(null);
const trendData = ref<TrendData | null>(null);
const prevTrendData = ref<TrendData | null>(null);
const heatmap = ref<MessageHeatmap | null>(null);
const groupStats = ref<GroupStatistics[]>([]);
const friendStats = ref<FriendStatistics[]>([]);
const activeGroups = ref<ActiveGroup[]>([]);
const hotPlugins = ref<HotPlugin[]>([]);
const favorability = ref<FavorabilityRank[]>([]);
const goldRanks = ref<GoldRank[]>([]);

const showMessages = ref(true);
const showCalls = ref(true);
const showPrevPeriod = ref(true);

const toggleSeries = (series: "msg" | "call") => {
    if (series === "msg") {
        if (showMessages.value && !showCalls.value) return;
        showMessages.value = !showMessages.value;
    } else {
        if (showCalls.value && !showMessages.value) return;
        showCalls.value = !showCalls.value;
    }
};

// ==================== KPI（参考图3：标签 + 环比 + 大数字 + 对比说明） ====================
const kpiCards = computed(() => {
    const o = overview.value;
    const trend = trendData.value;
    const messageCount = o?.message_count ?? trend?.total_message_count ?? null;
    const callCount =
        o?.plugin_call_count ?? trend?.total_plugin_call_count ?? null;
    const points = trend?.data_points?.length ?? 0;
    const avgDaily =
        o?.avg_daily_messages ??
        (trend && points > 0
            ? Math.round(trend.total_message_count / points)
            : null);
    const callRate =
        messageCount && callCount !== null
            ? (callCount / messageCount) * 100
            : null;

    const format = (v: number | null) =>
        v === null ? "—" : v.toLocaleString();

    const pct = (curr: number | null, prev: number | null) => {
        if (curr === null || prev === null || !prev) return null;
        return ((curr - prev) / prev) * 100;
    };

    const msgDelta = o
        ? pct(o.message_count, o.prev_message_count)
        : null;
    const callDelta = o
        ? pct(o.plugin_call_count, o.prev_plugin_call_count)
        : null;

    return [
        {
            key: "msg",
            label: "区间消息",
            value: format(messageCount),
            delta: msgDelta,
            hint: o
                ? `${o.active_group_count} 活跃群 · ${o.active_user_count} 活跃用户`
                : "跟随所选时间范围",
        },
        {
            key: "call",
            label: "区间调用",
            value: format(callCount),
            delta: callDelta,
            hint: "插件被触发次数",
        },
        {
            key: "avg",
            label: "日均消息",
            value: format(avgDaily),
            delta: null,
            hint: o?.peak_date ? `峰值日 ${o.peak_date}` : "按数据点均摊",
        },
        {
            key: "rate",
            label: "调用率",
            value: callRate === null ? "—" : `${callRate.toFixed(1)}%`,
            delta: null,
            hint: "调用 / 消息",
        },
    ];
});

const activeGroupItems = computed<RankListItem[]>(() =>
    activeGroups.value.map((g) => ({
        id: g.group_id,
        name: g.name || g.group_id,
        value: g.chat_num,
        avatar: g.ava_img,
        subtitle: g.group_id,
    })),
);

const hotPluginItems = computed<RankListItem[]>(() =>
    hotPlugins.value.map((p) => ({
        id: p.module || p.plugin_name || String(p.call_count),
        name: p.plugin_name || p.module || "未知插件",
        value: p.call_count,
    })),
);

const favorabilityItems = computed<RankListItem[]>(() =>
    favorability.value.map((u) => ({
        id: u.user_id,
        name: u.user_name,
        value: Number(u.favorability),
        avatar: u.ava_url,
        subtitle: u.user_id,
    })),
);

const goldItems = computed<RankListItem[]>(() =>
    goldRanks.value.map((u) => ({
        id: u.user_id,
        name: u.user_name,
        value: Number(u.gold),
        avatar: u.ava_url,
        subtitle: u.user_id,
    })),
);

// ==================== 趋势：本期堆叠柱 + 上期灰线 ====================
const chartColors = getChartColors();

const formatLabel = (timestamp: string) => {
    const date = new Date(timestamp);
    if (granularity.value === "hour") {
        return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:00`;
    }
    if (granularity.value === "week") {
        return `第${Math.ceil(date.getDate() / 7)}周`;
    }
    if (granularity.value === "month") {
        return `${date.getFullYear()}年${date.getMonth() + 1}月`;
    }
    return `${date.getMonth() + 1}/${date.getDate()}`;
};

const chartOptions = computed<ChartOptions<"bar">>(() =>
    createBarOptions({
        plugins: {
            legend: { display: false },
            tooltip: {
                mode: "index",
                intersect: false,
            },
        },
        scales: {
            x: {
                stacked: true,
                grid: { display: false },
                ticks: {
                    maxRotation: 0,
                    autoSkip: true,
                    maxTicksLimit: 12,
                },
            },
            y: {
                stacked: true,
                beginAtZero: true,
                ticks: { precision: 0 },
            },
        },
    }),
);

const chartData = computed(() => {
    if (!trendData.value?.data_points?.length) return null;
    const labels = trendData.value.data_points.map((p) =>
        formatLabel(p.timestamp),
    );

    const datasets: ChartDataset<"bar" | "line">[] = [];

    if (showMessages.value) {
        datasets.push({
            type: "bar",
            label: "消息",
            data: trendData.value.data_points.map((p) => p.message_count),
            backgroundColor: chartColors.blue.solid,
            borderRadius: 0,
            borderSkipped: false,
            maxBarThickness: 28,
            categoryPercentage: 0.72,
            barPercentage: 0.9,
            stack: "curr",
        });
    }
    if (showCalls.value) {
        datasets.push({
            type: "bar",
            label: "调用",
            data: trendData.value.data_points.map((p) => p.plugin_call_count),
            backgroundColor: chartColors.pink.solid,
            borderRadius: showMessages.value
                ? { topLeft: 6, topRight: 6 }
                : 6,
            borderSkipped: false,
            maxBarThickness: 28,
            categoryPercentage: 0.72,
            barPercentage: 0.9,
            stack: "curr",
        });
    }

    if (showPrevPeriod.value && prevTrendData.value?.data_points?.length) {
        const prevPoints = prevTrendData.value.data_points;
        // 对齐点数：多退少补 null，线会断开但不串位
        const aligned = trendData.value.data_points.map((_, i) => {
            const p = prevPoints[i];
            if (!p) return null;
            if (showMessages.value && showCalls.value) {
                return p.message_count + p.plugin_call_count;
            }
            if (showMessages.value) return p.message_count;
            return p.plugin_call_count;
        });
        datasets.push({
            type: "line",
            label: "上期",
            data: aligned,
            borderColor: chartColors.slate.solid,
            backgroundColor: "transparent",
            borderWidth: 2,
            borderDash: [5, 4],
            pointRadius: 0,
            pointHoverRadius: 4,
            tension: 0.3,
            fill: false,
            order: 0,
        });
    }

    return {
        labels,
        // 混合 bar + line：放宽为 bar ChartData 以通过 vue-chartjs 类型
        datasets: datasets as unknown as ChartDataset<"bar">[],
    };
});

// ==================== API ====================
const loadOverview = async () => {
    try {
        isOverviewLoading.value = true;
        const res = await analyticsApi.getOverview({
            start_time: startTime.value,
            end_time: endTime.value,
        });
        if (res?.success && res?.data) overview.value = res.data;
    } catch (error) {
        console.error("加载区间概览失败:", error);
    } finally {
        isOverviewLoading.value = false;
    }
};

const loadTrendData = async () => {
    try {
        isTrendLoading.value = true;
        const start = new Date(startTime.value);
        const end = new Date(endTime.value);
        const span = Math.max(end.getTime() - start.getTime(), 3600000);
        const prevStart = new Date(start.getTime() - span);
        const prevEnd = start;

        const [currRes, prevRes] = await Promise.all([
            analyticsApi.getTrendData({
                start_time: startTime.value,
                end_time: endTime.value,
                granularity: granularity.value as Granularity,
            }),
            analyticsApi.getTrendData({
                start_time: formatLocalIso(prevStart),
                end_time: formatLocalIso(prevEnd),
                granularity: granularity.value as Granularity,
            }),
        ]);
        if (currRes?.success && currRes?.data) trendData.value = currRes.data;
        if (prevRes?.success && prevRes?.data) prevTrendData.value = prevRes.data;
    } catch (error) {
        console.error("加载趋势数据失败:", error);
        ZXNotification({
            title: "呜呼～",
            message: "趋势数据加载失败了 (っ °Д °;) っ",
            type: "😭",
            position: "top-right",
        });
    } finally {
        isTrendLoading.value = false;
    }
};

const loadHeatmap = async () => {
    try {
        isHeatmapLoading.value = true;
        const res = await analyticsApi.getHeatmap({
            start_time: startTime.value,
            end_time: endTime.value,
        });
        if (res?.success && res?.data) heatmap.value = res.data;
    } catch (error) {
        console.error("加载热力图失败:", error);
    } finally {
        isHeatmapLoading.value = false;
    }
};

const loadDetailStatistics = async () => {
    try {
        isDetailLoading.value = true;
        const res = await analyticsApi.getStatistics({
            start_time: startTime.value,
            end_time: endTime.value,
        });
        if (res?.success && res?.data) {
            groupStats.value = res.data.groups ?? [];
            friendStats.value = res.data.friends ?? [];
        }
    } catch (error) {
        console.error("加载明细统计失败:", error);
    } finally {
        isDetailLoading.value = false;
    }
};

const loadRankData = async () => {
    try {
        isRankLoading.value = true;
        const [groupRes, pluginRes] = await Promise.all([
            mainApi.getActiveGroups(
                undefined,
                undefined,
                startTime.value,
                endTime.value,
            ),
            mainApi.getHotPlugins(
                undefined,
                undefined,
                startTime.value,
                endTime.value,
            ),
        ]);
        if (groupRes?.success && groupRes?.data) {
            activeGroups.value = groupRes.data;
        }
        if (pluginRes?.success && pluginRes?.data) {
            hotPlugins.value = pluginRes.data as HotPlugin[];
        }
    } catch (error) {
        console.error("加载榜单失败:", error);
    } finally {
        isRankLoading.value = false;
    }
};

const loadEconomy = async () => {
    try {
        isEconomyLoading.value = true;
        const [favRes, goldRes] = await Promise.all([
            analyticsApi.getFavorabilityTop10(),
            analyticsApi.getGoldTop10(),
        ]);
        if (favRes?.success && favRes?.data) favorability.value = favRes.data;
        if (goldRes?.success && goldRes?.data) goldRanks.value = goldRes.data;
    } catch (error) {
        console.error("加载经济榜单失败:", error);
    } finally {
        isEconomyLoading.value = false;
    }
};

const refreshAll = async () => {
    if (!startTime.value || !endTime.value) {
        analyticsStore.setDefaultTimeRange(30 * 24);
    }
    await Promise.all([
        loadOverview(),
        loadTrendData(),
        loadHeatmap(),
        loadDetailStatistics(),
        loadRankData(),
    ]);
};

const refreshManual = async () => {
    await Promise.all([refreshAll(), loadEconomy()]);
};

watch(refreshSignal, () => {
    void refreshAll();
});

onMounted(() => {
    void refreshManual();
});

onActivated(() => {
    if (overview.value) {
        void refreshAll();
    }
});
</script>

<template>
    <div class="flex h-full w-full flex-col gap-3 overflow-y-auto sm:gap-4">
        <!-- 工具栏 -->
        <div
            v-if="!globalStore.isDesktopMode || showCustomRange"
            class="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"
        >
            <div
                class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
                <div
                    v-if="!globalStore.isDesktopMode"
                    class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3"
                >
                    <div class="flex items-center gap-1 rounded-2xl border bg-gray-100 p-1">
                        <button
                            v-for="range in quickTimeRanges"
                            :key="range.value"
                            type="button"
                            class="btn-touch rounded-xl px-3 py-1.5 text-xs font-medium transition-all"
                            :class="
                                selectedQuickRange === range.value
                                    ? 'bg-white text-zx-primary shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            "
                            @click="handleQuickRange(range)"
                        >
                            {{ range.label }}
                        </button>
                    </div>
                    <div class="flex items-center gap-1 rounded-2xl border bg-gray-100 p-1">
                        <button
                            v-for="opt in granularityOptions"
                            :key="opt.value"
                            type="button"
                            class="btn-touch rounded-xl px-3 py-1.5 text-xs font-medium transition-all"
                            :class="
                                granularity === opt.value
                                    ? 'bg-white text-zx-primary shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            "
                            @click="handleGranularity(opt.value)"
                        >
                            {{ opt.label }}
                        </button>
                    </div>
                </div>

                <div
                    v-if="showCustomRange"
                    class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3"
                >
                    <label class="flex items-center gap-2 text-sm text-zx-text-muted">
                        起始
                        <input
                            v-model="startTimeLocal"
                            type="datetime-local"
                            step="1"
                            class="w-[190px] rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-zx-text transition-colors focus:bg-white focus:outline-none"
                        />
                    </label>
                    <label class="flex items-center gap-2 text-sm text-zx-text-muted">
                        结束
                        <input
                            v-model="endTimeLocal"
                            type="datetime-local"
                            step="1"
                            class="w-[190px] rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-zx-text transition-colors focus:bg-white focus:outline-none"
                        />
                    </label>
                    <ZxButton size="sm" @click="applyCustomRange">应用</ZxButton>
                </div>

                <div class="flex items-center gap-3">
                    <span v-if="rangeLabel" class="text-xs text-zx-text-subtle">
                        {{ rangeLabel }}
                    </span>
                    <ZxButton
                        variant="ghost"
                        size="sm"
                        :disabled="isRefreshing"
                        @click="refreshManual"
                    >
                        <RefreshCw
                            class="h-4 w-4"
                            :class="isRefreshing ? 'animate-spin' : ''"
                        />
                        刷新
                    </ZxButton>
                </div>
            </div>
        </div>

        <div v-else class="flex items-center justify-end gap-3 px-1">
            <span v-if="rangeLabel" class="text-xs text-zx-text-subtle">
                {{ rangeLabel }}
            </span>
            <ZxButton
                variant="ghost"
                size="sm"
                :disabled="isRefreshing"
                @click="refreshManual"
            >
                <RefreshCw
                    class="h-4 w-4"
                    :class="isRefreshing ? 'animate-spin' : ''"
                />
                刷新
            </ZxButton>
        </div>

        <!-- 顶部：榜单 ×2 + 右侧竖排 KPI，填满高度 -->
        <div
            class="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_minmax(200px,240px)]"
        >
            <div
                class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
            >
                <div class="mb-3 flex items-baseline justify-between gap-2">
                    <h3 class="text-sm font-semibold text-zx-text-strong">
                        活跃群组
                    </h3>
                    <span class="text-[11px] text-zx-text-subtle">消息</span>
                </div>
                <FunnelBarList
                    :items="activeGroupItems"
                    :loading="isRankLoading"
                    :max="10"
                    list-height="320px"
                    empty-text="暂无活跃群组"
                />
            </div>

            <div
                class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
            >
                <div class="mb-3 flex items-baseline justify-between gap-2">
                    <h3 class="text-sm font-semibold text-zx-text-strong">
                        热门插件
                    </h3>
                    <span class="text-[11px] text-zx-text-subtle">调用</span>
                </div>
                <FunnelBarList
                    :items="hotPluginItems"
                    :loading="isRankLoading"
                    :max="10"
                    list-height="320px"
                    :show-avatar="false"
                    empty-text="暂无插件调用"
                />
            </div>

            <!-- KPI 竖排 4 条，贴满上排高度 -->
            <div
                class="flex flex-col gap-3 md:col-span-2 xl:col-span-1 xl:gap-2"
            >
                <div
                    v-for="card in kpiCards"
                    :key="card.key"
                    class="flex flex-1 flex-col justify-center rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-5"
                >
                    <div class="text-[11px] text-zx-text-muted">
                        {{ card.label }}
                    </div>
                    <div
                        class="mt-0.5 truncate text-xl font-bold tabular-nums text-zx-text-strong sm:text-2xl"
                    >
                        <span
                            v-if="
                                (isOverviewLoading && !overview) ||
                                (isTrendLoading && !trendData)
                            "
                            class="inline-block h-6 w-14 animate-pulse rounded bg-slate-100"
                        ></span>
                        <template v-else>{{ card.value }}</template>
                    </div>
                    <div
                        class="mt-0.5 flex min-h-4 items-center gap-1.5 text-[11px]"
                    >
                        <span
                            v-if="
                                card.delta !== null && card.delta !== undefined
                            "
                            class="inline-flex items-center gap-0.5 font-semibold tabular-nums"
                            :class="
                                card.delta >= 0
                                    ? 'text-emerald-600'
                                    : 'text-rose-500'
                            "
                        >
                            <component
                                :is="
                                    card.delta >= 0 ? TrendingUp : TrendingDown
                                "
                                class="h-3 w-3"
                            />
                            {{ Math.abs(card.delta).toFixed(1) }}%
                        </span>
                        <span
                            v-if="card.hint"
                            class="truncate text-zx-text-subtle"
                        >
                            {{ card.hint }}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <!-- 左：热力图；右：趋势 -->
        <div class="grid grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-[auto_minmax(0,1fr)]">
            <div
                class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
            >
                <div class="mb-1">
                    <h3 class="text-sm font-semibold text-zx-text-strong sm:text-base">
                        消息活跃时段
                    </h3>
                </div>
                <ActivityHeatmap :data="heatmap" :loading="isHeatmapLoading" />
            </div>

            <div
                class="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
            >
                <div
                    class="mb-3 flex flex-wrap items-center justify-between gap-2 sm:mb-4"
                >
                    <div>
                        <h3 class="text-sm font-semibold text-zx-text-strong sm:text-base">
                            消息与调用趋势
                        </h3>
                        <p class="mt-0.5 text-xs text-zx-text-subtle">
                            {{
                                granularityOptions.find((o) => o.value === granularity)
                                    ?.label
                            }}
                            粒度 · 虚线为上一等长周期
                        </p>
                    </div>
                    <div class="flex flex-wrap items-center gap-1.5">
                        <button
                            type="button"
                            class="btn-touch rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
                            :class="
                                showMessages
                                    ? 'border-blue-500 bg-blue-500 text-white'
                                    : 'border-slate-200 text-zx-text-muted hover:border-blue-300'
                            "
                            @click="toggleSeries('msg')"
                        >
                            消息
                        </button>
                        <button
                            type="button"
                            class="btn-touch rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
                            :class="
                                showCalls
                                    ? 'border-pink-500 bg-pink-500 text-white'
                                    : 'border-slate-200 text-zx-text-muted hover:border-pink-300'
                            "
                            @click="toggleSeries('call')"
                        >
                            调用
                        </button>
                        <button
                            type="button"
                            class="btn-touch rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
                            :class="
                                showPrevPeriod
                                    ? 'border-slate-600 bg-slate-600 text-white'
                                    : 'border-slate-200 text-zx-text-muted hover:border-slate-400'
                            "
                            @click="showPrevPeriod = !showPrevPeriod"
                        >
                            上期
                        </button>
                    </div>
                </div>
                <div class="relative h-56 sm:h-72">
                    <div
                        v-if="isTrendLoading"
                        class="absolute inset-0 flex items-center justify-center"
                    >
                        <div
                            class="h-7 w-7 animate-spin rounded-full border-2 border-zx-primary border-b-transparent"
                        ></div>
                    </div>
                    <Bar
                        v-else-if="chartData && chartData.datasets.length > 0"
                        :data="chartData"
                        :options="chartOptions"
                    />
                    <div
                        v-else
                        class="flex h-full items-center justify-center text-sm text-zx-text-subtle"
                    >
                        暂无趋势数据
                    </div>
                </div>
            </div>
        </div>

        <!-- 经济榜 -->
        <div class="grid grid-cols-1 gap-3 lg:grid-cols-2 sm:gap-4">
            <div class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div class="mb-4 flex items-baseline gap-2">
                    <h3 class="text-sm font-semibold text-zx-text-strong sm:text-base">
                        好感度排行
                    </h3>
                    <span class="text-xs text-zx-text-subtle">Top 10</span>
                </div>
                <RankList
                    :items="favorabilityItems"
                    :loading="isEconomyLoading"
                    tone="pink"
                    :max="10"
                    empty-text="暂无好感度数据"
                />
            </div>

            <div class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div class="mb-4 flex items-baseline gap-2">
                    <h3 class="text-sm font-semibold text-zx-text-strong sm:text-base">
                        金币排行
                    </h3>
                    <span class="text-xs text-zx-text-subtle">Top 10</span>
                </div>
                <RankList
                    :items="goldItems"
                    :loading="isEconomyLoading"
                    tone="amber"
                    :max="10"
                    empty-text="暂无金币数据"
                />
            </div>
        </div>

        <!-- 明细表 -->
        <DetailStatsTable
            :groups="groupStats"
            :friends="friendStats"
            :loading="isDetailLoading"
        />
    </div>
</template>
