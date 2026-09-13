<template>
    <div class="zx-editor-container">
        <div v-if="!hideToolbar" class="editor-toolbar">
            <div class="toolbar-left">
                <select
                    v-model="selectedLanguage"
                    class="toolbar-select"
                    :disabled="readonly"
                    title="语言"
                >
                    <option
                        v-for="lang in languages"
                        :key="lang.value"
                        :value="lang.value"
                    >
                        {{ lang.label }}
                    </option>
                </select>

                <button
                    v-if="!isPreviewing"
                    class="toolbar-chip"
                    type="button"
                    @click="changeEOL"
                >
                    <WrapText class="icon" />
                    <span>{{ currentEolLabel }}</span>
                </button>

                <button
                    v-if="!isPreviewing"
                    class="toolbar-chip"
                    type="button"
                    @click="toggleWordWrap"
                >
                    <Settings class="icon" />
                    <span>{{ wordWrap ? "自动换行" : "不换行" }}</span>
                </button>
            </div>

            <div class="toolbar-right">
                <!-- Markdown 预览切换 -->
                <div v-if="isMarkdown" class="preview-segmented">
                    <button
                        type="button"
                        :class="{ 'segmented-active': !isPreviewing }"
                        @click="isPreviewing = false"
                    >
                        <Edit3 class="icon" />
                        <span>编辑</span>
                    </button>
                    <button
                        type="button"
                        :class="{ 'segmented-active': isPreviewing }"
                        @click="togglePreview"
                    >
                        <Eye class="icon" />
                        <span>预览</span>
                    </button>
                </div>
                <template v-if="!isPreviewing">
                    <ZxButton
                        variant="ghost"
                        size="sm"
                        :disabled="!isDirty || readonly"
                        @click="handleReset"
                    >
                        <RefreshCw class="icon" />
                        重置
                    </ZxButton>
                    <ZxButton
                        size="sm"
                        :disabled="readonly"
                        @click="handleSave"
                    >
                        <Save class="icon" />
                        保存
                    </ZxButton>
                </template>
            </div>
        </div>

        <!-- Markdown 预览视图 -->
        <div v-if="isPreviewing" class="editor-wrapper">
            <div
                ref="previewRef"
                class="md-preview"
                v-html="previewHtml"
            ></div>
        </div>

        <!-- 编辑视图：monaco 就绪前先用轻量 textarea 兜底渲染 -->
        <!-- 编辑视图：保持挂载（v-show），避免预览切换反复重建 monaco 容器 -->
        <div
            v-show="!isPreviewing"
            class="editor-wrapper"
            :class="{ 'is-monaco': monacoReady }"
        >
            <template v-if="!monacoReady">
                <div class="line-number-gutter" aria-hidden="true">
                    <span v-for="line in lineCount" :key="line">{{
                        line
                    }}</span>
                </div>
                <div class="editor-content-host">
                    <!-- 语法高亮层：垫在透明文本的 textarea 下面 -->
                    <div
                        ref="highlightRef"
                        class="editor-highlight"
                        :class="{ 'is-wrap': wordWrap }"
                        aria-hidden="true"
                        v-html="highlightHtml"
                    ></div>
                    <textarea
                        ref="textareaRef"
                        v-model="content"
                        class="editor-textarea"
                        :class="{
                            'whitespace-pre': !wordWrap,
                            'has-highlight': highlightHtml !== '',
                        }"
                        :readonly="readonly"
                        :spellcheck="false"
                        @input="handleInput"
                        @keydown="handleKeydown"
                        @scroll="syncOverlayScroll"
                    />
                </div>
            </template>
            <div v-show="monacoReady" ref="monacoHost" class="monaco-host"></div>

            <div v-if="loading" class="loading-overlay">
                <div class="loading-content">
                    <Loader2 class="loading-icon" />
                    <p>加载中...</p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import {
    computed,
    nextTick,
    onBeforeUnmount,
    onMounted,
    ref,
    watch,
} from "vue";
import {
    Edit3,
    Eye,
    Loader2,
    RefreshCw,
    Save,
    Settings,
    WrapText,
} from "lucide-vue-next";
import {
    highlightCode,
    resolveShikiLang,
    selectLangToShiki,
} from "./highlighter";
import { loadMonaco } from "./monacoLoader";
import type * as MonacoNamespace from "monaco-editor/editor/editor.api";
import { useThemeStore } from "@/store/theme";
import { fileApi } from "@/utils/api-next";

