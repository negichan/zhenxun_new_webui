/**
 * 指针拖拽 / 双击触控 辅助
 * 统一 mouse + touch，resize 手柄只需 pointerdown
 */

export const startPointerDrag = (
    e: PointerEvent,
    handlers: {
        onMove: (ev: PointerEvent) => void;
        onUp?: (ev: PointerEvent) => void;
    },
): boolean => {
    if (e.pointerType === "mouse" && e.button !== 0) return false;
    e.preventDefault();

    const onMove = (ev: PointerEvent) => handlers.onMove(ev);
    const onUp = (ev: PointerEvent) => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        handlers.onUp?.(ev);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return true;
};

/** 简易双击/双触检测（同一 key，间隔内触发） */
export const createDoubleTap = (ms = 350) => {
    let lastKey = "";
    let lastT = 0;
    return (key: string) => {
        const now = Date.now();
        const hit = lastKey === key && now - lastT <= ms;
        lastKey = key;
        lastT = now;
        return hit;
    };
};
