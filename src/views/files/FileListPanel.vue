<script setup lang="ts">
import {
    Archive,
    ArchiveRestore,
    Check,
    Download,
    Edit2,
    FileText,
    Folder,
    Image as ImageIcon,
    Package,
    Search,
    Trash2,
} from "lucide-vue-next";
import type { FileItem } from "@/types/api-next.types";
import { ZXContextMenu } from "@/components/zxcomponent/ContextMenu";

const props = defineProps<{
    files: FileItem[];
    loading: boolean;
    isEmpty: boolean;
    searchQuery: string;
    selectedPaths: Set<string>;
}>();

const emit = defineEmits<{
    open: [file: FileItem];
    "toggle-select": [file: FileItem];
    "clear-selection": [];
    "enter-folder": [file: FileItem];
    rename: [file: FileItem];
    delete: [files: FileItem[]];
    download: [files: FileItem[]];
    "preview-archive": [file: FileItem];
    "extract-archive": [file: FileItem];
    compress: [files: FileItem[]];
}>();

const formatFileSize = (bytes: number | undefined | null, isFile = true) => {
    if (!isFile) return "-";
    if (bytes === undefined || bytes === null) return "--";
    if (bytes === 0) return "0 B";

    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
};

const formatTime = (timestamp: string | number | undefined) => {
    if (timestamp === undefined) return "--";

    const date =
        typeof timestamp === "number"
            ? new Date(timestamp * 1000)
            : new Date(timestamp);

    return date.toLocaleString("zh-CN");
};

