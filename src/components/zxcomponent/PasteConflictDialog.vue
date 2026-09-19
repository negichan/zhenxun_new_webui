<script setup lang="ts">
/**
 * 粘贴同名冲突对话框：覆盖 / 跳过 / 创建副本 / 取消
 * 挂在 usePasteConflict.askPasteConflict 上，一次询问应用于本批冲突项
 */
import { onMounted, ref } from "vue";
import { gsap } from "gsap";
import { OVERLAY_ID, useZxOverlay } from "@/composables/useOverlayStack";

const props = defineProps<{
    names: string[];
}>();

const emit = defineEmits<{
    action: [action: "overwrite" | "skip" | "copy" | "cancel"];
}>();

const visible = ref(false);
const overlay = ref<HTMLElement | null>(null);
const box = ref<HTMLElement | null>(null);

const instanceId = `paste-conflict-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
useZxOverlay({
    id: OVERLAY_ID.messageBox,
    uniqueSuffix: () => instanceId,
    open: visible,
    el: () => overlay.value,
    onClose: () => close("cancel"),
});

const preview = () => {
    const list = props.names;
    if (list.length <= 3) return list.join("、");
    return `${list.slice(0, 3).join("、")} 等 ${list.length} 项`;
};

const close = (action: "overwrite" | "skip" | "copy" | "cancel") => {
    if (!visible.value) return;
    visible.value = false;
    gsap.to(box.value, {
        opacity: 0,
        scale: 0.9,
        duration: 0.15,
        ease: "power2.in",
    });
    gsap.to(overlay.value, {
        opacity: 0,
        duration: 0.15,
        ease: "power2.in",
        onComplete: () => emit("action", action),
    });
};

onMounted(() => {
    visible.value = true;
    gsap.fromTo(
        overlay.value,
        { opacity: 0 },
        { opacity: 1, duration: 0.25, ease: "power2.out" },
    );
    gsap.fromTo(
        box.value,
        { opacity: 0, scale: 0.92 },
        { opacity: 1, scale: 1, duration: 0.25, ease: "back.out(1.4)" },
    );
});
</script>

<template>
    <Teleport to="body">
        <div
            v-show="visible"
            ref="overlay"
            class="glass-overlay fixed inset-0 z-50 flex items-center justify-center select-none"
        >
            <div
                ref="box"
                class="modal-content relative w-[420px] max-w-[92%] rounded-3xl border border-slate-200 bg-white p-6 shadow-xl opacity-0"
            >
                <h3 class="text-base font-bold text-zx-text-strong">
                    目标位置已有同名项
                </h3>
                <div
                    class="mt-1.5 mb-5 rounded-2xl bg-slate-50 px-4 py-3.5 text-sm text-zx-text"
                >
                    <p>
                        以下
                        {{ names.length }}
                        项与目标目录中的名称冲突：
                    </p>
                    <p class="mt-1.5 font-medium break-all text-zx-text-strong">
                        {{ preview() }}
                    </p>
                    <p class="mt-2 text-xs text-zx-text-muted">
                        请选择处理方式（本批冲突项统一执行）
                    </p>
                </div>
                <div class="flex flex-wrap justify-end gap-2">
                    <button
                        type="button"
                        class="cursor-pointer rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-zx-text-muted transition-colors hover:bg-slate-50 active:scale-95"
                        @click="close('cancel')"
                    >
                        取消
                    </button>
                    <button
                        type="button"
                        class="cursor-pointer rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-zx-text-muted transition-colors hover:bg-slate-50 active:scale-95"
                        @click="close('skip')"
                    >
                        跳过
                    </button>
                    <button
                        type="button"
                        class="cursor-pointer rounded-full border border-transparent bg-zx-info px-4 py-1.5 text-xs font-bold text-[color:var(--zx-color-on-info)] transition-colors active:scale-95"
                        @click="close('copy')"
                    >
                        创建副本
                    </button>
                    <button
                        type="button"
                        class="cursor-pointer rounded-full border border-transparent bg-zx-danger px-4 py-1.5 text-xs font-bold text-[color:var(--zx-color-on-danger)] transition-colors active:scale-95"
                        @click="close('overwrite')"
                    >
                        覆盖
                    </button>
                </div>
            </div>
        </div>
    </Teleport>
</template>
