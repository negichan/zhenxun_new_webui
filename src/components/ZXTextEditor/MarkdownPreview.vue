<script setup lang="ts">
/**
 * Markdown 预览视图：marked 渲染 + 相对路径图片经文件接口读成 base64 回填。
 * 自带防抖与图片缓存，父组件负责"编辑/预览"切换（v-if 控制挂载即触发渲染）。
 */
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import { fileApi } from "@/utils/api-next";

const props = defineProps<{
    content: string;
    /** 文件路径，用于把 md 里的相对图片路径解析成服务器绝对路径 */
    path?: string;
}>();

const containerRef = ref<HTMLElement | null>(null);
const previewHtml = ref("");

let markedPromise: Promise<typeof import("marked")> | null = null;

const renderPreview = async () => {
    if (!markedPromise) markedPromise = import("marked");
    const { marked } = await markedPromise;
    try {
        previewHtml.value = await marked.parse(props.content || "", {
            async: false,
            gfm: true,
            breaks: true,
        });
    } catch {
        previewHtml.value = "";
    }
};

// ---- 相对路径资源解析：md 里引用的同目录图片通过文件接口读成 base64 ----
const imageFetchCache = new Map<string, Promise<string | null>>();

/** 把 md 内的相对 src 解析为服务器绝对路径；非相对路径返回 null */
const resolveRelativeImagePath = (src: string): string | null => {
    const raw = src.trim();
    if (!raw || !props.path) return null;
    if (/^(data|https?):/i.test(raw) || raw.startsWith("//")) return null;

    const dir = props.path.replace(/\\/g, "/").split("/").slice(0, -1).join("/");
    const base = dir.startsWith("/") ? `file://${dir}/` : `file:///${dir}/`;
    try {
        let pathname = new URL(raw, base).pathname;
        // Windows 盘符路径（/C:/a/b.png）去掉 URL 器加的首斜杠
        if (/^\/[A-Za-z]:\//.test(pathname)) pathname = pathname.slice(1);
        return decodeURIComponent(pathname);
    } catch {
        return null;
    }
};

const fetchRelativeImage = (serverPath: string): Promise<string | null> => {
    if (!imageFetchCache.has(serverPath)) {
        imageFetchCache.set(
            serverPath,
            fileApi
                .readFile(serverPath, { skipInterceptor: true, as_image: true })
                .then((res) =>
                    res?.success && res?.data?.content ? res.data.content : null,
                )
                .catch(() => null),
        );
    }
    return imageFetchCache.get(serverPath)!;
};

/** 预览渲染后把相对路径图片替换为可展示的 base64 */
const resolvePreviewImages = () => {
    const container = containerRef.value;
    if (!container) return;

    container.querySelectorAll("img").forEach((img) => {
        const serverPath = resolveRelativeImagePath(img.getAttribute("src") || "");
        if (!serverPath) return;
        img.alt = img.alt || serverPath.split("/").pop() || "";
        fetchRelativeImage(serverPath).then((dataUrl) => {
            if (dataUrl) img.src = dataUrl;
            else img.classList.add("md-img-broken");
        });
    });
};

watch(previewHtml, () => nextTick(resolvePreviewImages));

let debounceTimer: number | undefined;

watch(
    () => [props.content, props.path],
    () => {
        window.clearTimeout(debounceTimer);
        debounceTimer = window.setTimeout(renderPreview, 300);
    },
    { immediate: true },
);

onBeforeUnmount(() => {
    window.clearTimeout(debounceTimer);
});
</script>

<template>
    <div ref="containerRef" class="md-preview" v-html="previewHtml"></div>
</template>

<style scoped>
.md-preview {
    min-height: 0;
    padding: 1.25rem 1.5rem 2rem;
    color: var(--zx-color-text-strong);
    font-size: 0.9375rem;
    line-height: 1.75;
    overflow-wrap: break-word;
}

.md-preview :deep(h1),
.md-preview :deep(h2),
.md-preview :deep(h3),
.md-preview :deep(h4),
.md-preview :deep(h5),
.md-preview :deep(h6) {
    margin: 1.5em 0 0.6em;
    color: var(--zx-color-text-strong);
    font-weight: 700;
    line-height: 1.35;
}

.md-preview :deep(h1) {
    padding-bottom: 0.35em;
    border-bottom: 1px solid var(--zx-color-border);
    font-size: 1.6em;
}

.md-preview :deep(h2) {
    padding-bottom: 0.3em;
    border-bottom: 1px solid var(--zx-color-border);
    font-size: 1.35em;
}

.md-preview :deep(h3) {
    font-size: 1.15em;
}

.md-preview :deep(h4) {
    font-size: 1em;
}

.md-preview :deep(p) {
    margin: 0.75em 0;
}

.md-preview :deep(a) {
    color: var(--zx-color-primary);
    text-decoration: underline;
    text-underline-offset: 2px;
}

.md-preview :deep(ul),
.md-preview :deep(ol) {
    margin: 0.75em 0;
    padding-left: 1.5em;
}

.md-preview :deep(ul) {
    list-style: disc;
}

.md-preview :deep(ol) {
    list-style: decimal;
}

.md-preview :deep(li) {
    margin: 0.25em 0;
}

.md-preview :deep(blockquote) {
    margin: 1em 0;
    border-left: 3px solid var(--zx-color-primary);
    border-radius: 0 0.5rem 0.5rem 0;
    background-color: var(--zx-color-surface-muted);
    padding: 0.5em 1em;
    color: var(--zx-color-text-muted);
}

.md-preview :deep(code) {
    border-radius: 0.375rem;
    background-color: var(--zx-color-surface-muted);
    padding: 0.15em 0.4em;
    font-family: "JetBrains Mono", "Cascadia Mono", Consolas, monospace;
    font-size: 0.85em;
}

.md-preview :deep(pre) {
    margin: 1em 0;
    border: 1px solid var(--zx-color-border);
    border-radius: 0.75rem;
    background-color: var(--zx-color-surface-muted);
    padding: 0.875rem 1rem;
    overflow-x: auto;
}

.md-preview :deep(pre code) {
    background: transparent;
    padding: 0;
    font-size: 0.85em;
    line-height: 1.6;
}

.md-preview :deep(table) {
    margin: 1em 0;
    border-collapse: collapse;
    width: 100%;
    font-size: 0.875em;
}

.md-preview :deep(th),
.md-preview :deep(td) {
    border: 1px solid var(--zx-color-border);
    padding: 0.45em 0.75em;
    text-align: left;
}

.md-preview :deep(th) {
    background-color: var(--zx-color-surface-muted);
    font-weight: 600;
}

.md-preview :deep(hr) {
    margin: 1.5em 0;
    border: 0;
    border-top: 1px solid var(--zx-color-border);
}

.md-preview :deep(img) {
    max-width: 100%;
    border-radius: 0.75rem;
}

/* 相对路径图片解析失败时的占位样式 */
.md-preview :deep(img.md-img-broken) {
    display: inline-block;
    min-width: 120px;
    min-height: 60px;
    border: 1px dashed var(--zx-color-border);
    background-color: var(--zx-color-surface-muted);
    object-fit: contain;
    padding: 0.5rem;
}
</style>
