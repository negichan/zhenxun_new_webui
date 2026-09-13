<script setup lang="ts">
import { computed } from "vue";

/**
 * 通用徽标（Tag）——实色底方案（跟随主题）：
 * 底色用主题语义实体色变量（浅色主题为饱和 500 系、深色主题提亮为 400 系），
 * 文字用配套的 on-* 对比色变量（浅色白字、深色深字），深浅主题自动适配，
 * 实色不透。自定义品牌色（color prop）保持实色底 + 亮度自动黑白字。
 *
 * 用法：
 *   <ZxTag variant="success">已启用</ZxTag>   语义档（跟随主题）
 *   <ZxTag color="#8b5cf6">内置</ZxTag>       自定义品牌色（实底）
 */
const props = withDefaults(
    defineProps<{
        /** 自定义品牌色 hex（优先级高于 variant，实色底） */
        color?: string;
        /** 通用语义档（跟随主题变量） */
        variant?: | "neutral"
            | "primary"
            | "success"
            | "warning"
            | "danger"
            | "info"
            | "purple"
            | "cyan";
    }>(),
    { color: "", variant: "neutral" },
);

/**
 * 语义档 → 主题变量对：[实体色底, 对比色文字]。
 * on-* 对比色由主题按深浅模式定义（浅色白字/深字，深色统一深字）。
 */
const VARIANT_VARS: Record<string, [string, string]> = {
    neutral: ["var(--zx-color-neutral)", "var(--zx-color-on-neutral)"],
    primary: ["var(--zx-color-primary)", "var(--zx-color-on-primary)"],
    success: ["var(--zx-color-success)", "var(--zx-color-on-success)"],
    warning: ["var(--zx-color-warning)", "var(--zx-color-on-warning)"],
    danger: ["var(--zx-color-danger)", "var(--zx-color-on-danger)"],
    info: ["var(--zx-color-info)", "var(--zx-color-on-info)"],
    purple: ["var(--zx-color-purple)", "var(--zx-color-on-purple)"],
    cyan: ["var(--zx-color-cyan)", "var(--zx-color-on-cyan)"],
};

// 按背景亮度计算可读的文字颜色：亮底深字、暗底白字（仅用于自定义品牌色）
const contrastColor = (hex: string): string => {
    let value = hex.trim().replace(/^#/, "");
    if (value.length === 3) {
        value = value
            .split("")
            .map((c) => c + c)
            .join("");
    }
    const m = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(value);
    if (!m) return "#ffffff";
    const luminance =
        0.2126 * (parseInt(m[1], 16) / 255) +
        0.7152 * (parseInt(m[2], 16) / 255) +
        0.0722 * (parseInt(m[3], 16) / 255);
    return luminance > 0.6 ? "#333333" : "#ffffff";
};

const style = computed(() => {
    // 自定义品牌色走实底 + 亮度对比字；语义档走 [实体色底, on-* 对比字] 变量对
    if (props.color) {
        return { background: props.color, color: contrastColor(props.color) };
    }
    const pair = VARIANT_VARS[props.variant];
    return pair ? { background: pair[0], color: pair[1] } : undefined;
});
</script>

<template>
    <span
        class="inline-flex h-[22px] flex-shrink-0 items-center rounded-lg px-2 text-[11px] leading-none font-medium whitespace-nowrap"
        :style="style"
    >
        <slot />
    </span>
</template>
