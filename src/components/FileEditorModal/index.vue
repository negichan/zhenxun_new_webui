<template>
    <div
        ref="modalRoot"
        class="file-editor-modal fixed inset-0 z-50 glass-overlay flex items-center justify-center"
        @click="handleClose"
    >
        <div
            class="modal-content flex flex-col overflow-hidden border border-slate-200 bg-white shadow-xl"
            :class="
                isFullscreen
                    ? 'h-full w-full max-w-none max-h-none rounded-none'
                    : 'h-[85vh] max-h-[90vh] w-[900px] max-w-[95vw] rounded-3xl'
            "
            @click.stop
        >
            <!-- 标题栏：文件名 + 路径 + 未保存标记 -->
            <div
                class="flex items-center justify-between border-b border-gray-200 px-4 py-3"
            >
                <div class="flex min-w-0 items-center gap-2.5">
                    <div
                        class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-zx-primary-soft"
                    >
                        <FileText class="h-5 w-5 text-zx-primary" />
                    </div>
                    <div class="min-w-0">
                        <div class="flex items-center gap-1.5">
                            <h3
                                class="truncate text-base font-semibold text-gray-800"
                                :title="fileName"
                            >
                                {{ fileName }}
                            </h3>
                            <span
                                v-if="isDirty"
                                class="h-2 w-2 flex-shrink-0 rounded-full bg-amber-400"
                                title="有未保存的修改"
                            ></span>
                        </div>
                        <p
                            class="truncate text-[11px] text-gray-400"
                            :title="currentFilePath"
                        >
                            {{ currentFilePath }}
                        </p>
                    </div>
                </div>
                <div class="flex flex-shrink-0 items-center gap-1">
                    <button
                        class="cursor-pointer rounded-full p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                        :title="isFullscreen ? '退出全屏' : '全屏编辑'"
                        @click="isFullscreen = !isFullscreen"
                    >
                        <Minimize2 v-if="isFullscreen" class="h-4.5 w-4.5" />
                        <Maximize2 v-else class="h-4.5 w-4.5" />
                    </button>
                    <button
                        class="cursor-pointer rounded-full p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                        @click="handleClose"
                    >
                        <X class="h-5 w-5" />
                    </button>
                </div>
            </div>

            <!-- 编辑器主体 -->
            <div class="flex min-h-0 flex-1 flex-col p-2 sm:p-3">
                <ZXTextEditor
                    ref="editorRef"
                    v-model="editorContent"
                    :language="currentLanguage"
                    :path="currentFilePath"
                    :encoding="fileEncoding"
                    :loading="loading"
                    class="min-h-0 flex-1"
                    @save="handleSave"
                />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { FileText, X, Maximize2, Minimize2 } from 'lucide-vue-next'
import { fileApi } from '@/utils/api-next'
import { ZXNotification, ZXMessageBox } from '@/services/ui'
import ZXTextEditor from '@/components/ZXTextEditor'
import { modalJelly } from '@/composables/useGsapTransition'

// Props
interface Props {
    initialFile?: {
        path: string
        name: string
        content?: string
    } | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
    close: []
}>()

// 状态
const editorContent = ref('')
const initialContent = ref('')
const loading = ref(false)
const currentLanguage = ref('auto')
const fileEncoding = ref('utf-8')
const isFullscreen = ref(false)
const modalRoot = ref<HTMLElement | null>(null)

const currentFilePath = computed(() => props.initialFile?.path || '')
const fileName = computed(() => props.initialFile?.name || '文件编辑')
const isDirty = computed(() => editorContent.value !== initialContent.value)

// 挂载即播放果冻进场动画（动画开关关闭时钩子内部直接落位）
onMounted(() => {
    if (modalRoot.value) modalJelly.onEnter(modalRoot.value, () => {})
})

// 保存文件（编码跟随工具栏选择）
const handleSave = async (content: string, encoding: string) => {
    if (!currentFilePath.value) return

    try {
        const res = await fileApi.saveFile(currentFilePath.value, content, encoding)
        if (res?.success) {
            initialContent.value = content
            fileEncoding.value = encoding
            ZXNotification({
                title: '保存成功～',
                message: `文件已按 ${encoding === 'gbk' ? 'GBK' : 'UTF-8'} 编码保存成功啦！`,
                type: '🥳',
                position: 'top-right'
            })
        } else {
            ZXNotification({
                title: '保存失败',
                message: res?.message || '文件保存失败了 (´；ω；`)',
                type: '😭',
                position: 'top-right'
            })
        }
    } catch (error) {
        ZXNotification({
            title: '保存失败',
            message: '文件保存失败了 (´；ω；`)',
            type: '😭',
            position: 'top-right'
        })
    }
}

// 关闭（带动画）；有未保存修改时先确认
const handleClose = () => {
    if (isDirty.value) {
        ZXMessageBox({
            title: '未保存的修改',
            message: `"${fileName.value}" 有未保存的修改，确定要关闭吗？`,
            cancelButtonText: '继续编辑',
            confirmButtonText: '放弃修改',
            onConfirm: () => doClose(),
        })
        return
    }
    doClose()
}

const doClose = () => {
    if (modalRoot.value) {
        modalJelly.onLeave(modalRoot.value, () => emit('close'))
    } else {
        emit('close')
    }
}

// 监听初始文件变化：读取文件内容与编码
watch(() => props.initialFile, async (file) => {
    if (!file) return
    loading.value = true

    try {
        const res = await fileApi.readFile(file.path, { skipInterceptor: true })
        if (res?.success && res.data) {
            editorContent.value = res.data.content || ''
            initialContent.value = editorContent.value
            // 后端探测到的编码若不在可选集（如 latin-1），保存时回落 UTF-8
            const enc = (res.data.encoding || 'utf-8').toLowerCase()
            fileEncoding.value = ['utf-8', 'gbk'].includes(enc) ? enc : 'utf-8'
        } else {
            editorContent.value = ''
            initialContent.value = ''
        }
    } catch (error) {
        editorContent.value = ''
        initialContent.value = ''
    } finally {
        loading.value = false
    }

    nextTick(() => {
        // 语言检测（值与 ZXTextEditor 的语言下拉对齐）
        const ext = file.name.split('.').pop()?.toLowerCase()
        const langMap: Record<string, string> = {
            bat: 'bat', bash: 'shell', c: 'c', cpp: 'cpp', cjs: 'javascript',
            css: 'css', dockerfile: 'dockerfile', go: 'go', h: 'c', hpp: 'cpp',
            htm: 'html', html: 'html', ini: 'ini', java: 'java', js: 'javascript',
            json: 'json', jsonc: 'json', jsx: 'javascript', less: 'less',
            md: 'markdown', markdown: 'markdown', mjs: 'javascript', py: 'python',
            rs: 'rust', scss: 'scss', sh: 'shell', sql: 'sql', svg: 'xml',
            toml: 'toml', ts: 'typescript', tsx: 'typescript', vue: 'vue',
            xml: 'xml', yaml: 'yaml', yml: 'yaml',
        }
        currentLanguage.value = langMap[ext || ''] || 'auto'
    })
}, { immediate: true })
</script>

<style scoped>
/* 遮罩样式已在 custom.css 中统一定义 */
</style>