interface Props {
    modelValue?: string;
    language?: string;
    path?: string;
    readonly?: boolean;
    loading?: boolean;
    hideToolbar?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    modelValue: "",
    language: "plaintext",
    path: "",
    readonly: false,
    loading: false,
    hideToolbar: false,
});

const emit = defineEmits<{
    "update:modelValue": [value: string];
    save: [content: string];
}>();

const languages = [
    { label: "自动检测", value: "auto" },
    { label: "Plain Text", value: "plaintext" },
    { label: "JavaScript", value: "javascript" },
    { label: "TypeScript", value: "typescript" },
    { label: "Vue", value: "vue" },
    { label: "Python", value: "python" },
    { label: "JSON", value: "json" },
    { label: "YAML", value: "yaml" },
    { label: "TOML", value: "toml" },
    { label: "HTML", value: "html" },
    { label: "XML", value: "xml" },
    { label: "CSS", value: "css" },
    { label: "SCSS", value: "scss" },
    { label: "Less", value: "less" },
    { label: "Markdown", value: "markdown" },
    { label: "SQL", value: "sql" },
    { label: "Shell", value: "shell" },
    { label: "Batch", value: "bat" },
    { label: "Dockerfile", value: "dockerfile" },
    { label: "Go", value: "go" },
    { label: "Rust", value: "rust" },
    { label: "Java", value: "java" },
    { label: "C", value: "c" },
    { label: "C++", value: "cpp" },
];

const detectLanguage = () => {
    if (props.language && props.language !== "auto") return props.language;

    const ext = props.path.split(".").pop()?.toLowerCase();
    const langMap: Record<string, string> = {
        bat: "bat",
        bash: "shell",
        c: "c",
        cpp: "cpp",
        cjs: "javascript",
        css: "css",
        dockerfile: "dockerfile",
        go: "go",
        h: "c",
        hpp: "cpp",
        htm: "html",
        html: "html",
        ini: "ini",
        java: "java",
        js: "javascript",
        json: "json",
        jsonc: "json",
        jsx: "javascript",
        less: "less",
        md: "markdown",
        markdown: "markdown",
        mjs: "javascript",
        py: "python",
        rs: "rust",
        scss: "scss",
        sh: "shell",
        sql: "sql",
        svg: "xml",
        toml: "toml",
        ts: "typescript",
        tsx: "typescript",
        vue: "vue",
        xml: "xml",
        yaml: "yaml",
        yml: "yaml",
    };

    return langMap[ext || ""] || "plaintext";
};

const textareaRef = ref<HTMLTextAreaElement | null>(null);
const content = ref(props.modelValue);
const initialValue = ref(props.modelValue);
const selectedLanguage = ref(detectLanguage());
const currentEOL = ref<"lf" | "crlf">("lf");
const wordWrap = ref(localStorage.getItem("zx-editor-wordwrap") !== "false");

const isDirty = computed(() => content.value !== initialValue.value);
const lineCount = computed(() => Math.max(content.value.split("\n").length, 1));
const currentEolLabel = computed(() =>
    currentEOL.value === "lf" ? "LF" : "CRLF",
);

const normalizeEOL = (value: string) =>
    currentEOL.value === "crlf"
        ? value.replace(/\r?\n/g, "\r\n")
        : value.replace(/\r\n/g, "\n");

const handleInput = () => {
    emit("update:modelValue", content.value);
};

const handleSave = () => {
    const raw = monacoEditor ? monacoEditor.getValue() : content.value;
    content.value = raw;
    emit("save", normalizeEOL(raw));
    initialValue.value = raw;
};

