<script setup lang="ts">
/**
 * 文本 / JSON 单元格浮窗编辑器
 * - 无标题栏；失焦关闭；放大在底栏
 * - 底栏含语言选择；行号沟槽收紧
 * - 颜色跟主题 token
 */
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Maximize2 } from "lucide-vue-next";
import { loadMonaco } from "@/components/ZXTextEditor/monacoLoader";
import {
    defineZxThemes,
    zxThemeName,
} from "@/components/ZXTextEditor/monacoTheme";
import { LANGUAGE_OPTIONS } from "@/components/FileEditorModal/useWorkbench";
import { useThemeStore } from "@/store/theme";
import {
    OVERLAY_ID,
    useOverlayStack,
} from "@/composables/useOverlayStack";
import type * as MonacoNamespace from "monaco-editor/editor/editor.api";

const props = defineProps<{
    x: number;
    y: number;
    colName: string;
    colType: string;
    modelValue: string;
    /** 初始 monaco language id */
    language: "text" | "json" | "plaintext";
}>();

const emit = defineEmits<{
    "update:modelValue": [value: string];
    save: [];
    cancel: [];
}>();

const themeStore = useThemeStore();

const panelW = ref(360);
const panelH = ref(260);
const expanded = ref(false);

const panelEl = ref<HTMLElement | null>(null);
const host = ref<HTMLElement | null>(null);
const langId = ref(
    props.language === "text" ? "plaintext" : props.language || "plaintext",
);

const { pushOverlay, removeOverlay, isTopOverlay } = useOverlayStack();

/** 组件挂载即为打开（由父级 v-if 控制）；失焦/Esc 由栈统一关闭 */
pushOverlay({
    id: OVERLAY_ID.cellEditor,
    el: () => panelEl.value,
    onClose: () => emit("save"),
    closeOnOutsideClick: true,
    closeOnEsc: true,
});
onBeforeUnmount(() => removeOverlay(OVERLAY_ID.cellEditor));

let monaco: typeof MonacoNamespace | null = null;
let editor: MonacoNamespace.editor.IStandaloneCodeEditor | null = null;
let applying = false;

const langLabel = (id: string) =>
    LANGUAGE_OPTIONS.find((l) => l.value === id)?.label || id;

const toggleExpand = async () => {
    expanded.value = !expanded.value;
    panelW.value = expanded.value
        ? Math.min(560, window.innerWidth - 24)
        : 360;
    panelH.value = expanded.value
        ? Math.min(420, window.innerHeight - 48)
        : 260;
    await nextTick();
    editor?.layout();
};

/** 面板内控件 / monaco 弹层都不算失焦 */
const isInternalFocus = (el: HTMLElement | null) => {
    if (!el) return false;
    if (panelEl.value?.contains(el)) return true;
    return Boolean(
        el.closest(
            ".monaco-editor, .overflow-guard, .suggest-widget, .context-view, .db-cell-editor",
        ),
    );
};

/** 失焦关闭：仅当本浮层在栈顶时才保存退出（上层弹窗还开着则不关） */
const onFocusOut = (e: FocusEvent) => {
    const next = e.relatedTarget as HTMLElement | null;
    if (isInternalFocus(next)) return;
    if (isInternalFocus(document.activeElement as HTMLElement | null)) return;
    if (!isTopOverlay(OVERLAY_ID.cellEditor)) return;
    emit("save");
};

const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
        e.preventDefault();
        emit("cancel");
        return;
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        emit("save");
    }
};

const onLangChange = async () => {
    if (!monaco || !editor) return;
    const model = editor.getModel();
    if (model) monaco.editor.setModelLanguage(model, langId.value);
    editor.focus();
};

const initEditor = async () => {
    if (!host.value || editor) return;
    monaco = await loadMonaco();
    defineZxThemes(monaco);
    editor = monaco.editor.create(host.value, {
        value: props.modelValue,
        language: langId.value,
        theme: zxThemeName(themeStore.effectiveMode),
        automaticLayout: true,
        fontFamily:
            '"JetBrains Mono", "Cascadia Mono", Consolas, "Microsoft YaHei", monospace',
        fontSize: 13,
        lineHeight: 20,
        minimap: { enabled: false },
        wordWrap: "on",
        scrollBeyondLastLine: false,
        tabSize: 2,
        renderLineHighlight: "none",
        smoothScrolling: true,
        padding: { top: 6, bottom: 6 },
        // 行号沟槽收紧
        lineNumbersMinChars: 2,
        lineDecorationsWidth: 2,
        glyphMargin: false,
        folding: false,
        scrollbar: {
            vertical: "auto",
            horizontal: "auto",
            verticalScrollbarSize: 6,
            horizontalScrollbarSize: 6,
            arrowSize: 0,
            useShadows: false,
        },
        overviewRulerLanes: 0,
        fixedOverflowWidgets: true,
    });
    editor.onDidChangeModelContent(() => {
        if (applying || !editor) return;
        emit("update:modelValue", editor.getValue());
    });
    editor.focus();
};

onMounted(() => {
    void initEditor();
});

watch(
    () => props.modelValue,
    (v) => {
        if (!editor || editor.getValue() === v) return;
        applying = true;
        editor.setValue(v);
        applying = false;
    },
);

watch(
    () => themeStore.effectiveMode,
    (mode) => {
        if (!monaco || !editor) return;
        defineZxThemes(monaco);
        monaco.editor.setTheme(zxThemeName(mode));
    },
);

onBeforeUnmount(() => {
    editor?.dispose();
    editor = null;
});
</script>

<template>
    <Teleport to="body">
        <div
            ref="panelEl"
            class="db-cell-editor fixed z-[100] flex flex-col overflow-hidden rounded-xl border border-zx-border bg-white shadow-[var(--shadow-zx-popover)]"
            :style="{
                left: `${x}px`,
                top: `${y}px`,
                width: `${panelW}px`,
                height: `${panelH}px`,
            }"
            :title="`${colName} · ${colType}`"
            tabindex="-1"
            @click.stop
            @keydown="onKey"
            @focusout="onFocusOut"
        >
            <!-- 主体：全幅编辑器 -->
            <div class="min-h-0 flex-1 bg-white">
                <div ref="host" class="h-full w-full" />
            </div>

            <!-- 底栏：当前语言 / 放大 -->
            <div
                class="flex h-9 flex-shrink-0 items-center gap-2 border-t border-slate-200 px-2"
            >
                <span
                    class="truncate text-xs text-zx-text-muted"
                    :title="langLabel(langId)"
                    >{{ langLabel(langId) }}</span
                >
                <button
                    type="button"
                    class="btn-touch ml-auto cursor-pointer rounded-md p-1.5 text-zx-text-muted transition-colors hover:bg-slate-100 hover:text-zx-text"
                    title="放大 / 还原"
                    @click.stop="toggleExpand"
                >
                    <Maximize2 class="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    </Teleport>
</template>
