<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref } from "vue";
import { Plus } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import { fileApi } from "@/utils/api-next";
import type { ArchiveEntry, FileItem } from "@/types/api-next.types";
import { ZXMessageBox, ZXNotification } from "@/services/ui";
import { useFilesStore } from "@/store/files";
import { useGlobalStore } from "@/store/global.ts";
import FileBreadcrumbBar from "./FileBreadcrumbBar.vue";
import FileListPanel from "./FileListPanel.vue";
import { openImageViewer } from "@/directives/imageViewer";
import NewItemDialog from "./NewItemDialog.vue";
import RenameDialog from "./RenameDialog.vue";

const FileEditorModal = defineAsyncComponent(
    () => import("@/components/FileEditorModal"),
);
const ArchivePreviewModal = defineAsyncComponent(
    () => import("./ArchivePreviewModal.vue"),
);

const fileStore = useFilesStore();
const globalStore = useGlobalStore();

const { showNewDialog } = storeToRefs(fileStore);

const currentPath = ref("");
const pathSegments = ref<string[]>([]);
const fileList = ref<FileItem[]>([]);
const loading = ref(false);
const searchQuery = ref("");

// ==================== 多选（资源管理器式） ====================
const selectedPaths = ref<Set<string>>(new Set());
let lastClickedIndex = -1;

const clearSelection = () => {
    selectedPaths.value = new Set();
    lastClickedIndex = -1;
};

// 单击选中、Ctrl+单击切换、Shift+单击范围选择，双击打开
const handleRowSelect = (file: FileItem, e: MouseEvent) => {
    const items = sortedFileList.value;
    const idx = items.findIndex((f) => f.path === file.path);

    if (!file.path) {
        clearSelection();
        return;
    }

    if (e.shiftKey && lastClickedIndex >= 0 && idx >= 0) {
        const [a, b] = [
            Math.min(lastClickedIndex, idx),
            Math.max(lastClickedIndex, idx),
        ];
        if (!e.ctrlKey && !e.metaKey) {
            selectedPaths.value = new Set();
        }
        const next = new Set(selectedPaths.value);
        for (let i = a; i <= b; i++) next.add(items[i].path);
        selectedPaths.value = next;
        return;
    }

    if (e.ctrlKey || e.metaKey) {
        const next = new Set(selectedPaths.value);
        if (next.has(file.path)) {
            next.delete(file.path);
        } else {
            next.add(file.path);
        }
        selectedPaths.value = next;
        lastClickedIndex = idx;
        return;
    }

    selectedPaths.value = new Set([file.path]);
    lastClickedIndex = idx;
};

const selectAll = () => {
    selectedPaths.value = new Set(sortedFileList.value.map((f) => f.path));
};

/** 当前选中的文件对象（地址栏批量操作用） */
const getSelectedFiles = () =>
    sortedFileList.value.filter((f) => selectedPaths.value.has(f.path));

const hasAnyModalOpen = () =>
    showEditor.value ||
    showNewDialog.value ||
    showRenameDialog.value ||
    showArchivePreview.value;

const handleKeydown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest("input, textarea, select, [contenteditable]")) return;
    if (hasAnyModalOpen()) return;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        selectAll();
    } else if (e.key === "Escape") {
        clearSelection();
    }
};

// ==================== 编辑器 / 图片预览 ====================
const showEditor = ref(false);
const editorInitialFile = ref<{
    path: string;
    name: string;
    content?: string;
} | null>(null);

const newItemType = ref<"file" | "folder">("file");
const newItemName = ref("");

const showRenameDialog = ref(false);
const renamingFile = ref<FileItem | null>(null);
const newName = ref("");

// ==================== 压缩包预览 ====================
const showArchivePreview = ref(false);
const archivePreviewLoading = ref(false);
const archivePreviewData = ref<{
    name: string;
    type: string;
    entries: ArchiveEntry[];
    total: number;
    truncated: boolean;
    path: string;
} | null>(null);

const resolveFilePath = (file: FileItem) =>
    file.path ||
    (currentPath.value ? `${currentPath.value}/${file.name}` : file.name);

