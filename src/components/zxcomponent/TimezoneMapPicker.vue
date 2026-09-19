<script setup lang="ts">
/**
 * 世界地图时区选择（对齐 mazmoiz 思路）
 * - 真实国家轮廓（world-atlas 110m）
 * - 竖向 UTC 偏移带；点国家或地图 → 按经度取最近偏移
 * - 同一国家可被偏移带切开（美/俄等）
 * - 颜色走 --zx-* 主题
 */
import { computed, ref, watch } from "vue";
import { X } from "lucide-vue-next";
import worldTopo from "./tz-world-countries.json";
import {
    buildOffsetLines,
    formatOffset,
    loadWorldCountries,
    nearestOffset,
    type WorldCountry,
} from "./tzWorldMap";
import {
    OVERLAY_ID,
    useOverlayStack,
} from "@/composables/useOverlayStack";

const props = withDefaults(
    defineProps<{
        modelValue?: string;
        open?: boolean;
    }>(),
    { modelValue: "", open: false },
);

const emit = defineEmits<{
    "update:open": [v: boolean];
    select: [payload: { offset: number; label: string; country?: string }];
}>();

const modalRef = ref<HTMLElement | null>(null);
const { pushOverlay, removeOverlay } = useOverlayStack();

watch(
    () => props.open,
    (v) => {
        if (v) {
            pushOverlay({
                id: OVERLAY_ID.timezoneMap,
                el: () => modalRef.value,
                onClose: () => emit("update:open", false),
                closeOnOutsideClick: true,
                closeOnEsc: true,
            });
        } else {
            removeOverlay(OVERLAY_ID.timezoneMap);
        }
    },
);

const countries = loadWorldCountries(worldTopo as any) as WorldCountry[];
const offsetLines = buildOffsetLines();

const MAP_W = 360;
const MAP_H = 180;

const hoverCountry = ref<string | null>(null);
const hoverOffset = ref<{ min: number; label: string; country?: string } | null>(
    null,
);
const selectedMin = ref<number | null>(null);

const selectedLabel = computed(() => props.modelValue || "");

const matchSelected = (min: number) => {
    if (!selectedLabel.value) return false;
    return selectedLabel.value === formatOffset(min);
};

const clientToLon = (e: MouseEvent, el: Element) => {
    const r = el.getBoundingClientRect();
    if (!r.width) return 0;
    const x = ((e.clientX - r.left) / r.width) * MAP_W;
    return x - 180;
};

const resolveAt = (e: MouseEvent, countryName?: string) => {
    const el = e.currentTarget as Element;
    const lon = clientToLon(e, el.closest("svg") || el);
    const line = nearestOffset(lon, offsetLines);
    return { line, countryName };
};

const onMapMove = (e: MouseEvent) => {
    const target = e.target as Element;
    const name =
        target instanceof Element ? target.getAttribute("data-name") : null;
    hoverCountry.value = name;
    const { line } = resolveAt(e);
    hoverOffset.value = {
        min: line.min,
        label: line.label,
        country: name || undefined,
    };
};

const onMapLeave = () => {
    hoverCountry.value = null;
    hoverOffset.value = null;
};

const onMapClick = (e: MouseEvent) => {
    const target = e.target as Element;
    const name =
        target instanceof Element ? target.getAttribute("data-name") : null;
    const { line } = resolveAt(e, name || undefined);
    pickOffset(line.min, name || undefined);
};

const close = () => {
    tip.value.show = false;
    emit("update:open", false);
};

/** 只关本地图弹层，不动上层日期时间 / 单元格编辑器 */
const pickOffset = (min: number, country?: string) => {
    selectedMin.value = min;
    tip.value.show = false;
    emit("select", {
        offset: min,
        label: formatOffset(min),
        country,
    });
    emit("update:open", false);
};

/** 工具提示位置（屏幕坐标，简单跟随） */
const tip = ref({ x: 0, y: 0, show: false });
const onMapMoveTip = (e: MouseEvent) => {
    tip.value = { x: e.clientX + 12, y: e.clientY + 12, show: true };
    onMapMove(e);
};
</script>

