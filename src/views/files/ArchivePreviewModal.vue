<template>
    <div
        ref="modalRoot"
        class="fixed inset-0 z-50 glass-overlay flex items-center justify-center"
        @click="handleClose"
    >
        <div
            class="modal-content flex h-[72vh] max-h-[820px] w-[900px] max-w-[95vw] flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
            @click.stop
        >
            <!-- 标题栏 -->
            <div
                class="flex flex-shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3"
            >
                <div class="flex min-w-0 items-center gap-2">
                    <Archive class="h-5 w-5 flex-shrink-0 text-zx-primary" />
                    <h3 class="flex-shrink-0 text-lg font-semibold text-[var(--zx-color-text-strong)]">
                        压缩包预览
                    </h3>
                </div>
                <ZxButton
                    variant="ghost"
                    circle
                    size="sm"
                    @click="handleClose"
                >
                    <X class="h-4 w-4" />
                </ZxButton>
            </div>

            <!-- 分级浏览（dialog 布局：整宽列表 + 内容视图切换） -->
            <ArchiveBrowser
                layout="dialog"
                :archive-path="archivePath"
                :archive-name="archiveName"
            />

            <!-- 底部操作 -->
            <div
                class="flex flex-shrink-0 items-center justify-end border-t border-slate-200 px-4 py-3"
            >
                <div class="flex items-center gap-2">
                    <ZxButton variant="outline" @click="handleClose"
                        >关闭</ZxButton
                    >
                    <ZxButton @click="emit('extract')">
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
import { Archive, ArchiveRestore, X } from "lucide-vue-next";
import { modalJelly } from "@/composables/useGsapTransition";
import ArchiveBrowser from "@/components/zxcomponent/ArchiveBrowser.vue";

defineProps<{
    archivePath: string;
    archiveName: string;
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