const loadFileList = async (path = "") => {
    loading.value = true;

    try {
        const res = await fileApi.getFileList(path || undefined);

        if (res?.success && res?.data) {
            fileList.value = res.data.files || [];
            pathSegments.value = res.data.path_segments || [];
            currentPath.value = res.data.current_path || path;
            clearSelection();
        }
    } catch (error) {
        ZXNotification({
            title: "呜呼～",
            message: "文件列表加载失败了 (っ °Д °;) っ",
            type: "😭",
            position: "top-right",
        });
    } finally {
        loading.value = false;
    }
};

const enterFolder = (folder: FileItem) => {
    if (!folder.is_file) {
        loadFileList(resolveFilePath(folder));
    }
};

const goBack = () => {
    if (pathSegments.value.length > 0) {
        loadFileList(pathSegments.value.slice(0, -1).join("/"));
        return;
    }

    if (currentPath.value) {
        loadFileList("");
    }
};

const handleDelete = async (files: FileItem[]) => {
    if (files.length === 0) return;

    const message =
        files.length === 1
            ? `确定要删除 "${files[0].name}" 吗？此操作不可恢复！`
            : `确定要删除选中的 ${files.length} 项吗？此操作不可恢复！`;

    ZXMessageBox({
        title: files.length === 1 ? (files[0].is_file ? "删除文件" : "删除文件夹") : "批量删除",
        message,
        cancelButtonText: "取消",
        confirmButtonText: "删除",
        type: "error",
        onConfirm: async () => {
            let failed = 0;
            for (const file of files) {
                try {
                    const fullPath = resolveFilePath(file);
                    const res = file.is_file
                        ? await fileApi.deleteFile(fullPath)
                        : await fileApi.deleteFolder(fullPath);
                    if (!res?.success) failed++;
                } catch {
                    failed++;
                }
            }

            if (failed === 0) {
                ZXNotification({
                    title: "删除成功～",
                    message:
                        files.length === 1
                            ? `"${files[0].name}" 已经删除成功啦！`
                            : `${files.length} 项已经全部删除啦！`,
                    type: "👋",
                    position: "top-right",
                });
            } else {
                ZXNotification({
                    title: "删除失败",
                    message: `有 ${failed} 项删除失败了 (´；ω；\`)`,
                    type: "😭",
                    position: "top-right",
                });
            }
            loadFileList(currentPath.value);
        },
    });
};

const openEditor = async (file: FileItem) => {
    if (!file.is_file) return;

    const fullPath = resolveFilePath(file);

    if (file.is_image) {
        try {
            const res = await fileApi.readFile(fullPath, {
                skipInterceptor: true,
                as_image: true,
            });

            if (res?.success && res?.data && res.data.content) {
                // 复用聊天界面的全局图片查看器（缩放/旋转/左右翻页）
                openImageViewer([res.data.content]);
            }
        } catch (error) {
            ZXNotification({
                title: "加载失败",
                message: "图片加载失败了 (´；ω；`)",
                type: "😭",
                position: "top-right",
            });
        }

        return;
    }

    try {
        const res = await fileApi.readFile(fullPath, { skipInterceptor: true });

        if (res?.success && res?.data) {
            editorInitialFile.value = {
                path: fullPath,
                name: file.name,
                content: res.data.content,
            };
            showEditor.value = true;
        }
    } catch (error) {
        const errorMessage =
            (error as any)?.response?.data?.message ||
            "文件读取失败了 (´；ω；`)";

        ZXNotification({
            title: "读取失败",
            message: errorMessage,
            type: "😭",
            position: "top-right",
        });
    }
};

