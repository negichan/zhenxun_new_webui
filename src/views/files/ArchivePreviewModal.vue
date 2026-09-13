<template>
    <div
        ref="modalRoot"
        class="fixed inset-0 z-50 glass-overlay flex items-center justify-center"
        @click="handleClose"
    >
        <div
            class="modal-content flex max-h-[85vh] w-[760px] max-w-[95vw] flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
            @click.stop
        >
            <!-- 标题栏 -->
            <div
                class="flex items-center justify-between border-b border-gray-200 px-4 py-3"
            >
                <div class="flex min-w-0 items-center gap-2">
                    <Archive class="h-5 w-5 flex-shrink-0 text-zx-primary" />
                    <h3 class="flex-shrink-0 text-lg font-semibold text-gray-800">
                        压缩包预览
                    </h3>
                    <span
                        class="ml-2 truncate text-sm text-gray-500"
                        :title="archiveName"
                        >{{ archiveName }}</span
                    >
                    <span
                        class="ml-2 h-[22px] flex-shrink-0 rounded-lg bg-zx-primary px-2 text-[11px] leading-[22px] font-medium text-white uppercase"
                        >{{ archiveType }}</span
                    >
                </div>
                <button
                    class="cursor-pointer rounded-2xl p-1.5 text-gray-500 transition-colors hover:bg-gray-100"
                    @click="handleClose"
                >
                    <X class="h-5 w-5" />
                </button>
            </div>

            <!-- 条目列表 -->
            <div class="min-h-0 flex-1 overflow-y-auto px-4 py-2">
                <div v-if="loading" class="py-16 text-center text-gray-400">
                    <Loader2
                        class="mx-auto mb-3 h-8 w-8 animate-spin text-zx-primary"
                    />
                    <p>正在读取压缩包...</p>
                </div>

                <template v-else>
                    <div
                        v-if="truncated"
                        class="mb-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-600"
                    >
                        条目较多，仅展示前 {{ entries.length }} 项（共
                        {{ totalCount }} 项）
                    </div>

                    <table class="w-full">
                        <tbody class="divide-y divide-gray-100">
                            <tr
                                v-for="(entry, i) in entries"
                                :key="`${entry.name}-${i}`"
                            >
                                <td class="px-2 py-2">
                                    <div class="flex items-center gap-2">
                                        <component
                                            :is="
                                                entry.is_dir ? Folder : FileText
                                            "
                                            class="h-4 w-4 flex-shrink-0"
                                            :class="
                                                entry.is_dir
                                                    ? 'text-zx-primary'
                                                    : 'text-slate-400'
                                            "
                                        />
                                        <span
                                            class="truncate text-sm text-gray-700"
                                            >{{ entry.name }}</span
                                        >
                                    </div>
                                </td>
                                <td
                                    class="w-24 px-2 py-2 text-right text-xs text-gray-500 whitespace-nowrap"
                                >
                                    {{
                                        entry.is_dir
                                            ? "文件夹"
                                            : entry.size_formatted || "--"
                                    }}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <div
                        v-if="entries.length === 0"
                        class="py-16 text-center text-gray-400"
                    >
                        <Archive
                            class="mx-auto mb-3 h-10 w-10 opacity-50"
                        />
                        <p>压缩包是空的</p>
                    </div>
                </template>
            </div>

            <!-- 底部操作 -->
            <div
                class="flex flex-shrink-0 items-center justify-between border-t border-gray-200 px-4 py-3"
            >
                <span class="text-xs text-gray-400">
                    共 {{ totalCount }} 项
                </span>
                <div class="flex items-center gap-2">
                    <ZxButton variant="outline" @click="handleClose"
                        >关闭</ZxButton
                    >
                    <ZxButton :disabled="loading" @click="emit('extract')">
                        <ArchiveRestore class="h-4 w-4" />
                        解压到新文件夹
                    </ZxButton>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { Archive, ArchiveRestore, FileText, Folder, Loader2, X } from "lucide-vue-next";
import { modalJelly } from "@/composables/useGsapTransition";
import type { ArchiveEntry } from "@/types/api-next.types";

defineProps<{
    archiveName: string;
    archiveType: string;
    entries: ArchiveEntry[];
    totalCount: number;
    truncated: boolean;
    loading: boolean;
}>();

const emit = defineEmits<{
    close: [];
    extract: [];
}>();

const modalRoot = ref<HTMLElement | null>(null);

onMounted(() => {
    if (modalRoot.value) modalJelly.onEnter(modalRoot.value, () => {});
});

const handleClose = () => {
    if (modalRoot.value) {
        modalJelly.onLeave(modalRoot.value, () => emit("close"));
    } else {
        emit("close");
    }
};
</script>
