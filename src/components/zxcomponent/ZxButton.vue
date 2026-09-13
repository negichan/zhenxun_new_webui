<script setup lang="ts">
import { computed } from "vue";

/**
 * 统一按钮组件：承载标准五变体（主按钮 / 幽灵 / 描边 / 危险 / 图标圆钮）。
 *
 * 内置：btn-touch 触控反馈、cursor-pointer、type="button" 默认值（防止
 * form 内误提交）、统一禁用样式。深浅主题跟随主题系统：
 * 主按钮文字用 --zx-color-on-primary 变量（不能用会被深色主题反转的
 * text-white），中性底色用可反转的 bg-white/slate 系列。
 *
 * 用法：
 *   <ZxButton @click="save">保存</ZxButton>                          主按钮
 *   <ZxButton variant="ghost">取消</ZxButton>                        幽灵次按钮
 *   <ZxButton variant="outline">导出</ZxButton>                      描边按钮
 *   <ZxButton variant="danger">删除</ZxButton>                       危险按钮
 *   <ZxButton variant="ghost" circle><X class="h-4 w-4" /></ZxButton> 图标圆钮
 *   <ZxButton size="sm" disabled>不可用</ZxButton>
 *
 * title / aria-label / @click 等 attrs 自动透传到根 button；外部 class
 * 会与内部合并，用于微调间距（颜色类应优先扩 variant，不堆逃生类）。
 */
const props = withDefaults(
    defineProps<{
        /** 颜色变体 */
        variant?: "primary" | "ghost" | "outline" | "danger";
        /** 图标圆钮形态：md 为 h-9 w-9，sm 为 h-8 w-8，内容纯图标 */
        circle?: boolean;
        /** 尺寸：md=px-5 py-2 text-sm；sm=px-3 py-1.5 text-xs */
        size?: "md" | "sm";
        disabled?: boolean;
        type?: "button" | "submit";
    }>(),
    {
        variant: "primary",
        circle: false,
        size: "md",
        disabled: false,
        type: "button",
    },
);

/** 各变体配色（几何形状见 geometryClasses） */
const VARIANT_CLASSES: Record<NonNullable<typeof props.variant>, string> = {
    primary: "bg-zx-primary font-medium text-[color:var(--zx-color-on-primary)] hover:bg-zx-primary-hover",
    ghost: "text-slate-500 hover:bg-slate-100 hover:text-slate-700",
    outline: "border border-slate-200 bg-white text-slate-600 hover:border-slate-300",
    danger: "text-red-400 hover:bg-red-50 hover:text-red-500",
};

const variantClasses = computed(() => {
    // 幽灵圆钮 = 透明底图标圆钮（AGENTS 图标圆钮规范：hover 才出现灰底）
    if (props.variant === "ghost" && props.circle) {
        return "text-slate-400 hover:bg-slate-100 hover:text-slate-600";
    }
    return VARIANT_CLASSES[props.variant];
});

const geometryClasses = computed(() => {
    if (props.circle) {
        return props.size === "sm"
            ? "flex h-8 w-8 shrink-0 items-center justify-center"
            : "flex h-9 w-9 shrink-0 items-center justify-center";
    }
    return props.size === "sm" ? "px-3 py-1.5 text-xs" : "px-5 py-2 text-sm";
});

const classes = computed(() => [
    "btn-touch cursor-pointer inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50",
    variantClasses.value,
    geometryClasses.value,
]);
</script>

<template>
    <button :type="type" :disabled="disabled" :class="classes">
        <slot />
    </button>
</template>
