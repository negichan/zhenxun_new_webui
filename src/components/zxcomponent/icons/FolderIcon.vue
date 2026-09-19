<script setup lang="ts">
/** 填充文件夹图标：closed / open，颜色跟随 currentColor */
withDefaults(defineProps<{ open?: boolean }>(), { open: false });
</script>

<template>
    <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        v-bind="$attrs"
    >
        <path
            v-if="open"
            d="M6 14.5l1.45-2.9A2 2 0 0 1 9.24 10.5H20a2 2 0 0 1 1.94 2.5l-1.55 6A2 2 0 0 1 18.45 20.5H4a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"
        />
        <path
            v-else
            d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
        />
    </svg>
</template>