const handleNew = async () => {
    if (!newItemName.value.trim()) {
        ZXNotification({
            title: "提示",
            message: "名称不能为空哦～",
            type: "info",
            position: "top-right",
        });
        return;
    }

    try {
        const res =
            newItemType.value === "file"
                ? await fileApi.createFile(
                      currentPath.value || undefined,
                      newItemName.value,
                  )
                : await fileApi.createFolder(
                      currentPath.value || undefined,
                      newItemName.value,
                  );

        if (res?.success) {
            ZXNotification({
                title: "新建成功～",
                message: `${newItemType.value === "file" ? "文件" : "文件夹"} "${newItemName.value}" 创建成功啦！`,
                type: "🎉",
                position: "top-right",
                confetti: true,
            });
            showNewDialog.value = false;
            newItemName.value = "";
            loadFileList(currentPath.value);
        }
    } catch (error) {
        ZXNotification({
            title: "创建失败",
            message: "创建失败了 (´；ω；`)",
            type: "😭",
            position: "top-right",
        });
    }
};

const openRenameDialog = (file: FileItem) => {
    renamingFile.value = file;
    newName.value = file.name;
    showRenameDialog.value = true;
};

const handleRename = async () => {
    if (!newName.value.trim() || !renamingFile.value) {
        ZXNotification({
            title: "提示",
            message: "名称不能为空哦～",
            type: "info",
            position: "top-right",
        });
        return;
    }

    if (newName.value === renamingFile.value.name) {
        showRenameDialog.value = false;
        return;
    }

    try {
        const res = await fileApi.rename(
            resolveFilePath(renamingFile.value),
            newName.value,
        );

        if (res?.success) {
            ZXNotification({
                title: "重命名成功～",
                message: `"${renamingFile.value.name}" 已成功重命名为 "${newName.value}" 啦！`,
                type: "🎉",
                position: "top-right",
            });
            showRenameDialog.value = false;
            renamingFile.value = null;
            newName.value = "";
            loadFileList(currentPath.value);
        }
    } catch (error) {
        ZXNotification({
            title: "重命名失败",
            message: "重命名操作失败了 (´；ω；`)",
            type: "😭",
            position: "top-right",
        });
    }
};

// ==================== 下载 ====================
const downloading = ref(false);

const saveBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "download";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
};

const handleDownload = async (files: FileItem[]) => {
    if (files.length === 0 || downloading.value) return;
    downloading.value = true;

    try {
        const { blob, filename } = await fileApi.downloadFiles(
            files.map((f) => resolveFilePath(f)),
        );
        saveBlob(blob, filename || files[0].name);
    } catch (error) {
        ZXNotification({
            title: "下载失败",
            message:
                (error as Error)?.message || "下载失败了 (´；ω；`)",
            type: "😭",
            position: "top-right",
        });
    } finally {
        downloading.value = false;
    }
};

// ==================== 压缩包 ====================
const handlePreviewArchive = async (file: FileItem) => {
    archivePreviewLoading.value = true;
    showArchivePreview.value = true;
    archivePreviewData.value = {
        name: file.name,
        type: "",
        entries: [],
        total: 0,
        truncated: false,
        path: resolveFilePath(file),
    };

    try {
        const res = await fileApi.previewArchive(resolveFilePath(file));
        if (res?.success && res?.data) {
            archivePreviewData.value = {
                name: file.name,
                type: res.data.archive_type,
                entries: res.data.entries,
                total: res.data.total_count,
                truncated: res.data.truncated,
                path: resolveFilePath(file),
            };
        } else {
            showArchivePreview.value = false;
        }
    } catch (error) {
        showArchivePreview.value = false;
        ZXNotification({
            title: "预览失败",
            message:
                (error as any)?.response?.data?.message ||
                "压缩包读取失败了 (´；ω；`)",
            type: "😭",
            position: "top-right",
        });
    } finally {
        archivePreviewLoading.value = false;
    }
};

const handleExtractArchive = async (file: FileItem) => {
    try {
        const res = await fileApi.extractArchive(resolveFilePath(file));
        if (res?.success && res?.data) {
            ZXNotification({
                title: "解压成功～",
                message: `已解压 ${res.data.file_count} 个文件到 "${res.data.dest_path.split(/[\\/]/).pop()}" ！`,
                type: "🥳",
                position: "top-right",
            });
            showArchivePreview.value = false;
            loadFileList(currentPath.value);
        }
    } catch (error) {
        ZXNotification({
            title: "解压失败",
            message:
                (error as any)?.response?.data?.message ||
                "解压操作失败了 (´；ω；`)",
            type: "😭",
            position: "top-right",
        });
    }
};

