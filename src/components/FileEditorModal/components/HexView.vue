<script setup lang="ts">
/**
 * 十六进制视图：offset | 字节 hex | ASCII，虚拟滚动渲染。
 * 移动端（<640px）自动降为 8 字节/行——16 行宽约 540px 在窄屏会被裁掉 ASCII 列。
 * 超过上限只渲染前 1MB（再大的文件 hex 逐行看意义不大）。
 */
import { computed, onScopeDispose, ref } from "vue";
import { useVirtualList } from "@vueuse/core";
import { b64ToBytes } from "../binary";

const props = defineProps<{
    bytesB64: string;
}>();

const MAX_HEX_BYTES = 1024 * 1024;

const mqNarrow = window.matchMedia("(max-width: 639px)");
const bytesPerRow = ref(mqNarrow.matches ? 8 : 16);
const onNarrowChange = (e: MediaQueryListEvent) => {
    bytesPerRow.value = e.matches ? 8 : 16;
};
mqNarrow.addEventListener("change", onNarrowChange);
onScopeDispose(() => mqNarrow.removeEventListener("change", onNarrowChange));

const headerHex = computed(() =>
    Array.from({ length: bytesPerRow.value }, (_, i) =>
        i.toString(16).padStart(2, "0").toUpperCase(),
    ).join(" "),
);

const bytes = computed<Uint8Array>(() => {
    try {
        return b64ToBytes(props.bytesB64);
    } catch {
        return new Uint8Array();
    }
});

const shownBytes = computed(() =>
    Math.min(bytes.value.length, MAX_HEX_BYTES),
);
const truncated = computed(() => bytes.value.length > MAX_HEX_BYTES);

const rowCount = computed(() =>
    Math.ceil(shownBytes.value / bytesPerRow.value),
);

const rowIndexes = computed(() =>
    Array.from({ length: rowCount.value }, (_, i) => i),
);

const { list: virtualRows, containerProps, wrapperProps } = useVirtualList(
    rowIndexes,
    { itemHeight: 22 },
);

const HEX = Array.from({ length: 256 }, (_, i) =>
    i.toString(16).padStart(2, "0"),
);

const rowHex = (idx: number) => {
    const bp = bytesPerRow.value;
    const start = idx * bp;
    const end = Math.min(start + bp, shownBytes.value);
    const parts: string[] = [];
    for (let i = start; i < end; i++) parts.push(HEX[bytes.value[i]]);
    return parts.join(" ").padEnd(bp * 3 - 1, " ");
};

const rowAscii = (idx: number) => {
    const bp = bytesPerRow.value;
    const start = idx * bp;
    const end = Math.min(start + bp, shownBytes.value);
    let s = "";
    for (let i = start; i < end; i++) {
        const c = bytes.value[i];
        s += c >= 0x20 && c <= 0x7e ? String.fromCharCode(c) : ".";
    }
    return s;
};
</script>

<template>
    <div class="flex h-full min-h-0 flex-col bg-white">
        <div
            class="flex h-7 flex-shrink-0 items-center gap-3 border-b border-slate-200 bg-slate-50 px-3 text-[10px] font-semibold uppercase tracking-wider text-zx-text-subtle"
        >
            <span class="w-16">Offset</span>
            <span>{{ headerHex }}</span>
            <span class="ml-auto">ASCII · {{ bytes.length.toLocaleString() }} 字节</span>
        </div>
        <div
            v-bind="containerProps"
            class="min-h-0 flex-1 overflow-y-auto font-mono text-xs leading-[22px]"
        >
            <div v-bind="wrapperProps">
                <div
                    v-for="{ data: idx, index } in virtualRows"
                    :key="index"
                    class="flex h-[22px] items-center gap-3 px-3 hover:bg-slate-100"
                >
                    <span class="w-16 flex-shrink-0 text-zx-text-subtle">
                        {{ (idx * bytesPerRow).toString(16).padStart(8, "0") }}
                    </span>
                    <span class="whitespace-pre text-zx-text-muted">{{ rowHex(idx) }}</span>
                    <span class="whitespace-pre text-zx-text-muted">{{ rowAscii(idx) }}</span>
                </div>
            </div>
        </div>
        <div
            v-if="truncated"
            class="flex-shrink-0 border-t border-slate-200 bg-zx-warning-soft px-3 py-1 text-[11px] text-zx-warning"
        >
            文件较大，hex 视图仅显示前 1MB
        </div>
    </div>
</template>
