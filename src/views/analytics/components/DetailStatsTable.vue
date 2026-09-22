<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ZXNotification } from "@/services/ui";
import ZxButton from "@/components/zxcomponent/ZxButton.vue";
import type {
    FriendStatistics,
    GroupStatistics,
} from "@/types/api-next.types";

const props = defineProps<{
    groups: GroupStatistics[];
    friends: FriendStatistics[];
    loading?: boolean;
}>();

type TabKey = "groups" | "friends";
type SortKey = "message_count" | "plugin_call_count";

const activeTab = ref<TabKey>("groups");
const tabOptions = computed(() => [
    { label: "群组", value: "groups" as const, badge: props.groups.length },
    { label: "好友", value: "friends" as const, badge: props.friends.length },
]);
const searchQuery = ref("");
const sortKey = ref<SortKey>("message_count");
const currentPage = ref(1);
const pageSize = 10;

watch([activeTab, searchQuery, sortKey], () => {
    currentPage.value = 1;
});

const sortRows = <T extends { message_count: number; plugin_call_count: number }>(
    list: T[],
) =>
    [...list].sort((a, b) => {
        const key = sortKey.value;
        return b[key] - a[key];
    });

const filteredGroups = computed(() => {
    const q = searchQuery.value.trim().toLowerCase();
    const sorted = sortRows(props.groups);
    if (!q) return sorted;
    return sorted.filter(
        (g) =>
            g.group_name.toLowerCase().includes(q) || g.group_id.includes(q),
    );
});

const filteredFriends = computed(() => {
    const q = searchQuery.value.trim().toLowerCase();
    const sorted = sortRows(props.friends);
    if (!q) return sorted;
    return sorted.filter(
        (f) => f.user_name.toLowerCase().includes(q) || f.user_id.includes(q),
    );
});

const rows = computed(() =>
    activeTab.value === "groups" ? filteredGroups.value : filteredFriends.value,
);

const totalMessages = computed(() =>
    rows.value.reduce((sum, r) => sum + r.message_count, 0),
);

const totalCalls = computed(() =>
    rows.value.reduce((sum, r) => sum + r.plugin_call_count, 0),
);

const totalPages = computed(() =>
    Math.max(1, Math.ceil(rows.value.length / pageSize)),
);

const paginatedRows = computed(() => {
    const start = (currentPage.value - 1) * pageSize;
    return rows.value.slice(start, start + pageSize);
});

const rangeText = computed(() => {
    if (rows.value.length === 0) return "暂无数据";
    const start = (currentPage.value - 1) * pageSize + 1;
    const end = Math.min(currentPage.value * pageSize, rows.value.length);
    return `显示 ${start}-${end} / 共 ${rows.value.length} 条`;
});

const messageShare = (count: number) => {
    if (totalMessages.value === 0) return 0;
    return (count / totalMessages.value) * 100;
};

const goPage = (page: number) => {
    currentPage.value = Math.min(Math.max(1, page), totalPages.value);
};

const toggleSort = (key: SortKey) => {
    sortKey.value = key;
};

const exportCsv = () => {
    if (rows.value.length === 0) {
        ZXNotification({
            title: "导出失败",
            message: "当前没有可导出的数据 (っ °Д °;) っ",
            type: "error",
            position: "top-right",
        });
        return;
    }

    const isGroup = activeTab.value === "groups";
    const header = ["排名", isGroup ? "群组名称" : "用户名称", "ID", "消息数", "插件调用", "消息占比%"];
    const body = rows.value.map((row, index) => {
        const name = isGroup
            ? (row as GroupStatistics).group_name
            : (row as FriendStatistics).user_name;
        const id = isGroup
            ? (row as GroupStatistics).group_id
            : (row as FriendStatistics).user_id;
        return [
            String(index + 1),
            `"${name.replace(/"/g, '""')}"`,
            id,
            String(row.message_count),
            String(row.plugin_call_count),
            messageShare(row.message_count).toFixed(1),
        ].join(",");
    });

    const csv = ["﻿" + header.join(","), ...body].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${activeTab.value}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    ZXNotification({
        title: "已导出",
        message: `analytics-${activeTab.value}.csv`,
        type: "info",
        position: "top-right",
    });
};
</script>

