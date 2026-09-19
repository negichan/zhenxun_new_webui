<script setup lang="ts">
/**
 * 压缩包浏览器（文件页预览弹窗与文件编辑器共用逻辑，两种布局）：
 * - panel（编辑器内）：左分级树 + 右内容窗格；
 * - dialog（文件页弹窗）：整宽分级列表，点文件切换到内容视图（带返回）。
 * 点击嵌套压缩包可继续钻入，面包屑回退；文本/图片直接预览。
 */
import { computed, ref, watch } from "vue";
import {
    Archive,
    ArrowLeft,
    ChevronDown,
    ChevronRight,
    FileText,
    Folder,
    FolderOpen,
    Image as ImageIcon,
    Loader2,
} from "lucide-vue-next";
import { fileApi } from "@/utils/api-next";
import type { ArchiveEntry } from "@/types/api-next.types";
import { getFileIcon, isArchiveFile, isImageFile } from "@/components/FileEditorModal/fileIcons";
import { b64ToBytes, b64ToUtf8 } from "@/components/FileEditorModal/binary";

const props = withDefaults(
    defineProps<{
        archivePath: string;
        archiveName: string;
        /** panel = 编辑器双栏；dialog = 文件页整宽列表 */
        layout?: "panel" | "dialog";
    }>(),
    { layout: "panel" },
);

/** 钻入链：每一项是所在归档内的压缩包成员名 */
const chain = ref<string[]>([]);
const entries = ref<ArchiveEntry[]>([]);
const archiveType = ref("");
const totalCount = ref(0);
const truncated = ref(false);
const loading = ref(false);
const loadError = ref("");

/** 展开的目录集合（按当前层级的完整成员路径） */
const expanded = ref<Set<string>>(new Set());

interface PaneState {
    name: string;
    kind: "text" | "image" | "none";
    text?: string;
    truncatedText?: boolean;
    imageUrl?: string;
    sizeText?: string;
}
const pane = ref<PaneState | null>(null);
const paneLoading = ref(false);

const TEXT_PREVIEW_LIMIT = 512 * 1024;

const load = async () => {
    loading.value = true;
    loadError.value = "";
    pane.value = null;
    try {
        const res = await fileApi.previewArchive(props.archivePath, chain.value);
        if (res?.success && res.data) {
            entries.value = res.data.entries || [];
            archiveType.value = res.data.archive_type;
            totalCount.value = res.data.total_count;
            truncated.value = res.data.truncated;
            // 默认展开顶层目录（zip 常无显式目录条目，从路径首段推导）
            const topDirs = new Set<string>();
            for (const e of entries.value) {
                const segs = e.name.split("/").filter(Boolean);
                if (segs.length > 1) topDirs.add(segs[0]);
            }
            expanded.value = topDirs;
        } else {
            loadError.value = res?.message || "压缩包读取失败";
        }
    } catch (e) {
        loadError.value = (e as Error)?.message || "压缩包读取失败";
    } finally {
        loading.value = false;
    }
};

watch(() => props.archivePath, load, { immediate: true });

// ==================== 条目树（扁平化渲染，避免递归组件） ====================

interface FlatNode {
    name: string;
    path: string;
    isDir: boolean;
    depth: number;
    sizeFormatted?: string;
}

