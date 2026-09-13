<script setup lang="ts">
import { computed, ref, watch } from "vue";

/**
 * 数字步进器（替代 Element Plus el-input-number）：[−] 输入框 [+]，
 * 边界内钳制、step 步进、precision 保留小数；打字过程不回写，
 * 失焦 / 回车时提交，非法内容回退到当前值。
 *
 * 用法：
 *   <ZxInputNumber v-model="gold" :min="0" :max="999999" :step="100" />
 */
const modelValue = defineModel<number>({ default: 0 });

const props = withDefaults(
    defineProps<{
        /** 最小值 */
        min?: number;
        /** 最大值 */
        max?: number;
        /** 步进幅度（也用于 +/− 按钮） */
        step?: number;
        /** 保留小数位（0 = 整数） */
        precision?: number;
        disabled?: boolean;
        placeholder?: string;
    }>(),
    {
        min: -Infinity,
        max: Infinity,
        step: 1,
        precision: 0,
        disabled: false,
        placeholder: "",
    },
);

const emit = defineEmits<{
    (e: "change", value: number): void;
}>();

/** 输入框草稿：打字期间自由编辑，提交时才钳制回写 */
const draft = ref(String(modelValue.value ?? ""));
watch(
    () => modelValue.value,
    (val) => {
        draft.value = Number.isFinite(val) ? String(val) : "";
    },
);

const clamp = (val: number) => {
    const factor = 10 ** props.precision;
    const rounded = Math.round(val * factor) / factor;
    return Math.min(props.max, Math.max(props.min, rounded));
};

const commit = (raw: string) => {
    const num = Number(raw.trim());
    const fallback = Number.isFinite(modelValue.value)
        ? modelValue.value
        : Number.isFinite(props.min)
          ? props.min
          : 0;
    const next = clamp(Number.isFinite(num) && raw.trim() !== "" ? num : fallback);
    if (next !== modelValue.value) {
        modelValue.value = next;
        emit("change", next);
    } else {
        draft.value = String(next);
    }
};

const stepBy = (delta: number) => {
    if (props.disabled) return;
    const base = Number.isFinite(modelValue.value)
        ? modelValue.value
        : Number.isFinite(props.min)
          ? props.min
          : 0;
    const next = clamp(base + delta);
    if (next !== modelValue.value) {
        modelValue.value = next;
        emit("change", next);
    } else {
        draft.value = String(next);
    }
};

const atMin = computed(
    () => Number.isFinite(modelValue.value) && modelValue.value <= props.min,
);
const atMax = computed(
    () => Number.isFinite(modelValue.value) && modelValue.value >= props.max,
);

const btnClasses =
    "flex h-full w-8 shrink-0 cursor-pointer items-center justify-center text-slate-400 transition-colors hover:bg-slate-100 hover:text-zx-primary disabled:cursor-not-allowed disabled:opacity-40";
</script>

<template>
    <div
        class="flex h-9 w-full items-center overflow-hidden rounded-full border border-slate-300 bg-white transition-colors focus-within:border-zx-primary"
        :class="disabled ? 'opacity-50' : ''"
    >
        <button
            type="button"
            :disabled="disabled || atMin"
            :class="btnClasses"
            aria-label="减少"
            @click="stepBy(-step)"
        >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M5 12h14" />
            </svg>
        </button>
        <input
            type="text"
            inputmode="decimal"
            class="h-full min-w-0 flex-1 border-x border-slate-200 bg-transparent text-center text-sm text-slate-700 focus:outline-none"
            v-model="draft"
            :disabled="disabled"
            :placeholder="placeholder"
            @blur="commit(draft)"
            @keydown.enter="($event.target as HTMLInputElement).blur()"
        />
        <button
            type="button"
            :disabled="disabled || atMax"
            :class="btnClasses"
            aria-label="增加"
            @click="stepBy(step)"
        >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M12 5v14M5 12h14" />
            </svg>
        </button>
    </div>
</template>