const handleReset = () => {
    if (!isDirty.value) return;
    content.value = initialValue.value;
    syncMonacoValue();
    emit("update:modelValue", content.value);
};

const changeEOL = () => {
    currentEOL.value = currentEOL.value === "lf" ? "crlf" : "lf";
};

const toggleWordWrap = () => {
    wordWrap.value = !wordWrap.value;
    localStorage.setItem("zx-editor-wordwrap", String(wordWrap.value));
};

const handleKeydown = (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        handleSave();
        return;
    }

    if (event.key === "Tab") {
        event.preventDefault();
        insertAtCursor("    ");
    }
};

const insertAtCursor = (text: string) => {
    const textarea = textareaRef.value;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    content.value =
        content.value.slice(0, start) + text + content.value.slice(end);
    emit("update:modelValue", content.value);

    nextTick(() => {
        textarea.selectionStart = textarea.selectionEnd = start + text.length;
    });
};

const syncOverlayScroll = () => {
    const textarea = textareaRef.value;
    if (!textarea) return;

    const overlay = highlightRef.value;
    if (overlay) {
        overlay.scrollTop = textarea.scrollTop;
        overlay.scrollLeft = textarea.scrollLeft;
    }

    const gutter = textarea
        .closest(".editor-wrapper")
        ?.querySelector(".line-number-gutter") as HTMLElement | null;
    if (gutter) gutter.scrollTop = textarea.scrollTop;
};

// ==================== Monaco 引擎（CDN 优先，失败回退本地打包） ====================
const monacoHost = ref<HTMLElement | null>(null);
const monacoReady = ref(false);
let monacoInstance: typeof MonacoNamespace | null = null;
let monacoEditor: MonacoNamespace.editor.IStandaloneCodeEditor | null = null;
let applyingMonacoValue = false;

// 编辑器语言（含 shiki 命名）→ monaco 语言 id
const MONACO_LANG_MAP: Record<string, string> = {
    bat: "bat",
    c: "cpp",
    cpp: "cpp",
    cjs: "javascript",
    css: "css",
    docker: "dockerfile",
    dockerfile: "dockerfile",
    go: "go",
    h: "cpp",
    hpp: "cpp",
    htm: "html",
    html: "html",
    ini: "ini",
    java: "java",
    javascript: "javascript",
    json: "json",
    jsx: "javascript",
    less: "less",
    md: "markdown",
    markdown: "markdown",
    mjs: "javascript",
    plaintext: "plaintext",
    py: "python",
    python: "python",
    rs: "rust",
    rust: "rust",
    scss: "scss",
    sh: "shell",
    shell: "shell",
    shellscript: "shell",
    sql: "sql",
    svg: "xml",
    toml: "ini",
    ts: "typescript",
    tsx: "typescript",
    typescript: "typescript",
    vue: "html",
    xml: "xml",
    yaml: "yaml",
    yml: "yaml",
};

const monacoLang = computed(() => {
    const key =
        selectedLanguage.value === "auto"
            ? resolveShikiLang(props.path.split(".").pop()?.toLowerCase())
            : selectLangToShiki(selectedLanguage.value) ||
              selectedLanguage.value;
    return MONACO_LANG_MAP[key] || "plaintext";
});

const cssVar = (name: string, fallback: string) =>
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    fallback;

/** 用主题变量定义编辑器深浅主题，颜色跟随全局换肤 */
const defineZxThemes = (monaco: typeof MonacoNamespace) => {
    const colors = () => ({
        "editor.background": cssVar("--zx-color-surface", "#ffffff"),
        "editor.foreground": cssVar("--zx-color-text-strong", "#0f172a"),
        "editorLineNumber.foreground": cssVar(
            "--zx-color-text-subtle",
            "#94a3b8",
        ),
        "editorLineNumber.activeForeground": cssVar(
            "--zx-color-primary",
            "#3b82f6",
        ),
        "editorIndentGuide.background": cssVar(
            "--zx-color-border",
            "#e2e8f0",
        ),
    });
    monaco.editor.defineTheme("zx-light", {
        base: "vs",
        inherit: true,
        rules: [],
        colors: colors(),
    });
    monaco.editor.defineTheme("zx-dark", {
        base: "vs-dark",
        inherit: true,
        rules: [],
        colors: colors(),
    });
};

