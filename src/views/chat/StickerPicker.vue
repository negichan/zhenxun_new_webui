<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { onClickOutside } from "@vueuse/core";
import { Smile } from "lucide-vue-next";
import {
    STICKER_PACKS,
    type StickerItem,
    type StickerPack,
} from "@/utils/stickers";
import { qqntLocalFallback } from "@/utils/stickers-qqnt";

const props = defineProps<{
    modelValue: boolean;
}>();

const emit = defineEmits<{
    "update:modelValue": [value: boolean];
    select: [sticker: StickerItem, kind: "emoji" | "sticker"];
}>();

const targetRef = ref<HTMLElement | null>(null);

// 已加载表情 id 记录：CDN 图加载期间显示骨架屏
const loadedMap = ref<Record<string, boolean>>({});

// 记住上次选中的表情包（默认打开小真寻）
const LAST_PACK_KEY = "zx_last_sticker_pack";
const activePackId = ref<string>(
    localStorage.getItem(LAST_PACK_KEY) || "mahiro",
);

if (!STICKER_PACKS.some((p) => p.id === activePackId.value)) {
    activePackId.value = STICKER_PACKS[0]?.id || "mahiro";
}

watch(activePackId, (val) => {
    localStorage.setItem(LAST_PACK_KEY, val);
});

const currentPack = computed<StickerPack>(
    () =>
        STICKER_PACKS.find((p) => p.id === activePackId.value) ||
        STICKER_PACKS[0],
);

const stickers = computed<StickerItem[]>(
    () => currentPack.value?.stickers || [],
);

// QQ 式密集小格（默认表情），其余包保持大格带名称
const isDense = computed(() => currentPack.value?.density === "sm");

onClickOutside(targetRef, () => {
    if (props.modelValue) {
        emit("update:modelValue", false);
    }
});

const handleSelect = (sticker: StickerItem) => {
    emit("select", sticker, isDense.value ? "emoji" : "sticker");
    // 图片表情选择后自动收起，纯 Emoji 支持连续点击输入
    if (sticker.type === "image") {
        emit("update:modelValue", false);
    }
};

// CDN 加载失败 → 回退后端本地路由（只试一次，避免死循环）
const onStickerImgError = (id: string, e: Event, fallback?: string) => {
    const img = e.target as HTMLImageElement;
    if (!img.dataset.fbk) {
        const fb = fallback || qqntLocalFallback(img.currentSrc || img.src);
        if (fb) {
            img.dataset.fbk = "1";
            img.src = fb;
            return;
        }
    }
    // 兜底也失败：收掉骨架，避免空骨架一直占位误导
    loadedMap.value[id] = true;
};

const onStickerImgLoad = (id: string) => {
    loadedMap.value[id] = true;
};

// 自实现 tips：悬停 0.5s 后在格子上方显示表情名
const tip = ref<{ text: string; x: number; y: number } | null>(null);
let tipTimer: ReturnType<typeof setTimeout> | undefined;
const clearTipTimer = () => {
    if (tipTimer) clearTimeout(tipTimer);
    tipTimer = undefined;
};
const showTip = (e: MouseEvent, text?: string) => {
    if (!text) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    clearTipTimer();
    tipTimer = setTimeout(() => {
        tip.value = { text, x: r.left + r.width / 2, y: r.top };
    }, 500);
};
const hideTip = () => {
    clearTipTimer();
    tip.value = null;
};
onBeforeUnmount(clearTipTimer);
watch(activePackId, hideTip);
watch(
    () => props.modelValue,
    (v) => {
        if (!v) hideTip();
    },
);
</script>