const tree = computed<FlatNode[]>(() => {
    // 1. 由全路径条目构建目录树（zip 常没有显式目录条目，从路径段推导）
    interface TNode {
        name: string;
        path: string;
        isDir: boolean;
        children: Map<string, TNode>;
        sizeFormatted?: string;
    }
    const roots = new Map<string, TNode>();
    for (const e of entries.value) {
        const segs = e.name.split("/").filter(Boolean);
        if (!segs.length) continue;
        let level = roots;
        let accPath = "";
        let node: TNode | undefined;
        for (let i = 0; i < segs.length; i++) {
            const seg = segs[i];
            accPath = accPath ? `${accPath}/${seg}` : seg;
            const isLast = i === segs.length - 1;
            node = level.get(seg);
            if (!node) {
                node = {
                    name: seg,
                    path: accPath,
                    isDir: !isLast || e.is_dir,
                    children: new Map(),
                };
                level.set(seg, node);
            }
            level = node.children;
        }
        if (node && !e.is_dir) node.sizeFormatted = e.size_formatted || undefined;
    }
    // 2. 深度优先扁平化（目录在前，按名称排序；尊重展开状态）
    const out: FlatNode[] = [];
    const walk = (nodes: Map<string, TNode>, depth: number) => {
        const arr = [...nodes.values()].sort(
            (a, b) =>
                Number(!a.isDir) - Number(!b.isDir) ||
                a.name.localeCompare(b.name, "zh-CN", { sensitivity: "base" }),
        );
        for (const n of arr) {
            out.push({
                name: n.name,
                path: n.path,
                isDir: n.isDir,
                depth,
                sizeFormatted: n.sizeFormatted,
            });
            if (n.isDir && expanded.value.has(n.path)) {
                walk(n.children, depth + 1);
            }
        }
    };
    walk(roots, 0);
    return out;
});

const toggleDir = (node: FlatNode) => {
    const next = new Set(expanded.value);
    if (next.has(node.path)) next.delete(node.path);
    else next.add(node.path);
    expanded.value = next;
};

// ==================== 内容窗格 ====================

const openFile = async (node: FlatNode) => {
    if (isArchiveFile(node.name)) {
        // 嵌套压缩包：钻入
        chain.value = [...chain.value, node.path];
        await load();
        return;
    }
    paneLoading.value = true;
    pane.value = { name: node.name, kind: "none", sizeText: node.sizeFormatted };
    try {
        const res = await fileApi.readArchiveEntry(props.archivePath, [
            ...chain.value,
            node.path,
        ]);
        if (res?.success && res.data?.encoding === "base64") {
            const b64 = res.data.content || "";
            if (isImageFile(node.name)) {
                const ext = node.name.split(".").pop()?.toLowerCase() || "";
                const mime = ext === "svg" ? "image/svg+xml" : `image/${ext === "jpg" ? "jpeg" : ext}`;
                pane.value = {
                    name: node.name,
                    kind: "image",
                    imageUrl: `data:${mime};base64,${b64}`,
                    sizeText: node.sizeFormatted,
                };
            } else {
                const bytes = b64ToBytes(b64);
                const isText = !bytes.slice(0, 8192).includes(0);
                if (isText) {
                    const full = b64ToUtf8(b64);
                    const cut = full.length > TEXT_PREVIEW_LIMIT;
                    pane.value = {
                        name: node.name,
                        kind: "text",
                        text: cut ? full.slice(0, TEXT_PREVIEW_LIMIT) : full,
                        truncatedText: cut,
                        sizeText: node.sizeFormatted,
                    };
                } else {
                    pane.value = {
                        name: node.name,
                        kind: "none",
                        sizeText: node.sizeFormatted,
                    };
                }
            }
        } else {
            pane.value = { name: node.name, kind: "none" };
            loadError.value = res?.message || "条目读取失败";
        }
    } catch (e) {
        pane.value = { name: node.name, kind: "none" };
        loadError.value = (e as Error)?.message || "条目读取失败";
    } finally {
        paneLoading.value = false;
    }
};

const onRowClick = (node: FlatNode) => {
    if (node.isDir) toggleDir(node);
    else openFile(node);
};

const crumbTo = (idx: number) => {
    chain.value = chain.value.slice(0, idx);
    load();
};

const selectedFile = computed(() => {
    if (!pane.value) return "";
    return [...chain.value, pane.value.name].join(" / ");
});
</script>

