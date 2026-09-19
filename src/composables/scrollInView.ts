/**
 * 仅在指定容器内滚动，避免 Element.scrollIntoView 连带滚动弹窗/页面
 * （首屏外节点选中时若 scroll 作用在外层，会出现大块空白/错位）
 */
export function scrollElementInContainer(
    container: HTMLElement | null | undefined,
    el: HTMLElement | null | undefined,
    axis: "vertical" | "horizontal" | "both" = "vertical",
): void {
    if (!container || !el) return;
    const c = container.getBoundingClientRect();
    const e = el.getBoundingClientRect();

    if (axis === "vertical" || axis === "both") {
        if (e.top < c.top) {
            container.scrollTop -= c.top - e.top;
        } else if (e.bottom > c.bottom) {
            container.scrollTop += e.bottom - c.bottom;
        }
    }
    if (axis === "horizontal" || axis === "both") {
        if (e.left < c.left) {
            container.scrollLeft -= c.left - e.left;
        } else if (e.right > c.right) {
            container.scrollLeft += e.right - c.right;
        }
    }
}