const zxThemeName = () =>
    editorShikiTheme.value === "dark" ? "zx-dark" : "zx-light";

const syncMonacoValue = () => {
    if (monacoEditor && monacoEditor.getValue() !== content.value) {
        applyingMonacoValue = true;
        monacoEditor.setValue(content.value);
        applyingMonacoValue = false;
    }
};

onMounted(async () => {
    try {
        monacoInstance = await loadMonaco();
        if (!monacoHost.value) return;
        defineZxThemes(monacoInstance);
        monacoEditor = monacoInstance.editor.create(monacoHost.value, {
            value: content.value,
            language: monacoLang.value,
            theme: zxThemeName(),
            automaticLayout: true,
            fontFamily: '"JetBrains Mono", "Cascadia Mono", Consolas, monospace',
            fontSize: 14,
            lineHeight: 22,
            fontLigatures: false,
            minimap: { enabled: false },
            wordWrap: wordWrap.value ? "on" : "off",
            scrollBeyondLastLine: false,
            tabSize: 4,
            renderLineHighlight: "none",
            smoothScrolling: true,
            padding: { top: 10, bottom: 10 },
        });
        monacoEditor.onDidChangeModelContent(() => {
            if (applyingMonacoValue) return;
            content.value = monacoEditor!.getValue();
            emit("update:modelValue", content.value);
        });
        monacoEditor.addCommand(
            monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS,
            () => handleSave(),
        );
        monacoReady.value = true;
    } catch (e) {
        console.warn("Monaco 初始化失败，继续使用轻量编辑器", e);
    }
});

watch(monacoLang, (lang) => {
    const model = monacoEditor?.getModel();
    if (model && monacoInstance) {
        monacoInstance.editor.setModelLanguage(model, lang);
    }
});

watch(wordWrap, (wrap) => {
    monacoEditor?.updateOptions({ wordWrap: wrap ? "on" : "off" });
});

watch(currentEOL, (eol) => {
    const model = monacoEditor?.getModel();
    if (!model) return;
    // EndOfLineSequence：LF=1, CRLF=2（monaco 0.56 未从 editor.api 顶层导出）
    model.setEOL((eol === "crlf" ? 2 : 1) as MonacoNamespace.editor.EndOfLineSequence);
});

watch(
    () => props.readonly,
    (readonly) => {
        monacoEditor?.updateOptions({ readOnly: readonly });
    },
);

// ==================== 语法高亮（shiki 按需加载，主题跟随应用深浅色） ====================
const themeStore = useThemeStore();
const editorShikiTheme = computed(() =>
    themeStore.effectiveMode === "dark" ? "dark" : "light",
);
const highlightRef = ref<HTMLElement | null>(null);
const highlightHtml = ref("");

const shikiLang = computed(() => {
    if (selectedLanguage.value === "auto") {
        return resolveShikiLang(props.path.split(".").pop()?.toLowerCase());
    }
    return selectLangToShiki(selectedLanguage.value);
});

let highlightTimer: number | undefined;
let highlightSeq = 0;

const requestHighlight = () => {
    if (monacoReady.value) return; // monaco 引擎接管后垫层不再需要
    window.clearTimeout(highlightTimer);
    const seq = ++highlightSeq;
    highlightTimer = window.setTimeout(async () => {
        try {
            const html = await highlightCode(
                content.value,
                shikiLang.value,
                editorShikiTheme.value,
            );
            if (seq !== highlightSeq) return;
            highlightHtml.value = html;
            nextTick(syncOverlayScroll);
        } catch {
            if (seq === highlightSeq) highlightHtml.value = "";
        }
    }, 250);
};

watch([content, shikiLang, editorShikiTheme], requestHighlight, {
    immediate: true,
});

