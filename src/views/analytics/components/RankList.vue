<script setup lang="ts">
import { computed } from "vue";
import { ZXNotification } from "@/services/ui";

export interface RankListItem {
    id: string;
    name: string;
    value: number;
    avatar?: string;
    subtitle?: string;
}

const props = withDefaults(
    defineProps<{
        items: RankListItem[];
        loading?: boolean;
        /** 条形纯色：primary / pink / amber */
        tone?: "primary" | "pink" | "amber";
        valueSuffix?: string;
        emptyText?: string;
        max?: number;
    }>(),
    {
        loading: false,
        tone: "primary",
        valueSuffix: "",
        emptyText: "暂无数据",
        max: 10,
    },
);

const displayItems = computed(() => props.items.slice(0, props.max));

const maxValue = computed(() =>
    Math.max(...displayItems.value.map((i) => i.value), 1),
);

const barClass = computed(() => {
    if (props.tone === "pink") return "bg-pink-500";
    if (props.tone === "amber") return "bg-amber-500";
    return "bg-zx-primary";
});

const rankClass = (rank: number) => {
    if (rank === 1) return "bg-yellow-400 text-yellow-900";
    if (rank === 2) return "bg-slate-300 text-slate-700";
    if (rank === 3) return "bg-amber-600 text-white";
    return "bg-slate-100 text-zx-text-muted";
};

const copyId = async (id: string) => {
    if (!id) return;
    try {
        await navigator.clipboard.writeText(id);
        ZXNotification({
            title: "已复制",
            message: id,
            type: "info",
            position: "top-right",
        });
    } catch {
        ZXNotification({
            title: "复制失败",
            message: "浏览器拒绝了剪贴板权限 (っ °Д °;) っ",
            type: "error",
            position: "top-right",
        });
    }
};
</script>

<template>
    <div class="flex min-h-0 flex-col">
        <div
            v-if="loading"
            class="flex flex-1 items-center justify-center py-10"
        >
            <div
                class="h-7 w-7 animate-spin rounded-full border-2 border-zx-primary border-b-transparent"
            ></div>
        </div>

        <ZxEmptyState
            v-else-if="displayItems.length === 0"
            :text="emptyText"
            size="sm"
            class="flex-1 justify-center"
        />

        <ul v-else class="flex flex-col gap-2.5">
            <li v-for="(item, index) in displayItems" :key="item.id">
                <div class="flex items-center gap-2.5">
                    <span
                        class="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md text-[11px] font-bold"
                        :class="rankClass(index + 1)"
                    >
                        {{ index + 1 }}
                    </span>

                    <ZxAvatar
                        :src="item.avatar"
                        :name="item.name"
                        size="sm"
                    />

                    <div class="min-w-0 flex-1">
                        <div class="flex items-baseline justify-between gap-2">
                            <span
                                class="truncate text-sm font-medium text-zx-text-strong"
                                :title="item.name"
                            >
                                {{ item.name }}
                            </span>
                            <span
                                class="flex-shrink-0 text-xs font-semibold tabular-nums text-zx-text"
                            >
                                {{ item.value.toLocaleString() }}{{ valueSuffix }}
                            </span>
                        </div>
                        <div
                            class="mt-1 h-1 overflow-hidden rounded-full bg-slate-100"
                        >
                            <div
                                class="h-full rounded-full transition-all duration-500"
                                :class="barClass"
                                :style="{
                                    width: `${Math.max((item.value / maxValue) * 100, 2)}%`,
                                }"
                            ></div>
                        </div>
                        <button
                            v-if="item.subtitle"
                            type="button"
                            class="mt-0.5 max-w-full truncate text-left text-[11px] text-zx-text-subtle transition-colors hover:text-zx-primary"
                            :title="`点击复制 ${item.subtitle}`"
                            @click="copyId(item.subtitle)"
                        >
                            {{ item.subtitle }}
                        </button>
                    </div>
                </div>
            </li>
        </ul>
    </div>
</template>