<template>
    <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="transform opacity-0 scale-95 translate-y-2"
        enter-to-class="transform opacity-100 scale-100 translate-y-0"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="transform opacity-100 scale-100 translate-y-0"
        leave-to-class="transform opacity-0 scale-95 translate-y-2"
    >
        <div
            v-if="modelValue"
            ref="targetRef"
            class="absolute bottom-full left-0 z-30 mb-2 flex h-[380px] w-[340px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl sm:w-[400px]"
        >
            <!-- 主体：网格 -->
            <div
                class="min-h-0 flex-1 overflow-y-auto px-2 py-2"
                @scroll="hideTip"
            >
                <div
                    v-if="stickers.length === 0"
                    class="flex h-full flex-col items-center justify-center gap-1 text-zx-text-muted"
                >
                    <p class="text-xs">这个表情包还没有内容</p>
                </div>

                <!-- Emoji 网格（8 列） -->
                <div
                    v-else-if="currentPack.type === 'emoji'"
                    class="grid grid-cols-8 gap-1"
                >
                    <button
                        v-for="s in stickers"
                        :key="s.id"
                        type="button"
                        class="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-2xl transition-all hover:scale-110 hover:bg-zx-primary-soft active:scale-95"
                        :title="s.name"
                        @click="handleSelect(s)"
                    >
                        {{ s.name }}
                    </button>
                </div>

                <!-- 图片表情网格 · dense：正方形小格 + 悬停 tips -->
                <div
                    v-else-if="isDense"
                    class="grid grid-cols-9 gap-1"
                >
                    <button
                        v-for="s in stickers"
                        :key="s.id"
                        type="button"
                        class="group relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-lg p-0.5 transition-colors hover:bg-zx-primary-soft active:scale-95"
                        @click="handleSelect(s); hideTip()"
                        @mouseenter="showTip($event, s.description || s.name)"
                        @mouseleave="hideTip"
                    >
                        <div
                            v-if="!loadedMap[s.id]"
                            class="absolute inset-1 animate-pulse rounded-md bg-[var(--zx-color-surface-muted)]"
                        ></div>
                        <img
                            :src="s.path"
                            :alt="s.name || s.filename"
                            loading="lazy"
                            class="relative h-full w-full object-contain transition-[transform,opacity] duration-150 group-hover:scale-110"
                            :class="loadedMap[s.id] ? 'opacity-100' : 'opacity-0'"
                            @load="onStickerImgLoad(s.id)"
                            @error="onStickerImgError(s.id, $event, s.fallback)"
                        />
                    </button>
                </div>

                <!-- 图片表情网格 · 大格带名称 -->
                <div v-else class="grid grid-cols-4 gap-2">
                    <button
                        v-for="s in stickers"
                        :key="s.id"
                        type="button"
                        class="group flex cursor-pointer flex-col items-center justify-center rounded-2xl p-1.5 transition-colors hover:bg-zx-primary-soft active:scale-95"
                        :title="`${s.jp_text ? `[${s.jp_text}] ` : ''}${s.description || s.name}`"
                        @click="handleSelect(s)"
                    >
                        <div class="relative h-14 w-14">
                            <div
                                v-if="!loadedMap[s.id]"
                                class="absolute inset-1.5 animate-pulse rounded-xl bg-[var(--zx-color-surface-muted)]"
                            ></div>
                            <img
                                :src="s.path"
                                :alt="s.name || s.filename"
                                loading="lazy"
                                class="relative h-14 w-14 object-contain transition-[transform,opacity] duration-200 group-hover:scale-110"
                                :class="loadedMap[s.id] ? 'opacity-100' : 'opacity-0'"
                                @load="onStickerImgLoad(s.id)"
                                @error="onStickerImgError(s.id, $event, s.fallback)"
                            />
                        </div>
                        <span
                            class="mt-1 max-w-full truncate text-[10px] text-zx-text-muted group-hover:text-zx-text"
                        >
                            {{ s.jp_text || s.name || s.tags?.[0] || '表情' }}
                        </span>
                    </button>
                </div>
            </div>

            <!-- 底部：包切换 tab 栏（关闭靠点外部/选中，无独立关闭钮） -->
            <div
                class="flex items-stretch border-t border-slate-100 bg-slate-50/60"
            >
                <div
                    class="no-scrollbar flex flex-1 items-center gap-1 overflow-x-auto px-2 py-1.5"
                >
                    <button
                        v-for="pack in STICKER_PACKS"
                        :key="pack.id"
                        type="button"
                        :title="pack.description || pack.name"
                        :class="
                            activePackId === pack.id
                                ? 'bg-zx-primary-soft text-zx-primary'
                                : 'text-zx-text-muted hover:bg-white hover:text-zx-text'
                        "
                        class="flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-xl transition-colors active:scale-95"
                        @click="activePackId = pack.id"
                    >
                        <Smile
                            v-if="pack.iconType === 'icon' || pack.type === 'emoji'"
                            class="h-5 w-5"
                        />
                        <img
                            v-else
                            :src="pack.icon"
                            :alt="pack.name"
                            class="h-6 w-6 rounded-md object-contain"
                            @error="onStickerImgError(pack.id, $event)"
                        />
                    </button>
                </div>
            </div>
        </div>
    </Transition>

    <!-- 表情名 tips（悬停 0.5s 后在格子上方显示，反色气泡跟随主题） -->
    <Teleport to="body">
        <div
            v-if="tip"
            class="pointer-events-none fixed z-[9999] -translate-x-1/2 -translate-y-full select-none"
            :style="{ left: `${tip.x}px`, top: `${tip.y - 8}px` }"
        >
            <div
                class="whitespace-nowrap rounded-lg bg-[var(--zx-color-text)] px-2 py-1 text-xs font-medium text-[var(--zx-color-bg)] shadow-lg"
            >
                {{ tip.text }}
            </div>
        </div>
    </Teleport>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
.no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
</style>
