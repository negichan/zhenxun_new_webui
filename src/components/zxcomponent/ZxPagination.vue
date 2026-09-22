<script setup lang="ts">
import { computed } from "vue";
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
import ZxButton from "./ZxButton.vue";

/**
 * 通用分页组件（ZxPagination）
 * 统一全项目表格、列表的翻页交互、条数统计与轻量胶囊按钮。
 *
 * 用法：
 *   <ZxPagination v-model="page" :total="totalRows" :page-size="pageSize" />
 *   <ZxPagination :page="page" :total-pages="totalPages" @change-delta="changePage" />
 */
interface Props {
    /** 当前页码（从 1 开始） */
    modelValue?: number;
    /** 别名页码 */
    page?: number;
    /** 数据总量 */
    total?: number;
    /** 总页数（若传入则优先使用） */
    totalPages?: number;
    /** 每页条数 */
    pageSize?: number;
    /** 是否禁用 */
    disabled?: boolean;
    /** 是否显示前置汇总文案 */
    showTotal?: boolean;
    /** 自定义汇总文字 */
    summaryText?: string;
}

const props = withDefaults(defineProps<Props>(), {
    modelValue: 1,
    page: 1,
    total: 0,
    pageSize: 20,
    disabled: false,
    showTotal: true,
    summaryText: "",
});

const emit = defineEmits<{
    (e: "update:modelValue", page: number): void;
    (e: "update:page", page: number): void;
    (e: "change", page: number): void;
    (e: "change-delta", delta: number): void;
}>();

const currentPage = computed(() => {
    return props.page ?? props.modelValue ?? 1;
});

const resolvedTotalPages = computed(() => {
    if (props.totalPages !== undefined) return Math.max(1, props.totalPages);
    return Math.max(1, Math.ceil(props.total / props.pageSize));
});

const pageSummary = computed(() => {
    if (props.summaryText) return props.summaryText;
    if (props.total <= 0) return "共 0 条";
    const start = (currentPage.value - 1) * props.pageSize + 1;
    const end = Math.min(currentPage.value * props.pageSize, props.total);
    return `显示 ${start}-${end} 条，共 ${props.total} 条`;
});

const handlePageChange = (delta: number) => {
    if (props.disabled) return;
    const target = currentPage.value + delta;
    if (target >= 1 && target <= resolvedTotalPages.value) {
        emit("update:modelValue", target);
        emit("update:page", target);
        emit("change", target);
        emit("change-delta", delta);
    }
};
</script>

<template>
    <div
        class="flex flex-shrink-0 items-center justify-between gap-3 text-xs text-slate-500 select-none"
    >
        <!-- 统计摘要 -->
        <slot
            name="summary"
            :total="total"
            :current="currentPage"
            :total-pages="resolvedTotalPages"
            :text="pageSummary"
        >
            <span v-if="showTotal" class="text-xs text-slate-500">
                {{ pageSummary }}
            </span>
            <span v-else />
        </slot>

        <!-- 翻页控制区 -->
        <div class="flex items-center gap-2">
            <ZxButton
                variant="ghost"
                circle
                size="sm"
                :disabled="disabled || currentPage <= 1"
                @click="handlePageChange(-1)"
            >
                <ChevronLeft class="h-4 w-4" />
            </ZxButton>

            <span class="px-1 text-xs font-medium tabular-nums text-slate-600">
                {{ currentPage }} / {{ resolvedTotalPages }}
            </span>

            <ZxButton
                variant="ghost"
                circle
                size="sm"
                :disabled="disabled || currentPage >= resolvedTotalPages"
                @click="handlePageChange(1)"
            >
                <ChevronRight class="h-4 w-4" />
            </ZxButton>
        </div>
    </div>
</template>
