<script setup lang="ts">
/**
 * 统一开关组件（替代 Element Plus el-switch）：按钮实现 + role="switch"，
 * 选中态走 peer-checked:bg-zx-primary（与 SettingsModal 等页内手写开关同款）。
 *
 * 用法：
 *   <ZxSwitch v-model="enabled" />
 *   <ZxSwitch :model-value="flag" @update:model-value="onToggle" disabled />
 */
const modelValue = defineModel<boolean>({ default: false });

const props = withDefaults(
    defineProps<{
        /** 禁用态 */
        disabled?: boolean;
    }>(),
    { disabled: false },
);

const emit = defineEmits<{
    (e: "change", value: boolean): void;
}>();

const toggle = () => {
    if (props.disabled) return;
    modelValue.value = !modelValue.value;
    emit("change", modelValue.value);
};
</script>

<template>
    <button
        type="button"
        role="switch"
        :aria-checked="modelValue"
        :disabled="disabled"
        class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center disabled:cursor-not-allowed disabled:opacity-50"
        @click="toggle"
    >
        <span
            class="absolute inset-0 rounded-full transition-colors"
            :class="modelValue ? 'bg-zx-primary' : 'bg-slate-200'"
        ></span>
        <span
            class="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
            :class="modelValue ? 'translate-x-4' : ''"
        ></span>
    </button>
</template>
