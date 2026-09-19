<script setup lang="ts">
import { zxDDPop } from "@/composables/useGsapTransition";
/**
 * ZXDropdown - 轻量下拉选择
 *
 * 触发器样式由父级通过 triggerClass 定制，面板 teleport 到 body（不受
 * 祖先 overflow / isolation / transform 裁剪），超出视口底部自动向上翻转。
 */
import { nextTick, onMounted, onUnmounted, ref, watch, computed } from "vue";
import type { Component } from "vue";
import { Check, ChevronDown, ChevronRight } from "lucide-vue-next";

export interface ZXDropdownOption {
    label: string;
    value: string;
    disabled?: boolean;
    /** 分隔线项：渲染为细分隔线而非可点行 */
    separator?: boolean;
    /** 右侧快捷键提示（菜单栏用，默认槽渲染） */
    shortcut?: string;
    /** 勾选标记（开关型菜单项，默认槽渲染） */
    checked?: boolean;
    /** 左侧图标列（任一选项带 icon 时整列保留对齐） */
    icon?: Component;
    /** 二级菜单：悬停该项时在右侧弹出子面板 */
    children?: ZXDropdownOption[];
    /** 多选项：点击后不关闭面板（适合「显示不可见字符」类勾选） */
    keepOpen?: boolean;
}

const props = defineProps<{
    options: ZXDropdownOption[];
    modelValue: string;
    placeholder?: string;
    triggerClass?: string;
    panelClass?: string;
    /** 紧凑模式：更小的行距与字号（菜单栏用） */
    compact?: boolean;
}>();

const emit = defineEmits<{
    (e: "update:modelValue", value: string): void;
}>();

const triggerRef = ref<HTMLElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);
const subRef = ref<HTMLElement | null>(null);
const open = ref(false);
const pos = ref({ x: 0, y: 0 });
const sub = ref<{ x: number; y: number; options: ZXDropdownOption[] } | null>(
    null,
);

const hasIcons = computed(() =>
    props.options.some(
        (o) => o.icon || o.checked || o.children?.some((c) => c.icon || c.checked),
    ),
);

const currentLabel = () =>
    props.options.find((opt) => opt.value === props.modelValue)?.label ??
    props.placeholder ??
    "";

const toggle = () => {
    open.value = !open.value;
    if (!open.value) sub.value = null;
};

const select = (opt: ZXDropdownOption) => {
    if (opt.disabled) return;
    emit("update:modelValue", opt.value);
    // keepOpen：多选勾选项，选完不关菜单，便于连续勾选
    if (opt.keepOpen) return;
    open.value = false;
    sub.value = null;
};

/** 二级菜单：定位到触发项右侧（垂直对齐，屏内防溢出） */
const openSub = (opt: ZXDropdownOption, e: MouseEvent) => {
    if (!opt.children?.length) {
        sub.value = null;
        return;
    }
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const h = Math.min(opt.children.length * 28 + 10, 300);
    const x = Math.min(r.right - 4, window.innerWidth - 224);
    const y = Math.min(r.top - 4, Math.max(8, window.innerHeight - h - 8));
    sub.value = { x: Math.max(8, x), y: Math.max(8, y), options: opt.children };
};

/** 视口内防溢出定位，底部放不下时向上翻 */
const updatePos = () => {
    const trigger = triggerRef.value;
    const panel = panelRef.value;
    if (!trigger || !panel) return;
    const r = trigger.getBoundingClientRect();
    const w = panel.offsetWidth;
    const h = panel.offsetHeight;
    const x = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
    let y = r.bottom + 6;
    if (y + h > window.innerHeight - 8) {
        y = Math.max(8, r.top - h - 6);
    }
    pos.value = { x, y };
};

const onPointerDown = (e: PointerEvent) => {
    if (!open.value) return;
    const target = e.target as Node;
    if (
        triggerRef.value?.contains(target) ||
        panelRef.value?.contains(target) ||
        subRef.value?.contains(target)
    ) {
        return;
    }
    open.value = false;
    sub.value = null;
};

const onKeydown = (e: KeyboardEvent) => {
    if (open.value && e.key === "Escape") {
        open.value = false;
        sub.value = null;
    }
};

/**
 * 滚动关闭只认「触发器真的随页面滚走了」——编辑器内部滚轮（monaco
 * 内容滚动）不会移动菜单栏锚点，不能再把面板误关。
 */
let openTriggerTop = 0;
const onScrollDismiss = () => {
    if (!open.value) return;
    const top = triggerRef.value?.getBoundingClientRect().top ?? 0;
    if (Math.abs(top - openTriggerTop) > 24) {
        open.value = false;
        sub.value = null;
    }
};

const onDismiss = () => {
    if (open.value) {
        open.value = false;
        sub.value = null;
    }
};

watch(open, (visible) => {
    if (visible) {
        nextTick(() => {
            updatePos();
            openTriggerTop =
                triggerRef.value?.getBoundingClientRect().top ?? 0;
        });
    } else {
        sub.value = null;
    }
});

onMounted(() => {
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeydown);
    window.addEventListener("scroll", onScrollDismiss, true);
    window.addEventListener("resize", onDismiss);
});

onUnmounted(() => {
    window.removeEventListener("pointerdown", onPointerDown, true);
    window.removeEventListener("keydown", onKeydown);
    window.removeEventListener("scroll", onScrollDismiss, true);
    window.removeEventListener("resize", onDismiss);
});
</script>