// 应用深浅切换时同步 monaco 主题（颜色值从主题变量重读）
watch(editorShikiTheme, () => {
    if (!monacoInstance || !monacoEditor) return;
    defineZxThemes(monacoInstance);
    monacoInstance.editor.setTheme(zxThemeName());
});

// ==================== Markdown 预览 ====================
const isMarkdown = computed(() => {
    if (selectedLanguage.value === "markdown") return true;
    if (selectedLanguage.value === "auto") {
        const ext = props.path.split(".").pop()?.toLowerCase();
        return ext === "md" || ext === "markdown";
    }
    return false;
});

const isPreviewing = ref(false);
const previewRef = ref<HTMLElement | null>(null);
const previewHtml = ref("");

let markedPromise: Promise<typeof import("marked")> | null = null;

const renderPreview = async () => {
    if (!markedPromise) markedPromise = import("marked");
    const { marked } = await markedPromise;
    try {
        previewHtml.value = await marked.parse(content.value, {
            async: false,
            gfm: true,
            breaks: true,
        });
    } catch {
        previewHtml.value = "";
    }
};

const togglePreview = () => {
    isPreviewing.value = true;
    renderPreview();
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
    const container = previewRef.value;
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

watch(content, () => {
    if (isPreviewing.value) {
        window.clearTimeout(previewTimer);
        previewTimer = window.setTimeout(renderPreview, 300);
    }
});

let previewTimer: number | undefined;

// 文件切换时回到编辑视图
watch(
    () => props.path,
    () => {
        isPreviewing.value = false;
    },
);

onBeforeUnmount(() => {
    window.clearTimeout(highlightTimer);
    window.clearTimeout(previewTimer);
    monacoEditor?.getModel()?.dispose();
    monacoEditor?.dispose();
    monacoEditor = null;
});

watch(
    () => props.modelValue,
    (newValue) => {
        if (newValue === content.value) return;
        content.value = newValue || "";
        initialValue.value = newValue || "";
        syncMonacoValue();
    },
);

watch(
    () => [props.language, props.path],
    () => {
        selectedLanguage.value = detectLanguage();
    },
);

defineExpose({
    getContent: () => content.value,
    setValue: (value: string) => {
        content.value = value;
        initialValue.value = value;
        emit("update:modelValue", value);
    },
    getEditor: () => textareaRef.value,
});
</script>

<style scoped>
.zx-editor-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: 0.5rem;
    background-color: var(--zx-color-surface);
}

.editor-toolbar {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    overflow-x: auto;
    border-bottom: 1px solid var(--zx-color-border);
    background-color: var(--zx-color-surface-muted);
    padding: 0.5rem 0.75rem;
}

.toolbar-left,
.toolbar-right {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 0.375rem;
}

.toolbar-select,
.toolbar-chip {
    display: inline-flex;
    height: 2rem;
    align-items: center;
    gap: 0.25rem;
    border: 1px solid transparent;
    border-radius: 9999px;
    background-color: var(--zx-color-surface);
    padding: 0 0.625rem;
    color: var(--zx-color-text-muted);
    font-size: 0.75rem;
    line-height: 1;
    white-space: nowrap;
    cursor: pointer;
    transition:
        background-color 0.15s,
        border-color 0.15s;
}

.toolbar-select {
    cursor: pointer;
    appearance: none;
}

.toolbar-select:hover,
.toolbar-chip:hover {
    border-color: var(--zx-color-border);
    color: var(--zx-color-text-strong);
}

.toolbar-select:disabled {
    cursor: not-allowed;
    opacity: 0.5;
}

.icon {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
}

/* 编辑 / 预览 分段切换 */
.preview-segmented {
    display: inline-flex;
    align-items: center;
    gap: 0.125rem;
    border-radius: 1rem;
    background-color: var(--zx-gray-100);
    padding: 0.25rem;
}

