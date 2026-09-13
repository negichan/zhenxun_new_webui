<template>
    <div
        ref="modalRoot"
        class="file-editor-modal fixed inset-0 z-50 glass-overlay flex items-center justify-center"
        @click="handleClose"
    >
        <div
            class="modal-content flex h-[85vh] max-h-[90vh] w-[900px] max-w-[95vw] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl"
            @click.stop
        >
            <!-- 标题栏 -->
            <div
                class="flex items-center justify-between border-b border-gray-200 px-4 py-3"
            >
                <div class="flex min-w-0 items-center gap-2.5">
                    <div
                        class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-zx-primary-soft"
                    >
                        <FileText class="h-5 w-5 text-zx-primary" />
                    </div>
                    <h3 class="flex-shrink-0 text-lg font-semibold text-gray-800">
                        文件编辑
                    </h3>
                    <span
                        class="ml-1 truncate rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500"
                        :title="currentFilePath"
                        >{{ currentFilePath }}</span
                    >
                </div>
                <button
                    class="cursor-pointer rounded-full p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                    @click="handleClose"
                >
                    <X class="h-5 w-5" />
                </button>
            </div>

            <!-- 编辑器主体 -->
            <div class="min-h-0 flex-1 p-3">
                <ZXTextEditor
                    ref="editorRef"
                    v-model="editorContent"
                    :language="currentLanguage"
                    :path="currentFilePath"
                    :loading="loading"
                    @save="handleSave"
                />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { FileText, X } from 'lucide-vue-next'
import { fileApi } from '@/utils/api-next'
import { ZXNotification } from '@/services/ui'
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
const editorRef = ref<InstanceType<typeof ZXTextEditor> | null>(null)
const editorContent = ref('')
const loading = ref(false)
const currentLanguage = ref('auto')
const modalRoot = ref<HTMLElement | null>(null)
const isClosing = ref(false)

// 当前文件路径（计算属性）
const currentFilePath = computed(() => props.initialFile?.path || '')

// 挂载即播放果冻进场动画（动画开关关闭时钩子内部直接落位）
onMounted(() => {
    if (modalRoot.value) modalJelly.onEnter(modalRoot.value, () => {})
})

// 保存文件
const handleSave = async (content: string) => {
    if (!currentFilePath.value) return

    try {
        const res = await fileApi.saveFile(currentFilePath.value, content)
        if (res?.success) {
            ZXNotification({
                title: '保存成功～',
                message: '文件已经保存成功啦！',
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

// 关闭（带动画）
const handleClose = () => {
    if (isClosing.value) return
    isClosing.value = true

    // 等待离场动画完成（动画开关关闭时立即完成）
    modalJelly.onLeave(modalRoot.value!, () => emit('close'))
}

// 监听初始文件变化
watch(() => props.initialFile, async (file) => {
    if (file) {
        // 如果内容未提供，异步加载
        if (file.content === undefined) {
            loading.value = true
            try {
                // 使用 skipInterceptor 跳过拦截器的自动错误处理
                const res = await fileApi.readFile(file.path, { skipInterceptor: true })
                if (res?.success && res.data) {
                    const content = res.data.content || ''
                    // 更新 v-model，让编辑器的 watch 处理
                    editorContent.value = content
                } else {
                    // 读取失败，静默失败，设置空内容
                    editorContent.value = ''
                }
            } catch (error) {
                // 读取失败，静默失败，设置空内容
                editorContent.value = ''
            } finally {
                loading.value = false
            }
        } else {
            // 内容已提供，直接更新 v-model
            editorContent.value = file.content
        }

        nextTick(() => {
            // 自动检测语言（值与 ZXTextEditor 的语言下拉对齐）
            const ext = file.name.split('.').pop()?.toLowerCase()
            const langMap: Record<string, string> = {
                bat: 'bat',
                bash: 'shell',
                c: 'c',
                cpp: 'cpp',
                cjs: 'javascript',
                css: 'css',
                dockerfile: 'dockerfile',
                go: 'go',
                h: 'c',
                hpp: 'cpp',
                htm: 'html',
                html: 'html',
                ini: 'ini',
                java: 'java',
                js: 'javascript',
                json: 'json',
                jsonc: 'json',
                jsx: 'javascript',
                less: 'less',
                md: 'markdown',
                markdown: 'markdown',
                mjs: 'javascript',
                py: 'python',
                rs: 'rust',
                scss: 'scss',
                sh: 'shell',
                sql: 'sql',
                svg: 'xml',
                toml: 'toml',
                ts: 'typescript',
                tsx: 'typescript',
                vue: 'vue',
                xml: 'xml',
                yaml: 'yaml',
                yml: 'yaml',
            }
            currentLanguage.value = langMap[ext || ''] || 'auto'
        })
    }
}, { immediate: true })
</script>

<style scoped>
/* 遮罩样式已在 custom.css 中统一定义 */
</style>