<template>
    <!-- ==================== panel：编辑器双栏布局 ==================== -->
    <div v-if="layout === 'panel'" class="flex min-h-0 flex-1 overflow-hidden">
        <!-- 左：分级条目树（未选中文件时占满整个区域） -->
        <div
            class="flex select-none flex-col overflow-hidden border-r border-slate-200 bg-slate-50/50"
            :class="pane ? 'w-60 flex-shrink-0' : 'min-w-0 flex-1'"
        >
            <!-- 面包屑（钻入链） -->
            <div
                class="flex h-8 flex-shrink-0 items-center gap-1 overflow-x-auto border-b border-slate-200 px-2 text-[11px] scrollbar-hide"
            >
                <button
                    class="flex-shrink-0 cursor-pointer rounded px-1 font-medium transition-colors"
                    :class="chain.length === 0 ? 'text-zx-text-muted' : 'text-zx-primary hover:underline'"
                    type="button"
                    @click="crumbTo(0)"
                >
                    {{ archiveName }}
                </button>
                <template v-for="(c, i) in chain" :key="c">
                    <span class="flex-shrink-0 text-zx-text-subtle">/</span>
                    <button
                        class="flex-shrink-0 cursor-pointer truncate rounded px-1 font-medium transition-colors"
                        :class="i === chain.length - 1 ? 'text-zx-text-muted' : 'text-zx-primary hover:underline'"
                        type="button"
                        @click="crumbTo(i + 1)"
                    >
                        {{ c.split("/").pop() }}
                    </button>
                </template>
                <span
                    v-if="archiveType"
                    class="ml-auto flex-shrink-0 rounded-md bg-zx-primary-soft px-1.5 text-[10px] font-semibold uppercase text-zx-primary"
                >{{ archiveType }}</span>
            </div>

            <div class="min-h-0 flex-1 overflow-y-auto py-1 text-xs">
                <div v-if="loading" class="flex items-center justify-center gap-2 py-10 text-zx-text-subtle">
                    <Loader2 class="h-4 w-4 animate-spin" />
                    <span>读取中...</span>
                </div>
                <p v-else-if="loadError" class="px-3 py-4 text-zx-danger">{{ loadError }}</p>
                <template v-else>
                    <div
                        v-if="truncated"
                        class="mx-2 mb-1 rounded-lg bg-zx-warning-soft px-2 py-1 text-[10px] text-zx-warning"
                    >
                        条目较多，仅展示前 {{ entries.length }} / {{ totalCount }}
                    </div>
                    <div
                        v-for="node in tree"
                        :key="node.path"
                        class="flex h-[24px] cursor-pointer items-center gap-1.5 rounded-md pr-2 text-zx-text-muted hover:bg-slate-200/60"
                        :style="{ paddingLeft: `${node.depth * 12 + 8}px` }"
                        :title="node.path"
                        @click="onRowClick(node)"
                    >
                        <template v-if="node.isDir">
                            <ChevronDown v-if="expanded.has(node.path)" class="h-3 w-3 flex-shrink-0 text-zx-text-subtle" />
                            <ChevronRight v-else class="h-3 w-3 flex-shrink-0 text-zx-text-subtle" />
                            <FolderOpen v-if="expanded.has(node.path)" class="h-4 w-4 flex-shrink-0 text-zx-primary" />
                            <Folder v-else class="h-4 w-4 flex-shrink-0 text-zx-primary" />
                        </template>
                        <span v-else class="w-3 flex-shrink-0"></span>
                        <component
                            :is="getFileIcon(node.name).icon"
                            v-if="!node.isDir"
                            class="h-4 w-4 flex-shrink-0"
                            :class="isArchiveFile(node.name) ? 'text-zx-warning' : getFileIcon(node.name).class"
                        />
                        <span class="min-w-0 flex-1 truncate">{{ node.name }}</span>
                        <span
                            v-if="!node.isDir && node.sizeFormatted"
                            class="flex-shrink-0 text-[10px] text-zx-text-subtle"
                        >{{ node.sizeFormatted }}</span>
                    </div>
                    <p v-if="tree.length === 0" class="py-10 text-center text-zx-text-subtle">
                        压缩包是空的
                    </p>
                </template>
            </div>
        </div>

        <!-- 右：内容窗格（仅在选中文件后渲染） -->
        <div v-if="pane" class="relative flex min-w-0 flex-1 flex-col bg-white">
            <div
                v-if="pane"
                class="flex h-8 flex-shrink-0 items-center gap-2 border-b border-slate-200 bg-slate-50/70 px-3 text-xs text-zx-text-muted"
            >
                <component
                    :is="pane.kind === 'image' ? ImageIcon : FileText"
                    class="h-3.5 w-3.5 flex-shrink-0"
                />
                <span class="truncate" :title="selectedFile">{{ selectedFile }}</span>
                <span v-if="pane.sizeText" class="flex-shrink-0 text-zx-text-subtle">{{ pane.sizeText }}</span>
            </div>

            <div v-if="paneLoading" class="flex flex-1 items-center justify-center text-zx-text-subtle">
                <Loader2 class="h-6 w-6 animate-spin text-zx-primary" />
            </div>

            <div
                v-else-if="pane?.kind === 'text'"
                class="min-h-0 flex-1 overflow-auto"
            >
                <pre
                    class="p-4 font-mono text-xs leading-5 whitespace-pre text-zx-text"
                >{{ pane.text }}<span
                        v-if="pane.truncatedText"
                        class="block font-sans text-zx-warning"
                    >…… 内容过大，仅显示前 512KB</span></pre>
            </div>

            <div
                v-else-if="pane?.kind === 'image'"
                class="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-slate-100/60 p-6"
            >
                <img
                    :src="pane.imageUrl"
                    :alt="pane.name"
                    class="max-h-full max-w-full rounded-lg shadow-md"
                />
            </div>

            <div
                v-else-if="pane"
                class="flex flex-1 flex-col items-center justify-center gap-2 text-zx-text-subtle"
            >
                <Archive class="h-10 w-10 opacity-50" />
                <p class="text-sm">二进制文件，暂不支持预览</p>
            </div>
        </div>
    </div>

    <!-- ==================== dialog：文件页整宽列表布局 ==================== -->
    <div v-else class="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
        <!-- 列表态 -->
        <template v-if="!pane">
            <!-- 面包屑工具条 -->
            <div
                class="flex h-9 flex-shrink-0 items-center gap-1.5 border-b border-slate-200 bg-slate-50/60 px-3 text-xs"
            >
                <button
                    class="cursor-pointer rounded px-1 font-medium transition-colors"
                    :class="chain.length === 0 ? 'text-zx-text-muted' : 'text-zx-primary hover:underline'"
                    type="button"
                    @click="crumbTo(0)"
                >
                    {{ archiveName }}
                </button>
                <template v-for="(c, i) in chain" :key="c">
                    <ChevronRight class="h-3 w-3 flex-shrink-0 text-zx-text-subtle" />
                    <button
                        class="cursor-pointer truncate rounded px-1 font-medium transition-colors"
                        :class="i === chain.length - 1 ? 'text-zx-text-muted' : 'text-zx-primary hover:underline'"
                        type="button"
                        @click="crumbTo(i + 1)"
                    >
                        {{ c.split("/").pop() }}
                    </button>
                </template>
                <span
                    v-if="archiveType"
                    class="ml-auto flex-shrink-0 rounded-md bg-zx-primary-soft px-1.5 text-[10px] font-semibold uppercase text-zx-primary"
                >{{ archiveType }}</span>
                <span class="flex-shrink-0 text-[11px] text-zx-text-subtle">
                    共 {{ totalCount }} 项
                </span>
            </div>

            <div class="min-h-0 flex-1 overflow-y-auto">
                <div v-if="loading" class="py-16 text-center text-zx-text-subtle">
                    <Loader2 class="mx-auto mb-3 h-8 w-8 animate-spin text-zx-primary" />
                    <p>正在读取压缩包...</p>
                </div>
                <p v-else-if="loadError" class="px-4 py-10 text-center text-sm text-zx-danger">
                    {{ loadError }}
                </p>
                <template v-else>
                    <div
                        v-if="truncated"
                        class="mx-4 mt-2 rounded-xl bg-zx-warning-soft px-3 py-2 text-xs text-zx-warning"
                    >
                        条目较多，仅展示前 {{ entries.length }} / {{ totalCount }}
                    </div>
                    <div
                        v-for="node in tree"
                        :key="node.path"
                        class="flex h-9 cursor-pointer items-center gap-2 border-b border-slate-100 px-4 text-sm transition-colors last:border-b-0 hover:bg-slate-50"
                        :style="{ paddingLeft: `${node.depth * 18 + 16}px` }"
                        :title="node.path"
                        @click="onRowClick(node)"
                    >
                        <template v-if="node.isDir">
                            <ChevronDown v-if="expanded.has(node.path)" class="h-3.5 w-3.5 flex-shrink-0 text-zx-text-subtle" />
                            <ChevronRight v-else class="h-3.5 w-3.5 flex-shrink-0 text-zx-text-subtle" />
                            <FolderOpen v-if="expanded.has(node.path)" class="h-4.5 w-4.5 flex-shrink-0 text-zx-primary" />
                            <Folder v-else class="h-4.5 w-4.5 flex-shrink-0 text-zx-primary" />
                        </template>
                        <span v-else class="w-3.5 flex-shrink-0"></span>
                        <component
                            :is="getFileIcon(node.name).icon"
                            v-if="!node.isDir"
                            class="h-4.5 w-4.5 flex-shrink-0"
                            :class="isArchiveFile(node.name) ? 'text-zx-warning' : getFileIcon(node.name).class"
                        />
                        <span class="min-w-0 flex-1 truncate text-zx-text">{{ node.name }}</span>
                        <span
                            v-if="!node.isDir && node.sizeFormatted"
                            class="flex-shrink-0 text-xs text-zx-text-subtle"
                        >{{ node.sizeFormatted }}</span>
                    </div>
                    <div v-if="tree.length === 0" class="py-16 text-center text-zx-text-subtle">
                        <Archive class="mx-auto mb-3 h-10 w-10 opacity-50" />
                        <p>压缩包是空的</p>
                    </div>
                </template>
            </div>
        </template>

        <!-- 内容态（点文件后） -->
        <template v-else>
            <div
                class="flex h-9 flex-shrink-0 items-center gap-2 border-b border-slate-200 bg-slate-50/60 px-3 text-xs"
            >
                <ZxButton
                    variant="ghost"
                    size="sm"
                    class="!px-2 text-zx-primary"
                    @click="pane = null"
                >
                    <ArrowLeft class="h-3.5 w-3.5" />
                    <span>返回列表</span>
                </ZxButton>
                <ChevronRight class="h-3 w-3 flex-shrink-0 text-zx-text-subtle" />
                <component
                    :is="pane.kind === 'image' ? ImageIcon : FileText"
                    class="h-3.5 w-3.5 flex-shrink-0 text-zx-text-subtle"
                />
                <span class="truncate font-medium text-zx-text-muted" :title="selectedFile">
                    {{ selectedFile }}
                </span>
                <span v-if="pane.sizeText" class="ml-auto flex-shrink-0 text-zx-text-subtle">
                    {{ pane.sizeText }}
                </span>
            </div>

            <div v-if="paneLoading" class="flex flex-1 items-center justify-center text-zx-text-subtle">
                <Loader2 class="h-7 w-7 animate-spin text-zx-primary" />
            </div>

            <div v-else-if="pane.kind === 'text'" class="min-h-0 flex-1 overflow-auto">
                <pre
                    class="p-4 font-mono text-xs leading-5 whitespace-pre text-zx-text"
                >{{ pane.text }}<span
                        v-if="pane.truncatedText"
                        class="block font-sans text-zx-warning"
                    >…… 内容过大，仅显示前 512KB</span></pre>
            </div>

            <div
                v-else-if="pane.kind === 'image'"
                class="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-slate-100/60 p-6"
            >
                <img
                    :src="pane.imageUrl"
                    :alt="pane.name"
                    class="max-h-full max-w-full rounded-lg shadow-md"
                />
            </div>

            <div
                v-else
                class="flex flex-1 flex-col items-center justify-center gap-2 text-zx-text-subtle"
            >
                <Archive class="h-10 w-10 opacity-50" />
                <p class="text-sm">二进制文件，暂不支持预览</p>
            </div>
        </template>
    </div>
</template>
