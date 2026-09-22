<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { X, MessagesSquare } from "lucide-vue-next";
import { modalJelly } from "@/composables/useGsapTransition";
import { mainApi } from "@/utils/api-next";
import FaceImg from "@/views/chat/FaceImg.vue";
import { OVERLAY_ID, useZxOverlay } from "@/composables/useOverlayStack";
import type { ForwardNode } from "@/types";

const props = defineProps<{
    visible: boolean;
    forwardId: string;
    botId?: string;
    /** 本地已构建的合并转发节点：存在则直接渲染，跳过后端拉取 */
    localNodes?: ForwardNode[] | null;
}>();
const emit = defineEmits<{ close: [] }>();

const rootRef = ref<HTMLElement | null>(null);
useZxOverlay({
    id: OVERLAY_ID.forward,
    open: computed({ get: () => props.visible, set: () => emit("close") }),
    el: () => rootRef.value,
    onClose: () => emit("close"),
});

const loading = ref(false);
const nodes = ref<ForwardNode[]>([]);
const error = ref("");

const load = async () => {
    if (props.localNodes && props.localNodes.length) {
        nodes.value = props.localNodes;
        error.value = "";
        loading.value = false;
        return;
    }
    if (!props.forwardId) return;
    loading.value = true;
    error.value = "";
    nodes.value = [];
    try {
        const res = await mainApi.getForward(props.forwardId, props.botId);
        if (res?.success && Array.isArray(res.data)) {
            nodes.value = res.data;
        } else {
            error.value = res?.message || "获取转发内容失败";
        }
    } catch (e: any) {
        error.value = e?.message || "获取转发内容失败";
    } finally {
        loading.value = false;
    }
};

watch(
    () => [props.visible, props.forwardId, props.localNodes] as const,
    ([v]) => {
        if (v) load();
    },
    { immediate: true },
);

const timeText = (t?: number | string | null) => {
    if (t == null || t === "") return "";
    const n = Number(t);
    const d = Number.isNaN(n) ? new Date(t as string) : new Date(n * 1000);
    return isNaN(d.getTime()) ? "" : d.toLocaleString();
};
</script>

<template>
    <Teleport to="body">
        <Transition :css="false" @enter="modalJelly.onEnter" @leave="modalJelly.onLeave">
            <div
                v-if="visible"
                ref="rootRef"
                class="fixed inset-0 z-50 flex items-center justify-center"
            >
                <div class="glass-overlay absolute h-full w-full"></div>
                <div
                    class="modal-content relative z-1 flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl max-sm:mx-4"
                >
                    <div class="flex items-center gap-2.5 px-5 py-4">
                        <MessagesSquare
                            class="h-5 w-5 shrink-0 text-[var(--zx-color-text-muted)]"
                        />
                        <p class="min-w-0 flex-1 truncate text-lg font-bold text-[var(--zx-color-text)]">
                            聊天记录
                        </p>
                        <span class="shrink-0 text-xs text-[var(--zx-color-text-muted)]">
                            {{ nodes.length }} 条
                        </span>
                        <button
                            type="button"
                            class="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--zx-color-text-muted)] transition-colors hover:bg-[var(--zx-color-surface-muted)] hover:text-[var(--zx-color-text)]"
                            @click="emit('close')"
                        >
                            <X class="h-4 w-4" />
                        </button>
                    </div>

                    <div class="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
                        <div
                            v-if="loading"
                            class="flex h-32 items-center justify-center text-sm text-[var(--zx-color-text-muted)]"
                        >
                            加载中…
                        </div>
                        <div
                            v-else-if="error"
                            class="flex h-32 items-center justify-center px-4 text-center text-sm text-zx-danger"
                        >
                            {{ error }}
                        </div>
                        <div
                            v-else-if="nodes.length === 0"
                            class="flex h-32 items-center justify-center text-sm text-[var(--zx-color-text-muted)]"
                        >
                            没有内容
                        </div>

                        <div v-else class="flex flex-col gap-3">
                            <div
                                v-for="(node, ni) in nodes"
                                :key="ni"
                                class="rounded-2xl bg-[var(--zx-color-surface-muted)] p-3"
                            >
                                <div class="mb-1 flex items-baseline justify-between gap-2">
                                    <span
                                        class="min-w-0 truncate text-xs font-semibold text-[var(--zx-color-text-strong)]"
                                        >{{ node.nickname }}</span
                                    >
                                    <span
                                        v-if="timeText(node.time)"
                                        class="shrink-0 text-[10px] text-[var(--zx-color-text-subtle)]"
                                        >{{ timeText(node.time) }}</span
                                    >
                                </div>
                                <div class="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm text-[var(--zx-color-text)]">
                                    <template
                                        v-for="(seg, si) in node.segments"
                                        :key="si"
                                    >
                                        <img
                                            v-if="seg.type === 'image' && seg.content"
                                            :src="seg.content"
                                            class="max-h-32 max-w-[60%] rounded-lg object-contain"
                                            referrerpolicy="no-referrer"
                                        />
                                        <FaceImg
                                            v-else-if="seg.type === 'face'"
                                            :id="seg.content"
                                        />
                                        <span
                                            v-else-if="seg.type === 'at'"
                                            class="rounded bg-zx-primary-soft px-1 font-medium text-zx-primary"
                                            >{{ seg.content }}</span
                                        >
                                        <audio
                                            v-else-if="seg.type === 'record'"
                                            controls
                                            :src="seg.content"
                                            class="h-8 max-w-56"
                                        ></audio>
                                        <video
                                            v-else-if="seg.type === 'video'"
                                            controls
                                            :src="seg.content"
                                            class="max-h-60 max-w-[70%] rounded-lg"
                                            referrerpolicy="no-referrer"
                                        ></video>
                                        <pre
                                            v-else-if="seg.type === 'json' || seg.type === 'xml'"
                                            class="max-h-40 w-full overflow-auto rounded-lg bg-white p-2 text-[10px] leading-4 whitespace-pre-wrap"
                                            >{{ seg.content }}</pre
                                        >
                                        <span
                                            v-else
                                            class="break-words whitespace-pre-wrap"
                                            >{{ seg.content }}</span
                                        >
                                    </template>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>