<template>
    <div class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div
            class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
            <div class="flex items-center gap-3">
                <h3 class="text-sm font-semibold text-zx-text-strong sm:text-base">
                    明细统计
                </h3>
                <ZxSegmented
                    v-model="activeTab"
                    :options="tabOptions"
                    size="sm"
                />
            </div>

            <div class="flex flex-wrap items-center gap-2">
                <div class="w-full sm:w-48">
                    <ZxSearchInput
                        v-model="searchQuery"
                        :placeholder="
                            activeTab === 'groups' ? '搜索群名 / 群号' : '搜索昵称 / QQ'
                        "
                        size="sm"
                    />
                </div>
                <ZxButton variant="outline" size="sm" :disabled="loading" @click="exportCsv">
                    导出
                </ZxButton>
            </div>
        </div>

        <div class="mb-3 flex flex-wrap items-center gap-3 text-xs text-zx-text-muted">
            <span>合计消息 {{ totalMessages.toLocaleString() }}</span>
            <span>合计调用 {{ totalCalls.toLocaleString() }}</span>
            <div class="flex items-center gap-1">
                <span>排序</span>
                <button
                    type="button"
                    class="btn-touch rounded-md px-2 py-0.5 font-medium transition-colors"
                    :class="
                        sortKey === 'message_count'
                            ? 'bg-zx-primary-soft text-zx-primary'
                            : 'text-zx-text-muted hover:text-zx-text'
                    "
                    @click="toggleSort('message_count')"
                >
                    按消息
                </button>
                <button
                    type="button"
                    class="btn-touch rounded-md px-2 py-0.5 font-medium transition-colors"
                    :class="
                        sortKey === 'plugin_call_count'
                            ? 'bg-zx-primary-soft text-zx-primary'
                            : 'text-zx-text-muted hover:text-zx-text'
                    "
                    @click="toggleSort('plugin_call_count')"
                >
                    按调用
                </button>
            </div>
        </div>

        <div v-if="loading" class="flex items-center justify-center py-12">
            <div
                class="h-7 w-7 animate-spin rounded-full border-2 border-zx-primary border-b-transparent"
            ></div>
        </div>

        <ZxEmptyState
            v-else-if="rows.length === 0"
            :text="searchQuery ? '没有匹配的记录' : '该时间范围内暂无明细'"
            :sub-text="searchQuery ? '请尝试更换搜索关键字或切换群组/好友' : '可尝试切换上方时间范围进行查看'"
            size="md"
        />

        <template v-else>
            <div class="overflow-x-auto">
                <table class="w-full min-w-[640px] table-fixed text-sm">
                    <thead>
                        <tr class="border-b border-slate-200">
                            <th class="w-12 px-2 py-2 text-left text-xs font-medium text-zx-text-muted">
                                #
                            </th>
                            <th class="px-2 py-2 text-left text-xs font-medium text-zx-text-muted">
                                {{ activeTab === "groups" ? "群组" : "用户" }}
                            </th>
                            <th class="w-36 px-2 py-2 text-left text-xs font-medium text-zx-text-muted">
                                ID
                            </th>
                            <th
                                class="cursor-pointer select-none px-2 py-2 text-right text-xs font-medium transition-colors"
                                :class="
                                    sortKey === 'message_count'
                                        ? 'text-zx-primary'
                                        : 'text-zx-text-muted hover:text-zx-text'
                                "
                                @click="toggleSort('message_count')"
                            >
                                消息
                            </th>
                            <th
                                class="cursor-pointer select-none px-2 py-2 text-right text-xs font-medium transition-colors"
                                :class="
                                    sortKey === 'plugin_call_count'
                                        ? 'text-zx-primary'
                                        : 'text-zx-text-muted hover:text-zx-text'
                                "
                                @click="toggleSort('plugin_call_count')"
                            >
                                调用
                            </th>
                            <th class="w-36 px-2 py-2 text-right text-xs font-medium text-zx-text-muted">
                                占比
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="(row, index) in paginatedRows"
                            :key="
                                activeTab === 'groups'
                                    ? (row as GroupStatistics).group_id
                                    : (row as FriendStatistics).user_id
                            "
                            class="border-b border-slate-100 transition-colors hover:bg-slate-50"
                        >
                            <td class="px-2 py-2 text-xs tabular-nums text-zx-text-subtle">
                                {{ index + 1 + (currentPage - 1) * pageSize }}
                            </td>
                            <td class="px-2 py-2">
                                <div class="flex items-center gap-2">
                                    <img
                                        v-if="row.ava_url"
                                        :src="row.ava_url"
                                        alt=""
                                        class="h-6 w-6 flex-shrink-0 rounded-full object-cover"
                                    />
                                    <span
                                        class="truncate font-medium text-zx-text-strong"
                                        :title="
                                            activeTab === 'groups'
                                                ? (row as GroupStatistics).group_name
                                                : (row as FriendStatistics).user_name
                                        "
                                    >
                                        {{
                                            activeTab === "groups"
                                                ? (row as GroupStatistics).group_name
                                                : (row as FriendStatistics).user_name
                                        }}
                                    </span>
                                </div>
                            </td>
                            <td class="truncate px-2 py-2 text-xs tabular-nums text-zx-text-muted">
                                {{
                                    activeTab === "groups"
                                        ? (row as GroupStatistics).group_id
                                        : (row as FriendStatistics).user_id
                                }}
                            </td>
                            <td class="px-2 py-2 text-right font-medium tabular-nums text-zx-text">
                                {{ row.message_count.toLocaleString() }}
                            </td>
                            <td class="px-2 py-2 text-right font-medium tabular-nums text-zx-text">
                                {{ row.plugin_call_count.toLocaleString() }}
                            </td>
                            <td class="px-2 py-2">
                                <div class="flex items-center justify-end gap-2">
                                    <div class="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            class="h-full rounded-full bg-zx-primary"
                                            :style="{
                                                width: `${messageShare(row.message_count)}%`,
                                            }"
                                        ></div>
                                    </div>
                                    <span class="w-10 text-right text-xs tabular-nums text-zx-text-muted">
                                        {{ messageShare(row.message_count).toFixed(1) }}%
                                    </span>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div
                v-if="totalPages > 1"
                class="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between"
            >
                <div class="text-xs text-zx-text-subtle">{{ rangeText }}</div>
                <div class="flex items-center gap-1">
                    <ZxButton
                        variant="outline"
                        size="sm"
                        :disabled="currentPage === 1"
                        @click="goPage(1)"
                    >
                        首页
                    </ZxButton>
                    <ZxButton
                        variant="outline"
                        size="sm"
                        :disabled="currentPage === 1"
                        @click="goPage(currentPage - 1)"
                    >
                        上一页
                    </ZxButton>
                    <span class="px-2 text-xs tabular-nums text-zx-text-muted">
                        {{ currentPage }} / {{ totalPages }}
                    </span>
                    <ZxButton
                        variant="outline"
                        size="sm"
                        :disabled="currentPage >= totalPages"
                        @click="goPage(currentPage + 1)"
                    >
                        下一页
                    </ZxButton>
                    <ZxButton
                        variant="outline"
                        size="sm"
                        :disabled="currentPage >= totalPages"
                        @click="goPage(totalPages)"
                    >
                        末页
                    </ZxButton>
                </div>
            </div>
        </template>
    </div>
</template>