<template>
    <button
        ref="triggerRef"
        class="flex cursor-pointer items-center gap-1"
        :class="triggerClass"
        type="button"
        @click="toggle"
    >
        <slot name="trigger" :label="currentLabel()" :open="open">
            <span class="whitespace-nowrap">{{ currentLabel() }}</span>
            <ChevronDown
                class="h-4 w-4 shrink-0 transition-transform"
                :class="open ? 'rotate-180' : ''"
            />
        </slot>
    </button>

    <Teleport to="body">
        <Transition :css="false" @enter="zxDDPop.onEnter" @leave="zxDDPop.onLeave">
            <div
                v-if="open"
                ref="panelRef"
                class="fixed z-9999 max-w-[min(460px,92vw)] overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-[var(--zx-color-surface-muted)] shadow-lg"
                :class="[
                    compact ? 'max-h-[calc(100vh-24px)] min-w-32 py-1' : 'max-h-[calc(100vh-24px)] min-w-28 py-1.5',
                    panelClass,
                ]"
                :style="{ left: `${pos.x}px`, top: `${pos.y}px` }"
            >
                <template v-for="opt in options" :key="opt.value">
                    <div
                        v-if="opt.separator"
                        class="mx-2 my-1 h-px bg-slate-100"
                    ></div>
                    <button
                        v-else
                        :disabled="opt.disabled"
                        class="mx-1 flex w-[calc(100%-8px)] cursor-pointer items-center justify-between overflow-hidden rounded-lg text-left whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-40 flex items-center gap-1.5"
                        :class="[
                            compact ? 'px-2.5 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs',
                            opt.value === modelValue
                                ? 'text-zx-primary font-medium'
                                : 'text-zx-text-muted hover:bg-zx-primary-soft hover:text-zx-text',
                        ]"
                        type="button"
                        @click="
                            opt.children?.length
                                ? openSub(opt, $event)
                                : select(opt)
                        "
                        @mouseenter="openSub(opt, $event)"
                    >
                        <span
                            v-if="hasIcons"
                            class="flex w-3.5 flex-shrink-0 justify-center"
                        >
                            <component
                                :is="opt.icon"
                                v-if="opt.icon && !opt.checked"
                                class="h-3 w-3"
                            />
                            <Check
                                v-else-if="opt.checked"
                                class="h-3 w-3"
                            />
                        </span>
                        <slot name="option" :option="opt">
                            <span class="flex min-w-0 flex-1 items-center gap-1.5">
                                <span class="truncate">{{ opt.label }}</span>
                            </span>
                        </slot>
                        <span
                            v-if="opt.shortcut"
                            class="flex-shrink-0 text-[10px] text-zx-text-subtle"
                            >{{ opt.shortcut }}</span
                        >
                        <Check
                            v-if="!opt.checked && opt.value === modelValue"
                            class="h-3 w-3 shrink-0"
                        />
                        <ChevronRight
                            v-if="opt.children?.length"
                            class="h-3 w-3 shrink-0 text-zx-text-subtle"
                        />
                    </button>
                </template>
            </div>
        </Transition>
    </Teleport>

    <!-- 二级菜单面板（悬停带 children 的项时弹出） -->
    <Teleport to="body">
        <Transition :css="false" @enter="zxDDPop.onEnter" @leave="zxDDPop.onLeave">
            <div
                v-if="sub"
                ref="subRef"
                class="fixed z-[10000] max-h-[calc(100vh-24px)] min-w-32 overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-[var(--zx-color-surface-muted)] py-1 shadow-lg"
                :style="{ left: `${sub.x}px`, top: `${sub.y}px` }"
            >
                <template v-for="c in sub.options" :key="c.value">
                    <div
                        v-if="c.separator"
                        class="mx-2 my-1 h-px bg-slate-100"
                    ></div>
                    <button
                        v-else
                        :disabled="c.disabled"
                        class="mx-1 flex w-[calc(100%-8px)] cursor-pointer items-center justify-between overflow-hidden rounded-lg whitespace-nowrap px-2 py-1 text-left transition-colors disabled:pointer-events-none disabled:opacity-40 flex items-center gap-1.5"
                        :class="[
                            compact ? 'text-[11px]' : 'text-xs',
                            c.value === modelValue
                                ? 'text-zx-primary font-medium'
                                : 'text-zx-text-muted hover:bg-zx-primary-soft hover:text-zx-text',
                        ]"
                        type="button"
                        @click="select(c)"
                    >
                        <span
                            v-if="hasIcons"
                            class="flex w-4 flex-shrink-0 justify-center"
                        >
                            <component
                                :is="c.icon"
                                v-if="c.icon && !c.checked"
                                class="h-3.5 w-3.5"
                            />
                            <Check
                                v-else-if="c.checked"
                                class="h-3.5 w-3.5"
                            />
                        </span>
                        <span class="flex min-w-0 flex-1 items-center gap-1.5">
                            <span class="truncate">{{ c.label }}</span>
                        </span>
                        <span
                            v-if="c.shortcut"
                            class="flex-shrink-0 text-[10px] text-zx-text-subtle"
                            >{{ c.shortcut }}</span
                        >
                    </button>
                </template>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>

</style>
