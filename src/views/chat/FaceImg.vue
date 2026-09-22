<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { faceCdnUrl, faceLocalUrl, isFaceId } from "@/utils/qq-face";

/** QQ 默认表情（face id）行内小脸渲染：CDN 优先，失败退后端本地，再失败退占位文本 */
const props = withDefaults(
    defineProps<{ id?: string | number | null; sizeClass?: string }>(),
    { sizeClass: "h-[1.3em] w-[1.3em]" },
);

const src = ref("");
const failed = ref(false);
const level = ref(0); // 0=CDN, 1=local, 2=failed

const reset = () => {
    if (!isFaceId(props.id)) {
        src.value = "";
        failed.value = true;
        level.value = 2;
        return;
    }
    failed.value = false;
    level.value = 0;
    src.value = faceCdnUrl(props.id!);
};
reset();
watch(() => props.id, reset);

const onError = () => {
    if (level.value === 0 && props.id != null) {
        level.value = 1;
        src.value = faceLocalUrl(props.id);
    } else {
        level.value = 2;
        failed.value = true;
        src.value = "";
    }
};

const imgClass = computed(
    () => `inline-block align-middle object-contain ${props.sizeClass}`,
);
</script>

<template>
    <img
        v-if="!failed && src"
        :src="src"
        :alt="`表情 ${id}`"
        loading="lazy"
        referrerpolicy="no-referrer"
        :class="imgClass"
        @error="onError"
    />
    <span v-else class="inline-block align-middle opacity-60">[表情]</span>
</template>
