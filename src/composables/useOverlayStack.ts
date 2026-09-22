import { computed, onUnmounted, ref, watch, type Ref } from "vue";

/**
 * 全局浮层栈（Overlay Stack）
 * 多层弹窗时「点外部 / Esc」只关最上层，一层一层来。
 *
 * 接入方式（推荐）：
 *   useZxOverlay({
 *     id: OVERLAY_ID.myModal,
 *     open: visibleRef,
 *     el: () => rootRef.value,
 *     anchors: () => [triggerRef.value],
 *     onClose: () => emit("close"), // 可省略，默认 open=false
 *   });
 *
 * 也可用低层 API：pushOverlay / removeOverlay。
 * 应用入口已 installOverlayStack()（main.ts）。
 */

export interface OverlayHandle {
    id: string;
    /** 浮层根节点 */
    el?: () => HTMLElement | null;
    /** 触发锚点（按钮等），点它们不算「外部」 */
    anchors?: () => Array<HTMLElement | null | undefined>;
    onClose?: () => void;
    closeOnOutsideClick?: boolean;
    closeOnEsc?: boolean;
}

const overlays = ref<OverlayHandle[]>([]);
let installed = false;

const isInside = (h: OverlayHandle, t: Node | null) => {
    if (!t) return false;
    const el = h.el?.();
    if (el && (el === t || el.contains(t))) return true;
    const anchors = h.anchors?.() || [];
    return anchors.some((a) => a && (a === t || a.contains(t)));
};

const closeTop = () => {
    const top = overlays.value[overlays.value.length - 1];
    if (!top) return;
    top.onClose?.();
};

const onPointerDown = (e: PointerEvent) => {
    if (!overlays.value.length) return;
    const t = e.target as Node | null;
    const top = overlays.value[overlays.value.length - 1];
    if (top.closeOnOutsideClick === false) return;
    if (isInside(top, t)) return;
    closeTop();
};

const onKeydown = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    const top = overlays.value[overlays.value.length - 1];
    if (!top || top.closeOnEsc === false) return;
    e.preventDefault();
    e.stopPropagation();
    top.onClose?.();
};

/** 全局安装一次（main.ts）；composable 内也会兜底安装 */
export function installOverlayStack() {
    if (installed) return;
    installed = true;
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeydown, true);
}

export function useOverlayStack() {
    installOverlayStack();

    const pushOverlay = (handle: OverlayHandle) => {
        overlays.value = [
            ...overlays.value.filter((o) => o.id !== handle.id),
            handle,
        ];
    };

    const removeOverlay = (id: string) => {
        if (!overlays.value.some((o) => o.id === id)) return;
        overlays.value = overlays.value.filter((o) => o.id !== id);
    };

    const isTopOverlay = (id: string) => {
        const top = overlays.value[overlays.value.length - 1];
        return top?.id === id;
    };

    const isFocusInAnyOverlay = (t: Node | null) => {
        return overlays.value.some((o) => isInside(o, t));
    };

    const topOverlayId = computed(
        () => overlays.value[overlays.value.length - 1]?.id || null,
    );

    return {
        overlays,
        topOverlayId,
        pushOverlay,
        removeOverlay,
        isTopOverlay,
        isFocusInAnyOverlay,
    };
}

export interface ZxOverlayOptions {
    /** 基础 id；多实例用 uniqueSuffix 区分 */
    id: string;
    /** 打开状态，true 时入栈 */
    open: Ref<boolean>;
    el?: () => HTMLElement | null;
    anchors?: () => Array<HTMLElement | null | undefined>;
    /** 点外部 / Esc；默认将 open 置为 false */
    onClose?: () => void;
    closeOnOutsideClick?: boolean;
    closeOnEsc?: boolean;
    /** 例如 MessageBox 多开：() => instanceId */
    uniqueSuffix?: () => string;
}

/**
 * 弹窗一键接入全局浮层栈
 * open 变化时自动 push/remove；组件卸载时清理
 */
export function useZxOverlay(opts: ZxOverlayOptions) {
    const { pushOverlay, removeOverlay, isTopOverlay, isFocusInAnyOverlay } =
        useOverlayStack();

    const resolveId = () =>
        opts.uniqueSuffix ? `${opts.id}::${opts.uniqueSuffix()}` : opts.id;

    const closeSelf = () => {
        if (opts.onClose) opts.onClose();
        else opts.open.value = false;
    };

    const sync = () => {
        const id = resolveId();
        if (opts.open.value) {
            pushOverlay({
                id,
                el: opts.el,
                anchors: opts.anchors,
                onClose: closeSelf,
                closeOnOutsideClick: opts.closeOnOutsideClick,
                closeOnEsc: opts.closeOnEsc,
            });
        } else {
            removeOverlay(id);
        }
    };

    watch(opts.open, sync, { immediate: true });
    onUnmounted(() => removeOverlay(resolveId()));

    return {
        isTopOverlay: () => isTopOverlay(resolveId()),
        isFocusInAnyOverlay,
        closeSelf,
        overlayId: resolveId,
    };
}

/** 业务弹窗约定 id（可按需追加） */
export const OVERLAY_ID = {
    cellDateTime: "zx-overlay-cell-dt",
    dateTimePicker: "zx-overlay-dtp",
    timezoneMap: "zx-overlay-tz-map",
    cellEditor: "zx-overlay-cell-editor",
    messageBox: "zx-overlay-msgbox",
    settings: "zx-overlay-settings",
    pluginConfig: "zx-overlay-plugin-config",
    fileEditor: "zx-overlay-file-editor",
    renameDialog: "zx-overlay-rename",
    newItemDialog: "zx-overlay-new-item",
    chatHistory: "zx-overlay-chat-history",
    archivePreview: "zx-overlay-archive",
    forward: "zx-overlay-forward",
} as const;
