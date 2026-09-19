<template>
    <Teleport to="body">
        <div
            v-show="visible"
            ref="overlay"
            class="glass-overlay fixed inset-0 z-50 flex items-center justify-center select-none"
        >
            <div
                ref="box"
                class="modal-content relative w-90 max-w-[90%] rounded-3xl border border-slate-200 bg-white p-6 shadow-xl opacity-0"
            >
                <h3
                    v-if="title"
                    class="text-base font-bold text-zx-text-strong"
                >
                    {{ title }}
                </h3>

                <div
                    class="mt-1.5 mb-5 rounded-2xl bg-slate-50 px-4 py-3.5 text-sm text-zx-text"
                >
                    <slot>{{ message }}</slot>
                </div>

                <div class="flex justify-end gap-2">
                    <button
                        v-if="cancelButtonText"
                        @click="handleCancel"
                        class="cursor-pointer rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-zx-text-muted transition-colors hover:bg-slate-50 active:scale-95"
                    >
                        {{ cancelButtonText }}
                    </button>

                    <button
                        @click="handleConfirm"
                        @mouseenter="hovering = true"
                        @mouseleave="hovering = false"
                        class="cursor-pointer rounded-full border border-transparent px-5 py-1.5 text-xs font-bold text-white shadow-sm transition-all active:scale-95"
                        :class="
                            confirmButtonHoverBg
                                ? confirmButtonHoverBg
                                : 'bg-zx-primary hover:bg-zx-primary-hover'
                        "
                    >
                        {{
                            hovering && confirmButtonHoverText
                                ? confirmButtonHoverText
                                : confirmButtonText
                        }}
                    </button>
                </div>

                <button
                    class="absolute top-4 right-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-zx-text-subtle transition-colors hover:bg-slate-100 hover:text-zx-text-muted active:scale-90"
                    @click="handleCancel"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="1.5"
                        stroke="currentColor"
                        class="size-4"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M6 18 18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            </div>
        </div>
    </Teleport>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { gsap } from "gsap";
import { OVERLAY_ID, useZxOverlay } from "@/composables/useOverlayStack";

const props = defineProps({
    title: String,
    message: String,
    confirmButtonText: { type: String, default: "确定" },
    confirmButtonHoverText: String,
    confirmButtonHoverBg: String,
    cancelButtonText: String,
    onConfirm: Function,
    onCancel: Function,
});

const visible = ref(false);
const hovering = ref(false);
const overlay = useTemplateRef("overlay");
const box = useTemplateRef("box");

const instanceId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
useZxOverlay({
    id: OVERLAY_ID.messageBox,
    uniqueSuffix: () => instanceId,
    open: visible,
    el: () => overlay.value,
    onClose: () => handleCancel(),
});

onMounted(() => {
    visible.value = true;

    // 动画进入
    gsap.fromTo(
        overlay.value,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: "power2.out" },
    );
    gsap.fromTo(
        box.value,
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1.1, duration: 0.3, ease: "back.out(1.7)" },
    );
});

function handleConfirm() {
    close(() => props.onConfirm?.());
}

function handleCancel() {
    close(() => props.onCancel?.());
}

function close(callback) {
    visible.value = false;
    gsap.to(box.value, {
        opacity: 0,
        scale: 0.8,
        duration: 0.2,
        ease: "power2.in",
    });
    gsap.to(overlay.value, {
        opacity: 0,
        duration: 0.2,
        ease: "power2.in",
        onComplete() {
            callback?.();
        },
    });
}
</script>
