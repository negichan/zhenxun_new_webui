/**
 * 图片查看指令：给任意元素打上标记，双击即可打开全局图片查看器。
 *
 * 用法：
 *   <img v-image-viewer ...>                     —— 双击打开这张图（单图）
 *   <img v-image-viewer="someSrc" ...>           —— 显式指定查看的地址
 *   <img v-image-viewer:chat ...>                —— 带「组」标记：双击时收集
 *                                                   DOM 里所有同组标记的图片
 *                                                   组成序列，可左右翻页
 *
 * 组内翻页序列在双击瞬间从 DOM 收集（按文档顺序、去重），因此虚拟列表
 * / 窗口渲染下只翻当前已挂载的图，无需任何登记簿与生命周期管理。
 * 查看器实例全局单例（懒挂载），各页面不再各自持有组件与收集逻辑。
 */
import { createApp, h, type Directive } from "vue";
import ZxImageViewer from "@/components/zxcomponent/ZxImageViewer.vue";

let vm: {
    open: (urls: string | string[], index?: number) => void;
} | null = null;

/** 懒挂载全局单例（参照 WhiteScreen 的 ensure 模式） */
function ensure() {
    if (vm) return;
    const container = document.createElement("div");
    document.body.appendChild(container);
    const app = createApp({
        render() {
            return h(ZxImageViewer, {
                ref: (el: any) => (vm = el),
            });
        },
    });
    app.mount(container);
}

/** 取元素当前展示的图片地址：元素自身是 img，或内部第一张 img */
function resolveSrc(el: HTMLElement): string {
    const img =
        el instanceof HTMLImageElement ? el : el.querySelector("img");
    return img ? img.currentSrc || img.src : "";
}

/** 命令式打开全局查看器（无对应 DOM 元素时使用，如文件页的 base64 图片） */
export function openImageViewer(urls: string | string[], initial = 0) {
    ensure();
    if (!vm) return;
    vm.open(urls, initial);
}

function openFrom(el: HTMLElement, value: string | undefined) {
    ensure();
    if (!vm) return;

    const current = (value ?? "").trim() || resolveSrc(el);
    if (!current) return;

    const group = el.getAttribute("data-image-viewer-group");
    if (group) {
        const srcs: string[] = [];
        document
            .querySelectorAll<HTMLElement>(
                `[data-image-viewer-group="${group}"]`,
            )
            .forEach((marked) => {
                const src = resolveSrc(marked);
                if (src && !srcs.includes(src)) srcs.push(src);
            });
        if (!srcs.includes(current)) srcs.push(current);
        vm.open(srcs, Math.max(0, srcs.indexOf(current)));
        return;
    }
    vm.open([current], 0);
}

const handlers = new WeakMap<HTMLElement, () => void>();

export const vImageViewer: Directive<HTMLElement, string | undefined> = {
    mounted(el, binding) {
        // dataset 的 camelCase→kebab 转换会吃掉大写 V（imageViewGroup →
        // image-view-group），这里直写属性保证名字与收集选择器一致
        if (binding.arg) el.setAttribute("data-image-viewer-group", binding.arg);
        el.style.cursor = "pointer";
        const handler = () => openFrom(el, binding.value);
        handlers.set(el, handler);
        el.addEventListener("dblclick", handler);
    },
    updated(el, binding) {
        if (binding.arg) el.setAttribute("data-image-viewer-group", binding.arg);
    },
    unmounted(el) {
        const handler = handlers.get(el);
        if (handler) el.removeEventListener("dblclick", handler);
        handlers.delete(el);
    },
};
