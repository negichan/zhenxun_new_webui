<script setup lang="ts" generic="T extends string | number | boolean">
import { computed, markRaw } from "vue";
import type { Component } from "vue";

/**
 * 分段控制器选项项定义
 */
export interface SegmentedOption<V = string | number | boolean> {
    /** 显示文案 */
    label?: string;
    /** 选项值 */
    value: V;
    /** 可选 Lucide 图标组件 */
    icon?: Component;
    /** 可选徽标计数或文案 */
    badge?: string | number;
    /** 是否禁用单个选项 */
    disabled?: boolean;
}

export type RawSegmentedOption<V = string | number | boolean> =
    | V
    | SegmentedOption<V>;

/**
 * 通用分段控制器组件（ZxSegmented）
 * 统一全项目 Tab 切换、时间粒度/周期筛选、视图模式切换控件。
 *
 * 用法：
 *   <ZxSegmented v-model="activeTab" :options="['群组', '好友']" />
 *   <ZxSegmented v-model="viewMode" :options="viewOptions" accent="primary" />
 *   <ZxSegmented v-model="range" :options="rangeOptions" size="sm" block />
 */
interface Props {
    /** 当前绑定值 */
    modelValue: T;
    /** 选项列表（支持对象数组或原始值数组） */
    options: readonly RawSegmentedOption<T>[];
    /** 尺寸档位：sm (紧凑型/表格工具栏) | md (标准型/卡片头部) | lg (宽敞型/主导航) */
    size?: "sm" | "md" | "lg";
    /**
     * 选中态视觉风格：
     * - 'primary': 白底高亮主题色文字（全项目最通用的分段器规范，高对比）
     * - 'neutral': 白底深灰文字
     * - 'filled-primary': 高饱和主题色实底 + 对比白字
     */
    accent?: "primary" | "neutral" | "filled-primary";
    /** 是否撑满父容器宽度（各选项等宽均分） */
    block?: boolean;
    /** 是否整体禁用 */
    disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    size: "md",
    accent: "primary",
    block: false,
    disabled: false,
});

const emit = defineEmits<{
    (e: "update:modelValue", val: T): void;
    (e: "change", val: T): void;
}>();

// 标准化 options 为统一对象结构
const normalizedOptions = computed<SegmentedOption<T>[]>(() => {
    return props.options.map((opt) => {
        if (typeof opt === "object" && opt !== null && "value" in opt) {
            return {
                ...opt,
                icon: opt.icon ? markRaw(opt.icon) : undefined,
            } as SegmentedOption<T>;
        }
        return {
            label: String(opt),
            value: opt as T,
        };
    });
});

const handleSelect = (option: SegmentedOption<T>) => {
    if (props.disabled || option.disabled) return;
    if (props.modelValue !== option.value) {
        emit("update:modelValue", option.value);
        emit("change", option.value);
    }
};

/** 容器尺寸样式 */
const containerSizeClasses = computed(() => {
    switch (props.size) {
        case "sm":
            return "p-0.5 rounded-xl gap-0.5 text-xs";
        case "lg":
            return "p-1.5 rounded-2xl gap-1 text-sm sm:text-base";
        case "md":
        default:
            return "p-1 rounded-2xl gap-1 text-xs sm:text-sm";
    }
});

/** 选项按钮尺寸样式 */
const itemSizeClasses = computed(() => {
    switch (props.size) {
        case "sm":
            return "px-2.5 py-1 rounded-lg gap-1.5";
        case "lg":
            return "px-4 py-2 rounded-xl gap-2";
        case "md":
        default:
            return "px-3 py-1.5 rounded-xl gap-1.5";
    }
});

/** 图标尺寸 */
const iconSizeClasses = computed(() => {
    switch (props.size) {
        case "sm":
            return "h-3.5 w-3.5";
        case "lg":
            return "h-4.5 w-4.5";
        case "md":
        default:
            return "h-4 w-4";
    }
});

/** 选中态样式 */
const activeClasses = computed(() => {
    switch (props.accent) {
        case "neutral":
            return "bg-white text-slate-800 shadow-sm font-semibold";
        case "filled-primary":
            return "bg-zx-primary text-[color:var(--zx-color-on-primary)] shadow-sm font-semibold";
        case "primary":
        default:
            return "bg-white text-zx-primary shadow-sm font-semibold";
    }
});

/** 未选中态样式 */
const inactiveClasses = computed(() => {
    return "text-slate-500 hover:text-slate-700 font-medium";
});
</script>

<template>
    <div
        role="tablist"
        class="inline-flex items-center select-none bg-slate-100 transition-colors"
        :class="[
            containerSizeClasses,
            block ? 'flex w-full' : 'inline-flex',
            disabled ? 'opacity-50 cursor-not-allowed' : '',
        ]"
    >
        <button
            v-for="(option, index) in normalizedOptions"
            :key="String(option.value)"
            type="button"
            role="tab"
            :aria-selected="modelValue === option.value"
            :disabled="disabled || option.disabled"
            class="btn-touch relative flex items-center justify-center transition-all duration-200"
            :class="[
                itemSizeClasses,
                block ? 'flex-1 min-w-0' : '',
                option.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
                modelValue === option.value ? activeClasses : inactiveClasses,
            ]"
            @click="handleSelect(option)"
        >
            <slot
                name="item"
                :option="option"
                :selected="modelValue === option.value"
                :index="index"
            >
                <!-- 图标 -->
                <component
                    :is="option.icon"
                    v-if="option.icon"
                    class="flex-shrink-0 transition-colors"
                    :class="[
                        iconSizeClasses,
                        modelValue === option.value
                            ? accent === 'filled-primary'
                                ? 'text-inherit'
                                : 'text-zx-primary'
                            : 'text-slate-400',
                    ]"
                />

                <!-- 文案 -->
                <span class="truncate">
                    <slot
                        name="label"
                        :option="option"
                        :selected="modelValue === option.value"
                        :index="index"
                    >
                        {{ option.label ?? option.value }}
                    </slot>
                </span>

                <!-- 徽标 / 计数 -->
                <span
                    v-if="option.badge !== undefined && option.badge !== null"
                    class="ml-0.5 inline-flex items-center justify-center rounded-full px-1.5 py-0.2 text-[10px] font-bold leading-tight tabular-nums transition-colors"
                    :class="[
                        modelValue === option.value
                            ? accent === 'filled-primary'
                                ? 'bg-white/20 text-inherit'
                                : 'bg-zx-primary-soft text-zx-primary'
                            : 'bg-slate-200/80 text-slate-500',
                    ]"
                >
                    {{ option.badge }}
                </span>
            </slot>
        </button>
    </div>
</template>
