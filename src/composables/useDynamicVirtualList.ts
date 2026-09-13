import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import type { Ref } from "vue";

/**
 * 动态行高虚拟滚动
 *
 * 行高不固定（图片、多行文本等）时的方案：首次渲染按估算值排布，
 * 行挂载后实测真实高度记录在案（ResizeObserver 跟踪后续变化，如图片
 * 异步加载完成撑高），位置由前缀和推出，可视区外的行不渲染。
 *
 * @param items 响应式取条目数组
 * @param keyOf 条目稳定 key（测量缓存与重渲染去重的依据）
 * @param estimate 未测量行的估算高度
 */
export function useDynamicVirtualList<T>(
    items: () => T[],
    keyOf: (item: T) => string,
    estimate: (item: T) => number,
    overscan = 4,
) {
    const container: Ref<HTMLElement | null> = ref(null);
    const scrollTop = ref(0);
    const viewportHeight = ref(0);
    let resizeObserver: ResizeObserver | null = null;

    /** key → 实测高度 */
    const measured = reactive(new Map<string, number>());

    const heightOf = (item: T) =>
        measured.get(keyOf(item)) ?? estimate(item);

    /** 前缀和：offsets[i] = 第 i 行的 top，offsets[n] = 总高 */
    const offsets = computed(() => {
        const list = items();
        const arr = new Array<number>(list.length + 1).fill(0);
        for (let i = 0; i < list.length; i++) {
            arr[i + 1] = arr[i] + heightOf(list[i]);
        }
        return arr;
    });

    const totalHeight = computed(
        () => offsets.value[items().length] ?? 0,
    );

    /** 二分找 pos 落在哪一行 */
    const findIndex = (pos: number) => {
        const arr = offsets.value;
        let lo = 0;
        let hi = arr.length - 1;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (arr[mid + 1] <= pos) lo = mid + 1;
            else hi = mid;
        }
        return lo;
    };

    const startIndex = computed(() =>
        Math.max(0, findIndex(scrollTop.value) - overscan),
    );

    const endIndex = computed(() =>
        Math.min(
            items().length,
            findIndex(scrollTop.value + viewportHeight.value) + overscan + 1,
        ),
    );

    const onScroll = () => {
        scrollTop.value = container.value?.scrollTop ?? 0;
    };

    const rowObservers = new Map<string, ResizeObserver>();

    /** 行 ref 回调：挂载时实测 + 跟踪，卸载时解绑 */
    const measureItem = (el: unknown, item: T) => {
        const key = keyOf(item);
        const old = rowObservers.get(key);
        if (old) {
            old.disconnect();
            rowObservers.delete(key);
        }
        if (!(el instanceof HTMLElement)) return;

        const update = () => {
            const h = el.getBoundingClientRect().height;
            if (h > 0 && Math.abs((measured.get(key) ?? -1) - h) > 0.5) {
                measured.set(key, h);
            }
        };
        update();

        const observer = new ResizeObserver(update);
        observer.observe(el);
        rowObservers.set(key, observer);
    };

    // 测量缓存防膨胀：条目换页后旧缓存基本无复用价值，超限直接清空重来
    const trimMeasured = () => {
        if (measured.size > 3000) measured.clear();
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
        for (const observer of rowObservers.values()) observer.disconnect();
        rowObservers.clear();
    });

    return {
        container,
        totalHeight,
        startIndex,
        endIndex,
        onScroll,
        measureItem,
        trimMeasured,
        /** 第 index 行的 top（模板定位用） */
        offsetAt: (index: number) => offsets.value[index] ?? 0,
    };
}
