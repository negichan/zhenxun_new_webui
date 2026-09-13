import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import type { Ref } from "vue";

/**
 * 固定行高虚拟滚动（与 LogEntries 同款思路的复用版）
 * 行高必须固定；任意时刻只渲染可视窗口 ± overscan 的行。
 *
 * @param getCount 响应式取当前条目总数
 * @param rowHeight 固定行高（px）
 */
export function useVirtualList(
    getCount: () => number,
    rowHeight: number,
    overscan = 6,
) {
    const container: Ref<HTMLElement | null> = ref(null);
    const scrollTop = ref(0);
    const viewportHeight = ref(0);
    let resizeObserver: ResizeObserver | null = null;

    const totalHeight = computed(() => getCount() * rowHeight);

    const startIndex = computed(() =>
        Math.max(0, Math.floor(scrollTop.value / rowHeight) - overscan),
    );

    const endIndex = computed(() =>
        Math.min(
            getCount(),
            Math.ceil((scrollTop.value + viewportHeight.value) / rowHeight) +
                overscan,
        ),
    );

    const onScroll = () => {
        scrollTop.value = container.value?.scrollTop ?? 0;
    };

    onMounted(() => {
        const el = container.value;
        if (el) {
            viewportHeight.value = el.clientHeight;
            resizeObserver = new ResizeObserver(() => {
                viewportHeight.value = el.clientHeight;
            });
            resizeObserver.observe(el);
        }
    });

    onBeforeUnmount(() => {
        resizeObserver?.disconnect();
        resizeObserver = null;
    });

    return { container, totalHeight, startIndex, endIndex, onScroll };
}
