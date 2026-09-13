<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import { ChevronLeft, ChevronRight, RotateCw, X, ZoomIn, ZoomOut } from "lucide-vue-next";

/**
 * 图片查看器（自研，不依赖 Element Plus）：半透明遮罩 + 居中大图，
 * 支持多图翻页、滚轮缩放、拖拽平移、旋转（带过渡）。Esc / 点遮罩关闭。
 * 按钮配色跟随主题（--zx-color-* 变量），不使用可被主题反转的中性类。
 * 用法：<ZxImageViewer ref="viewer" /> + viewer.open(urls, index)
 */
const visible = ref(false);
const urls = ref<string[]>([]);
const index = ref(0);

const scale = ref(1);
const rotation = ref(0);
const offsetX = ref(0);
const offsetY = ref(0);

const current = computed(() => urls.value[index.value] ?? "");
const scalePercent = computed(() => `${Math.round(scale.value * 100)}%`);

/** 复位缩放/平移；旋转归到最近的 360 倍数，配合过渡不会倒转一大圈 */
const resetTransform = () => {
    scale.value = 1;
    rotation.value = Math.round(rotation.value / 360) * 360;
    offsetX.value = 0;
    offsetY.value = 0;
};

const open = (list: string | string[], initial = 0) => {
    urls.value = Array.isArray(list) ? list : [list];
    if (!urls.value.length) return;
    index.value = Math.max(0, Math.min(initial, urls.value.length - 1));
    resetTransform();
    visible.value = true;
};

const close = () => {
    visible.value = false;
};

const step = (delta: number) => {
    if (urls.value.length < 2) return;
    index.value =
        (index.value + delta + urls.value.length) % urls.value.length;
    resetTransform();
};

const zoom = (factor: number) => {
    scale.value = Math.min(5, Math.max(0.2, scale.value * factor));
};

const onWheel = (event: WheelEvent) => {
    zoom(event.deltaY < 0 ? 1.15 : 1 / 1.15);
};

// 拖拽平移：只有放大后才拖得动，指针事件统一鼠标/触摸
const dragging = ref(false);
let startX = 0;
let startY = 0;
let baseX = 0;
let baseY = 0;

const onPointerDown = (event: PointerEvent) => {
    if (scale.value <= 1) return;
    dragging.value = true;
    startX = event.clientX;
    startY = event.clientY;
    baseX = offsetX.value;
    baseY = offsetY.value;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
};

const onPointerMove = (event: PointerEvent) => {
    if (!dragging.value) return;
    offsetX.value = baseX + (event.clientX - startX);
    offsetY.value = baseY + (event.clientY - startY);
};

const onPointerUp = () => {
    dragging.value = false;
};

const onKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") close();
    else if (event.key === "ArrowLeft") step(-1);
    else if (event.key === "ArrowRight") step(1);
};

watch(visible, (isOpen) => {
    if (isOpen) {
        window.addEventListener("keydown", onKeydown);
        document.body.style.overflow = "hidden";
    } else {
        window.removeEventListener("keydown", onKeydown);
        document.body.style.overflow = "";
    }
});

onUnmounted(() => {
    window.removeEventListener("keydown", onKeydown);
    document.body.style.overflow = "";
});

defineExpose({ open });
</script>

<template>
    <Teleport to="body">
        <!-- 不用 <Transition>：它的类切换依赖 requestAnimationFrame，
             页面卡顿/后台标签 rAF 停摆时离场元素会卡在 DOM 里挡住全页点击；
             进场用纯 CSS 动画（插入即播，无 JS 参与），关闭直接卸载 -->
        <div
            v-if="visible"
            class="zx-image-viewer fixed inset-0 z-[3000] flex items-center justify-center overflow-hidden bg-[rgba(0,0,0,0.5)]"
            @click.self="close"
            @wheel.prevent="onWheel"
        >
            <!-- 旋转层：旋转走外层（带过渡），缩放/平移走内层（即时响应） -->
            <div
                class="transition-transform duration-300 ease-out"
                :style="{ transform: `rotate(${rotation}deg)` }"
            >
                <img
                    :src="current"
                    alt=""
                    draggable="false"
                    referrerpolicy="no-referrer"
                    class="max-h-[90vh] max-w-[90vw] select-none"
                    :class="
                        dragging
                            ? 'cursor-grabbing'
                            : scale > 1
                              ? 'cursor-grab'
                              : 'cursor-default'
                    "
                    :style="{
                        transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
                    }"
                    @pointerdown="onPointerDown"
                    @pointermove="onPointerMove"
                    @pointerup="onPointerUp"
                    @pointercancel="onPointerUp"
                />
            </div>

            <!-- 关闭 -->
            <button
                type="button"
                aria-label="关闭"
                class="btn-touch absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/90 shadow-sm transition-all hover:scale-105 hover:bg-white"
                @click="close"
            >
                <X class="h-5 w-5 text-zx-primary" />
            </button>

            <!-- 左右翻页 -->
            <template v-if="urls.length > 1">
                <button
                    type="button"
                    aria-label="上一张"
                    class="btn-touch absolute left-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/90 shadow-sm transition-all hover:scale-105 hover:bg-white"
                    @click="step(-1)"
                >
                    <ChevronLeft class="h-5 w-5 text-zx-primary" />
                </button>
                <button
                    type="button"
                    aria-label="下一张"
                    class="btn-touch absolute right-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/90 shadow-sm transition-all hover:scale-105 hover:bg-white"
                    @click="step(1)"
                >
                    <ChevronRight class="h-5 w-5 text-zx-primary" />
                </button>
            </template>

            <!-- 底部工具条：卡片式主题配色，缩小 / 比例（点击复位）/ 放大 / 旋转 -->
            <div
                class="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm"
            >
                <button
                    type="button"
                    aria-label="缩小"
                    class="btn-touch flex h-8 w-8 items-center justify-center rounded-full text-zx-primary transition-all hover:bg-zx-primary-soft"
                    @click="zoom(1 / 1.25)"
                >
                    <ZoomOut class="h-4 w-4" />
                </button>
                <button
                    type="button"
                    title="点击复位"
                    class="btn-touch min-w-12 rounded-full px-1 text-center text-xs font-medium text-slate-500 transition-colors hover:text-zx-primary"
                    @click="resetTransform"
                >
                    {{ scalePercent }}
                </button>
                <button
                    type="button"
                    aria-label="放大"
                    class="btn-touch flex h-8 w-8 items-center justify-center rounded-full text-zx-primary transition-all hover:bg-zx-primary-soft"
                    @click="zoom(1.25)"
                >
                    <ZoomIn class="h-4 w-4" />
                </button>
                <button
                    type="button"
                    aria-label="旋转"
                    class="btn-touch flex h-8 w-8 items-center justify-center rounded-full text-zx-primary transition-all hover:bg-zx-primary-soft"
                    @click="rotation += 90"
                >
                    <RotateCw class="h-4 w-4" />
                </button>
            </div>
        </div>
    </Teleport>
</template>

<style scoped>
/* Tailwind v4 的按钮默认 cursor 是 default，查看器内按钮统一手型 */
.zx-image-viewer button {
    cursor: pointer;
}

.zx-image-viewer {
    animation: zx-viewer-in 0.18s ease;
}

@keyframes zx-viewer-in {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}
</style>