<template>
    <Teleport to="body">
        <div
            v-if="open"
            class="glass-overlay zx-tz-map fixed inset-0 z-[11000] flex items-center justify-center p-4"
            @click.self="close"
            @pointerdown.stop
            @click.stop
        >
            <div
                ref="modalRef"
                class="modal-content flex max-h-[92vh] w-full max-w-[880px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                @click.stop
            >
                <div
                    class="flex flex-shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3"
                >
                    <div>
                        <div class="text-sm font-semibold text-zx-text-strong">
                            选择时区
                        </div>
                        <div class="text-[11px] text-zx-text-subtle">
                            点击国家或时区带（同一国家可能跨多个时区）
                            <span
                                v-if="modelValue"
                                class="ml-1 font-mono text-zx-primary"
                                >{{ modelValue }}</span
                            >
                        </div>
                    </div>
                    <button
                        type="button"
                        class="btn-touch cursor-pointer rounded-md p-1.5 text-zx-text-muted hover:bg-slate-100 hover:text-zx-text"
                        @click="close"
                    >
                        <X class="h-4 w-4" />
                    </button>
                </div>

                <div
                    class="relative min-h-0 flex-1 overflow-auto bg-slate-50/80 p-3"
                >
                    <svg
                        :viewBox="`0 0 ${MAP_W} ${MAP_H}`"
                        class="mx-auto block h-auto w-full max-w-[840px] select-none rounded-xl border border-slate-200 bg-white"
                        @mousemove="onMapMoveTip"
                        @mouseleave="onMapLeave"
                        @click="onMapClick"
                    >
                        <!-- 海洋底 -->
                        <rect
                            :width="MAP_W"
                            :height="MAP_H"
                            fill="var(--zx-color-surface-muted)"
                        />

                        <!-- 经纬参考线（淡） -->
                        <g
                            stroke="var(--zx-color-border)"
                            stroke-width="0.25"
                            opacity="0.5"
                        >
                            <line
                                v-for="lat in [-60, -30, 0, 30, 60]"
                                :key="`lat${lat}`"
                                x1="0"
                                :x2="MAP_W"
                                :y1="90 - lat"
                                :y2="90 - lat"
                            />
                        </g>

                        <!-- 国家 -->
                        <g
                            v-for="c in countries"
                            :key="c.id"
                            :data-name="c.name"
                            class="tz-country cursor-pointer"
                            :class="
                                hoverCountry === c.name
                                    ? 'tz-country-hover'
                                    : ''
                            "
                        >
                            <path
                                :d="c.d"
                                :data-name="c.name"
                                :fill="
                                    hoverCountry === c.name
                                        ? 'var(--zx-color-primary-tint)'
                                        : 'var(--zx-slate-300, #cbd5e1)'
                                "
                                :stroke="
                                    hoverCountry === c.name
                                        ? 'var(--zx-color-primary)'
                                        : 'var(--zx-color-border)'
                                "
                                :stroke-width="hoverCountry === c.name ? 0.6 : 0.25"
                                stroke-linejoin="round"
                            />
                        </g>

                        <!-- UTC 偏移竖线 -->
                        <g>
                            <template
                                v-for="line in offsetLines"
                                :key="line.min"
                            >
                                <line
                                    :x1="line.lon + 180"
                                    :x2="line.lon + 180"
                                    y1="0"
                                    :y2="MAP_H"
                                    :stroke="
                                        matchSelected(line.min) ||
                                        hoverOffset?.min === line.min
                                            ? 'var(--zx-color-primary)'
                                            : 'var(--zx-color-border)'
                                    "
                                    :stroke-width="
                                        matchSelected(line.min) ? 1.2 : 0.45
                                    "
                                    :opacity="
                                        matchSelected(line.min) ||
                                        hoverOffset?.min === line.min
                                            ? 0.95
                                            : 0.35
                                    "
                                    :stroke-dasharray="
                                        line.min % 60 === 0 ? undefined : '2 2'
                                    "
                                />
                                <!-- 整点偏移标注 -->
                                <text
                                    :x="line.lon + 180"
                                    y="8"
                                    text-anchor="middle"
                                    font-size="5"
                                    fill="var(--zx-color-text-subtle)"
                                    font-family="ui-monospace, monospace"
                                >
                                    {{ line.label.replace(":00", "") }}
                                </text>
                            </template>
                        </g>
                    </svg>
                </div>

                <!-- 底部：当前悬停 / 已选 + 常用偏移 -->
                <div
                    class="flex flex-shrink-0 flex-wrap items-center gap-2 border-t border-slate-200 px-4 py-2.5"
                >
                    <div class="mr-2 min-w-[140px] text-[11px] text-zx-text-muted">
                        <template v-if="hoverOffset">
                            <span class="text-zx-text-subtle">{{
                                hoverOffset.country || "海洋/未识别"
                            }}</span>
                            <span class="mx-1">·</span>
                            <span class="font-mono text-zx-text">{{
                                hoverOffset.label
                            }}</span>
                        </template>
                        <template v-else>
                            悬停查看国家 / 偏移
                        </template>
                    </div>
                    <div class="flex flex-1 flex-wrap gap-1">
                        <button
                            v-for="m in [
                                480, 540, 0, 60, 330, -300, -480,
                            ]"
                            :key="m"
                            type="button"
                            class="btn-touch cursor-pointer rounded-full border px-2.5 py-1 text-[11px] transition-colors"
                            :class="
                                matchSelected(m)
                                    ? 'border-zx-primary bg-zx-primary text-[color:var(--zx-color-on-primary)]'
                                    : 'border-slate-200 text-zx-text-muted hover:border-zx-primary hover:text-zx-primary'
                            "
                            @click.stop="
                                pickOffset(m)
                            "
                        >
                            {{ formatOffset(m) }}
                        </button>
                    </div>
                </div>
            </div>

            <!-- 悬停提示 -->
            <div
                v-if="tip.show && hoverOffset"
                class="pointer-events-none fixed z-[11001] rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] shadow-lg"
                :style="{ left: `${tip.x}px`, top: `${tip.y}px` }"
            >
                <span class="text-zx-text-subtle">{{
                    hoverOffset.country || "—"
                }}</span>
                <span class="mx-1 text-zx-text-subtle">·</span>
                <span class="font-mono text-zx-primary">{{
                    hoverOffset.label
                }}</span>
            </div>
        </div>
    </Teleport>
</template>

<style scoped>
.tz-country path {
    transition:
        fill 0.12s ease,
        stroke 0.12s ease;
}
</style>