.preview-segmented button {
    display: inline-flex;
    height: 1.75rem;
    align-items: center;
    gap: 0.25rem;
    border: 0;
    border-radius: 9999px;
    background: transparent;
    padding: 0 0.75rem;
    color: var(--zx-color-text-muted);
    font-size: 0.75rem;
    line-height: 1;
    cursor: pointer;
    transition:
        background-color 0.15s,
        color 0.15s;
}

.preview-segmented button:hover {
    color: var(--zx-color-text-strong);
}

.preview-segmented .segmented-active {
    background-color: var(--zx-color-surface);
    color: var(--zx-color-primary);
    box-shadow: 0 1px 2px rgb(0 0 0 / 0.06);
}

.editor-wrapper {
    position: relative;
    display: grid;
    min-height: 250px;
    flex: 1;
    grid-template-columns: auto minmax(0, 1fr);
    overflow: hidden;
}

.editor-wrapper:has(> .md-preview) {
    grid-template-columns: minmax(0, 1fr);
    overflow-y: auto;
}

.editor-wrapper.is-monaco {
    grid-template-columns: minmax(0, 1fr);
}

.monaco-host {
    min-width: 0;
    min-height: 0;
}

.editor-content-host {
    position: relative;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
}

/* 高亮层垫在 textarea 下面，字体度量必须与 textarea 完全一致 */
.editor-highlight {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    padding: 0.75rem 1rem;
    color: var(--zx-color-text-strong);
    font-family: "JetBrains Mono", "Cascadia Mono", Consolas, monospace;
    font-size: 0.875rem;
    line-height: 1.55rem;
    tab-size: 4;
    user-select: none;
}

.editor-highlight :deep(pre) {
    margin: 0;
    padding: 0;
    background: transparent !important;
    font: inherit;
    tab-size: 4;
    white-space: pre;
}

.editor-highlight.is-wrap :deep(pre) {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
}

.editor-highlight :deep(code) {
    display: block;
    font: inherit;
    tab-size: 4;
}

.line-number-gutter {
    min-width: 3.5rem;
    overflow: hidden;
    border-right: 1px solid var(--zx-color-border);
    background-color: var(--zx-color-surface-muted);
    padding: 0.75rem 0.75rem 0.75rem 0.5rem;
    color: var(--zx-color-text-subtle);
    font-family: "JetBrains Mono", "Cascadia Mono", Consolas, monospace;
    font-size: 0.875rem;
    line-height: 1.55rem;
    text-align: right;
    user-select: none;
}

.line-number-gutter span {
    display: block;
}

.editor-textarea {
    width: 100%;
    height: 100%;
    resize: none;
    overflow: auto;
    border: 0;
    background-color: var(--zx-color-surface);
    padding: 0.75rem 1rem;
    color: var(--zx-color-text-strong);
    font-family: "JetBrains Mono", "Cascadia Mono", Consolas, monospace;
    font-size: 0.875rem;
    line-height: 1.55rem;
    outline: none;
    tab-size: 4;
}

.editor-textarea:not(.whitespace-pre) {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
}

/* 高亮开启时 textarea 文字透明、只留光标 */
.editor-textarea.has-highlight {
    color: transparent;
    caret-color: var(--zx-color-text-strong);
}

/* ==================== Markdown 预览 ==================== */
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

.loading-overlay {
    position: absolute;
    inset: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: color-mix(in srgb, var(--zx-color-surface) 82%, transparent);
}

.loading-content {
    text-align: center;
}

.loading-icon {
    margin: 0 auto;
    width: 2.5rem;
    height: 2.5rem;
    color: var(--zx-color-primary);
    animation: spin 1s linear infinite;
}

.loading-content p {
    margin-top: 0.5rem;
    color: var(--zx-color-text-muted);
    font-size: 0.875rem;
}

@media (min-width: 640px) {
    .editor-toolbar {
        padding: 0.5rem 1rem;
    }

    .toolbar-left,
    .toolbar-right {
        gap: 0.5rem;
    }

    .toolbar-select,
    .toolbar-chip {
        padding: 0 0.75rem;
        font-size: 0.8125rem;
    }

    .editor-wrapper {
        min-height: 400px;
    }
}

@keyframes spin {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}
</style>