const handleCompress = async (files: FileItem[]) => {
    if (files.length === 0) return;

    try {
        const res = await fileApi.compressFiles(
            files.map((f) => resolveFilePath(f)),
        );
        if (res?.success && res?.data) {
            ZXNotification({
                title: "压缩成功～",
                message: `已打包 ${res.data.file_count} 个文件到 "${res.data.dest_path.split(/[\\/]/).pop()}" ！`,
                type: "🥳",
                position: "top-right",
            });
            loadFileList(currentPath.value);
        }
    } catch (error) {
        ZXNotification({
            title: "压缩失败",
            message:
                (error as any)?.response?.data?.message ||
                "压缩操作失败了 (´；ω；`)",
            type: "😭",
            position: "top-right",
        });
    }
};

const sortedFileList = computed(() => {
    const query = searchQuery.value.toLowerCase().trim();
    const files = query
        ? fileList.value.filter((file) =>
              file.name.toLowerCase().includes(query),
          )
        : fileList.value;

    return [...files].sort((a, b) => {
        if (!a.is_file && b.is_file) return -1;
        if (a.is_file && !b.is_file) return 1;

        return a.name.localeCompare(b.name, "zh-CN");
    });
});

onMounted(() => {
    loadFileList();
    window.addEventListener("keydown", handleKeydown);
});

onBeforeUnmount(() => {
    window.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
    <div class="flex h-full w-full flex-col space-y-3 sm:space-y-4">
        <div
            v-if="!globalStore.isDesktopMode"
            class="flex items-center justify-end rounded-3xl border-1 border-slate-200 bg-white p-2 shadow-sm sm:p-3"
        >
            <ZxButton variant="primary" @click="showNewDialog = true">
                <Plus class="h-4 w-4" />
                <span class="hidden sm:inline">新建</span>
            </ZxButton>
        </div>

        <FileBreadcrumbBar
            v-model:search-query="searchQuery"
            :current-path="currentPath"
            :path-segments="pathSegments"
            :selected-count="selectedPaths.size"
            @back="goBack"
            @home="loadFileList('')"
            @navigate="loadFileList"
            @clear-selection="clearSelection"
            @compress-selected="handleCompress(getSelectedFiles())"
            @delete-selected="handleDelete(getSelectedFiles())"
            @download-selected="handleDownload(getSelectedFiles())"
        />

        <FileListPanel
            :files="sortedFileList"
            :is-empty="fileList.length === 0"
            :loading="loading"
            :search-query="searchQuery"
            :selected-paths="selectedPaths"
            @clear-selection="clearSelection"
            @compress="handleCompress"
            @delete="handleDelete"
            @download="handleDownload"
            @enter-folder="enterFolder"
            @extract-archive="handleExtractArchive"
            @open="openEditor"
            @preview-archive="handlePreviewArchive"
            @rename="openRenameDialog"
            @select="handleRowSelect"
        />

        <NewItemDialog
            v-model="showNewDialog"
            v-model:item-name="newItemName"
            v-model:item-type="newItemType"
            @confirm="handleNew"
        />

        <RenameDialog
            v-model="showRenameDialog"
            v-model:name="newName"
            @confirm="handleRename"
        />

        <FileEditorModal
            v-if="showEditor"
            :initial-file="editorInitialFile"
            @close="showEditor = false"
        />

        <ArchivePreviewModal
            v-if="showArchivePreview && archivePreviewData"
            :archive-name="archivePreviewData.name"
            :archive-type="archivePreviewData.type"
            :entries="archivePreviewData.entries"
            :total-count="archivePreviewData.total"
            :truncated="archivePreviewData.truncated"
            :loading="archivePreviewLoading"
            @close="showArchivePreview = false"
            @extract="
                handleExtractArchive({
                    name: archivePreviewData.name,
                    path: archivePreviewData.path,
                    is_file: true,
                    is_image: false,
                })
            "
        />
    </div>
</template>
