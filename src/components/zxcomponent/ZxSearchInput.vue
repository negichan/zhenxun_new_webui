<script setup lang="ts">
import { computed } from "vue";
import { CircleX, Search } from "lucide-vue-next";

/**
 * 通用搜索输入框组件（ZxSearchInput）
 * 遵循 DESIGN.md 胶囊风格规范，内置前置搜索图标、快捷清除按钮、焦点过渡态。
 *
 * 用法：
 *   <ZxSearchInput v-model="keyword" placeholder="搜索表名..." size="sm" />
 *   <ZxSearchInput v-model="query" placeholder="搜索成员..." @search="onSearch" />
 */
interface Props {
    /** 绑定值 */
    modelValue: string;
    /** 占位符提示文案 */
    placeholder?: string;
    /** 尺寸：sm (紧凑型/工具栏) | md (标准型/页面头) | lg (突出型) */
    size?: "sm" | "md" | "lg";
    /** 是否支持一键清空 */
    clearable?: boolean;
    /** 是否禁用 */
    disabled?: boolean;
    /** 圆角形态（默认 full 胶囊圆角） */
    rounded?: "full" | "xl" | "2xl";
}

const props = withDefaults(defineProps<Props>(), {
    placeholder: "搜索...",
    size: "md",
    clearable: true,
    disabled: false,
    rounded: "full",
});

const emit = defineEmits<{
    (e: "update:modelValue", val: string): void;
    (e: "search", val: string): void;
    (e: "clear"): void;
}>();

const handleInput = (e: Event) => {
    const val = (e.target as HTMLInputElement).value;
    emit("update:modelValue", val);
};

const handleClear = () => {
    if (props.disabled) return;
    emit("update:modelValue", "");
    emit("clear");
};

const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
        emit("search", props.modelValue);
    }
};

const sizeClasses = computed(() => {
    switch (props.size) {
        case "sm":
            return "h-8 text-xs pl-8 pr-7";
        case "lg":
            return "h-10 text-sm sm:text-base pl-10 pr-9";
        case "md":
        default:
            return "h-9 text-xs sm:text-sm pl-9 pr-8";
    }
});

const iconSizeClasses = computed(() => {
    switch (props.size) {
        case "sm":
            return "h-3.5 w-3.5 left-2.5";
        case "lg":
            return "h-4.5 w-4.5 left-3.5";
        case "md":
        default:
            return "h-4 w-4 left-3";
    }
});

const clearBtnSizeClasses = computed(() => {
    switch (props.size) {
        case "sm":
            return "right-2";
        case "lg":
            return "right-3";
        case "md":
        default:
            return "right-2.5";
    }
});

const roundedClasses = computed(() => {
    switch (props.rounded) {
        case "xl":
            return "rounded-xl";
        case "2xl":
            return "rounded-2xl";
        case "full":
        default:
            return "rounded-full";
    }
});
</script>

<template>
    <div
        class="group relative inline-flex w-full items-center transition-all duration-200"
        :class="[disabled ? 'opacity-50 cursor-not-allowed' : '']"
    >
        <!-- 前置搜索图标 -->
        <Search
            class="pointer-events-none absolute text-slate-400 transition-colors group-focus-within:text-zx-primary"
            :class="iconSizeClasses"
        />

        <!-- 原生输入框 -->
        <input
            type="text"
            :value="modelValue"
            :placeholder="placeholder"
            :disabled="disabled"
            class="w-full border border-slate-200 bg-slate-50 text-zx-text transition-all duration-200 placeholder:text-zx-text-subtle focus:border-zx-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-zx-primary/20"
            :class="[sizeClasses, roundedClasses]"
            @input="handleInput"
            @keydown="handleKeyDown"
        />

        <!-- 一键清除按钮 -->
        <button
            v-if="clearable && modelValue && !disabled"
            type="button"
            class="btn-touch absolute flex items-center justify-center text-slate-400 transition-colors hover:text-slate-600 focus:outline-none"
            :class="clearBtnSizeClasses"
            @click.stop="handleClear"
        >
            <CircleX class="h-3.5 w-3.5" />
        </button>
    </div>
</template>