const getFileIconStyle = (file: FileItem) => {
    if (!file.is_file) {
        return "text-zx-primary";
    }

    if (!file.is_image) {
        return "text-slate-500";
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    const colorMap: Record<string, string> = {
        jpg: "text-slate-500",
        jpeg: "text-slate-500",
        png: "text-slate-500",
        gif: "text-slate-500",
        svg: "text-slate-500",
        webp: "text-slate-500",
        bmp: "text-slate-500",
        ico: "text-slate-500",
    };

    return colorMap[ext || ""] || "text-slate-500";
};

const ZIP_EXTS = ["zip", "jar", "apk", "whl", "epub"];
const TAR_SUFFIXES = [
    ".tar.gz",
    ".tgz",
    ".tar.bz2",
    ".tbz2",
    ".tar.xz",
    ".txz",
    ".tar",
];

const isArchive = (file: FileItem) => {
    if (!file.is_file) return false;
    const name = file.name.toLowerCase();
    return (
        TAR_SUFFIXES.some((s) => name.endsWith(s)) ||
        ZIP_EXTS.includes(name.split(".").pop() || "")
    );
};

const handleOpen = (file: FileItem) => {
    if (file.is_file) {
        emit("open", file);
        return;
    }

    emit("enter-folder", file);
};

const isSelected = (file: FileItem) => props.selectedPaths.has(file.path);

/** 右键目标：命中已选中项时整个选区一起操作，否则只操作该文件 */
const menuTargets = (file: FileItem): FileItem[] => {
    if (isSelected(file)) {
        return props.files.filter((f) => props.selectedPaths.has(f.path));
    }
    return [file];
};

// 右键文件/文件夹：打开、下载、压缩包操作、压缩、重命名（仅文件）、删除
const openFileMenu = (e: MouseEvent, file: FileItem) => {
    const targets = menuTargets(file);
    const batch = targets.length > 1;
    const single = targets[0] ?? file;

    const menuItems: {
        label: string;
        icon: any;
        action: () => void;
        danger?: boolean;
    }[] = [];

    if (!batch) {
        menuItems.push({
            label: file.is_file ? "打开文件" : "打开文件夹",
            icon: file.is_file ? FileText : Folder,
            action: () => handleOpen(file),
        });
    }

    menuItems.push({
        label: batch ? `下载选中项 (${targets.length})` : "下载",
        icon: Download,
        action: () => emit("download", targets),
    });

    if (!batch && isArchive(file)) {
        menuItems.push(
            {
                label: "预览压缩包内容",
                icon: Archive,
                action: () => emit("preview-archive", file),
            },
            {
                label: "解压到新文件夹",
                icon: ArchiveRestore,
                action: () => emit("extract-archive", file),
            },
        );
    }

    menuItems.push(
        {
            label: batch ? `压缩选中项为 zip` : "压缩为 zip",
            icon: Package,
            action: () => emit("compress", targets),
        },
        ...(!batch && file.is_file
            ? [
                  {
                      label: "重命名",
                      icon: Edit2,
                      action: () => emit("rename", file),
                  },
              ]
            : []),
        {
            label: batch ? `删除选中项 (${targets.length})` : "删除",
            icon: Trash2,
            danger: true,
            action: () => emit("delete", targets),
        },
    );

    ZXContextMenu.show({
        x: e.clientX,
        y: e.clientY,
        items: menuItems,
    });
};
</script>

<template>
    <div
        class="flex-1 overflow-hidden rounded-3xl border-1 border-slate-200 bg-white shadow-sm select-none"
    >
        <div v-if="loading" class="flex h-full items-center justify-center">
            <div class="text-center text-gray-400">
                <Folder class="mx-auto mb-4 h-12 w-12 animate-pulse" />
                <p>加载中...</p>
            </div>
        </div>

        <div
            v-else-if="isEmpty"
            class="flex h-full items-center justify-center"
        >
            <div class="text-center text-gray-400">
                <Folder class="mx-auto mb-4 h-16 w-16 opacity-50" />
                <p>此文件夹为空</p>
            </div>
        </div>

        <div
            v-else
            class="h-full overflow-x-hidden overflow-y-auto px-4"
            @click.self="emit('clear-selection')"
        >
            <table class="hidden w-full sm:table">
                <thead class="sticky top-0 border-b-1 border-gray-200 bg-white">
                    <tr>
                        <th class="w-10 pl-6 pr-0 pt-6 pb-4"></th>
                        <th
                            class="px-6 pt-6 pb-4 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
                        >
                            名称
                        </th>
                        <th
                            class="px-6 pt-6 pb-4 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
                        >
                            大小
                        </th>
                        <th
                            class="hidden px-6 pt-6 pb-4 text-left text-xs font-medium tracking-wider text-gray-500 uppercase md:table-cell"
                        >
                            修改时间
                        </th>
                        <th
                            class="px-6 pt-6 pb-4 text-right text-xs font-medium tracking-wider text-gray-500 uppercase"
                        >
                            操作
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                    <tr
                        v-for="file in files"
                        :key="file.name"
                        class="cursor-pointer transition-colors hover:bg-gray-50"
                        :class="isSelected(file) && 'row-selected bg-zx-primary-soft'"
                        @click="handleOpen(file)"
                        @contextmenu.prevent="openFileMenu($event, file)"
                    >
                        <td class="pl-6 pr-0 py-2">
                            <label
                                class="flex h-6 w-6 cursor-pointer items-center justify-center"
                                title="选择"
                                @click.stop
                            >
                                <input
                                    type="checkbox"
                                    class="peer sr-only"
                                    :checked="isSelected(file)"
                                    @change="emit('toggle-select', file)"
                                />
                                <span
                                    class="flex h-4.5 w-4.5 items-center justify-center rounded-md border border-gray-300 bg-white transition-colors peer-checked:border-zx-primary peer-checked:bg-zx-primary peer-focus-visible:ring-2 peer-focus-visible:ring-zx-primary/40"
                                >
                                    <Check
                                        v-if="isSelected(file)"
                                        class="h-3 w-3 text-white"
                                    />
                                </span>
                            </label>
                        </td>
                        <td class="px-4 py-2">
                            <div class="ml-2 flex items-center gap-3">
                                <div
                                    :class="getFileIconStyle(file)"
                                    class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-2xl"
                                >
                                    <Folder
                                        v-if="!file.is_file"
                                        class="h-5 w-5"
                                    />
                                    <ImageIcon
                                        v-else-if="file.is_image"
                                        class="h-5 w-5"
                                    />
                                    <FileText v-else class="h-5 w-5" />
                                </div>
                                <span class="truncate text-sm text-gray-700">
                                    {{ file.name }}
                                </span>
                            </div>
                        </td>
                        <td class="px-4 py-2 text-sm text-gray-500">
                            {{
                                file.size_formatted ||
                                formatFileSize(file.size, file.is_file)
                            }}
                        </td>
                        <td
                            class="hidden px-4 py-2 text-sm text-gray-500 md:table-cell"
                        >
                            {{ file.mtime_formatted || formatTime(file.mtime) }}
                        </td>
                        <td class="px-4 py-2">
                            <div
                                class="flex items-center justify-end gap-2"
                                @click.stop
                            >
                                <button
                                    v-if="file.is_file"
                                    class="btn-touch cursor-pointer rounded-2xl p-1.5 transition-colors hover:text-zx-primary"
                                    title="重命名"
                                    @click.stop="emit('rename', file)"
                                >
                                    <Edit2 class="h-4 w-4" />
                                </button>
                                <button
                                    class="btn-touch cursor-pointer rounded-2xl p-1.5 transition-colors hover:text-red-600"
                                    title="删除"
                                    @click.stop="emit('delete', [file])"
                                >
                                    <Trash2 class="h-4 w-4" />
                                </button>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>

            <div class="divide-y divide-gray-100 sm:hidden">
                <div
                    v-for="file in files"
                    :key="file.name"
                    class="p-3 transition-colors hover:bg-gray-50"
                    :class="isSelected(file) && 'row-selected bg-zx-primary-soft'"
                    @contextmenu.prevent="openFileMenu($event, file)"
                >
                    <div class="flex items-start gap-3" @click="handleOpen(file)">
                        <label
                            class="flex h-10 w-6 flex-shrink-0 cursor-pointer items-center justify-center"
                            title="选择"
                            @click.stop
                        >
                            <input
                                type="checkbox"
                                class="peer sr-only"
                                :checked="isSelected(file)"
                                @change="emit('toggle-select', file)"
                            />
                            <span
                                class="flex h-4.5 w-4.5 items-center justify-center rounded-md border border-gray-300 bg-white transition-colors peer-checked:border-zx-primary peer-checked:bg-zx-primary"
                            >
                                <Check
                                    v-if="isSelected(file)"
                                    class="h-3 w-3 text-white"
                                />
                            </span>
                        </label>
                        <div
                            :class="getFileIconStyle(file)"
                            class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl"
                        >
                            <Folder v-if="!file.is_file" class="h-6 w-6" />
                            <ImageIcon
                                v-else-if="file.is_image"
                                class="h-6 w-6"
                            />
                            <FileText v-else class="h-6 w-6" />
                        </div>
                        <div class="min-w-0 flex-1">
                            <div
                                class="truncate text-sm font-medium text-gray-700"
                            >
                                {{ file.name }}
                            </div>
                            <div class="mt-1 text-xs text-gray-500">
                                {{
                                    file.size_formatted ||
                                    formatFileSize(file.size, file.is_file)
                                }}
                                <span v-if="file.mtime_formatted" class="mx-1"
                                    >·</span
                                >
                                {{
                                    file.mtime_formatted ||
                                    formatTime(file.mtime)
                                }}
                            </div>
                        </div>
                        <div class="flex flex-shrink-0 items-center gap-1">
                            <button
                                v-if="file.is_file"
                                class="btn-touch rounded-2xl p-2 text-slate-600 transition-colors hover:bg-slate-100"
                                title="重命名"
                                @click.stop="emit('rename', file)"
                            >
                                <Edit2 class="h-4 w-4" />
                            </button>
                            <button
                                class="btn-touch rounded-2xl p-2 text-red-600 transition-colors hover:bg-red-50"
                                title="删除"
                                @click.stop="emit('delete', [file])"
                            >
                                <Trash2 class="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div
                v-if="searchQuery && files.length === 0"
                class="flex h-full items-center justify-center"
            >
                <div class="text-center text-gray-400">
                    <Search class="mx-auto mb-4 h-16 w-16 opacity-50" />
                    <p>未找到匹配的文件</p>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* 选中行 hover 时在选中色基础上向主色加深，避免被默认灰 hover 覆盖 */
.row-selected:hover {
    background-color: color-mix(
        in srgb,
        var(--zx-color-primary) 18%,
        var(--zx-color-primary-soft)
    );
}
</style>
