/**
 * 文件工作台核心 composable。
 *
 * 与 ZXTextEditor 的单 model v-model 不同，这里每个文件一个独立 monaco model
 * （VSCode 同款），切标签只换 model + 恢复 viewState，光标/撤销/滚动状态天然保留。
 * Ctrl+S 由宿主组件的 window 监听统一入口调用 saveActive，避免双触发。
 */
import { computed, markRaw, nextTick, reactive, ref, shallowRef, watch } from "vue";
import type * as MonacoNamespace from "monaco-editor/editor/editor.api";
import { fileApi } from "@/utils/api-next";
import { ZXMessageBox, ZXNotification } from "@/services/ui";
import { loadMonaco } from "@/components/ZXTextEditor/monacoLoader";
import { defineZxThemes, zxThemeName } from "@/components/ZXTextEditor/monacoTheme";
import { useThemeStore } from "@/store/theme";
import { idbGet, idbSet } from "@/utils/idb-cache";
import { isArchiveFile, isBinaryFile, isImageFile, imageMime } from "./fileIcons";
import { b64ToUtf8 } from "./binary";
import type { EditorGroupId, EditorTab, FileKind, ViewMode } from "./types";

// monaco EndOfLineSequence：LF=1, CRLF=2（0.56 未从 editor.api 顶层导出枚举值）
const EOL_LF = 1 as const;
const EOL_CRLF = 2 as const;

/** 会话持久化键：IndexedDB（跨刷新） + 模块内存（关窗重开不丢） */
const SESSION_IDB_KEY = "zx-workbench-session";

/** 关闭编辑器后保留的标签会话 */
interface WorkbenchTabSession {
    path: string;
    name: string;
    group: string;
    viewMode: ViewMode;
    kind?: FileKind;
    language?: string;
    tableName?: string;
}
interface WorkbenchSession {
    tabs: WorkbenchTabSession[];
    layoutColumns: string[][];
    columnWeights: number[];
    groupWeights: Record<string, number>;
    activeTabId: string;
    activeGroupId: string;
    groupSeq: number;
}
let savedSession: WorkbenchSession | null = null;

/** 后缀 → monaco 语言 id */
const LANG_BY_EXT: Record<string, string> = {
    bat: "bat",
    c: "cpp",
    cmd: "bat",
    cpp: "cpp",
    cjs: "javascript",
    css: "css",
    dockerfile: "dockerfile",
    env: "env",
    go: "go",
    h: "cpp",
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
    ps1: "shell",
    py: "python",
    rs: "rust",
    scss: "scss",
    sh: "shell",
    sql: "sql",
    svg: "xml",
    toml: "ini",
    ts: "typescript",
    tsx: "typescript",
    vue: "html",
    xml: "xml",
    yaml: "yaml",
    yml: "yaml",
};

export interface LanguageOption {
    label: string;
    value: string;
    fullName: string;
}

/** 状态栏语言切换档位（monaco 语言 id） */
export const LANGUAGE_OPTIONS: LanguageOption[] = [
    { label: "Plain Text", value: "plaintext", fullName: "Plain Text Document (.txt)" },
    { label: "Dotenv", value: "env", fullName: "Environment Configuration (.env)" },
    { label: "JavaScript", value: "javascript", fullName: "ECMAScript / JavaScript (.js, .mjs)" },
    { label: "TypeScript", value: "typescript", fullName: "TypeScript Language (.ts, .tsx)" },
    { label: "Python", value: "python", fullName: "Python Programming Language (.py)" },
    { label: "JSON", value: "json", fullName: "JavaScript Object Notation (.json)" },
    { label: "YAML", value: "yaml", fullName: "YAML Ain't Markup Language (.yaml, .yml)" },
    { label: "TOML", value: "ini", fullName: "Tom's Obvious Minimal Language (.toml)" },
    { label: "HTML", value: "html", fullName: "HyperText Markup Language (.html, .htm)" },
    { label: "XML", value: "xml", fullName: "Extensible Markup Language (.xml, .svg)" },
    { label: "CSS", value: "css", fullName: "Cascading Style Sheets (.css)" },
    { label: "SCSS", value: "scss", fullName: "Sassy Cascading Style Sheets (.scss)" },
    { label: "Less", value: "less", fullName: "Leaner Style Sheets (.less)" },
    { label: "Markdown", value: "markdown", fullName: "Markdown Documentation (.md)" },
    { label: "SQL", value: "sql", fullName: "Structured Query Language (.sql)" },
    { label: "Shell", value: "shell", fullName: "Unix Shell Script (.sh, .bash, .zsh)" },
    { label: "Batch", value: "bat", fullName: "Windows Batch Script (.bat, .cmd)" },
    { label: "Dockerfile", value: "dockerfile", fullName: "Docker Container Build File" },
    { label: "Go", value: "go", fullName: "Go Programming Language (.go)" },
    { label: "Rust", value: "rust", fullName: "Rust Programming Language (.rs)" },
    { label: "Java", value: "java", fullName: "Java Programming Language (.java)" },
    { label: "C/C++", value: "cpp", fullName: "C / C++ Programming Language (.c, .cpp)" },
];

/** 图片视图 data URL：命中 tab.imageUrl 缓存则直接复用（避免拖宽时重复拼接巨型字符串） */
export const imageDataUrl = (tab: EditorTab): string => {
    if (tab.imageUrl) return tab.imageUrl;
    if (!tab.bytesB64) return "";
    const url = `data:${imageMime(tab.name)};base64,${tab.bytesB64}`;
    tab.imageUrl = url;
    return url;
};

// ==================== Python 智能补全（客户端静态分析） ====================
// 无语言服务器的轻量方案：关键字/内置/异常/片段 + 本文档符号扫描
// （类/函数含签名/变量/导入名）+ self. 成员补全。深类型推断需后端 LSP，暂不引入。

/** monaco 是缓存的单例，补全 provider 只能注册一次，否则建议列表重复 */
let pythonCompletionRegistered = false;

const PY_KEYWORDS = [
    "and", "as", "assert", "async", "await", "break", "class", "continue",
    "def", "del", "elif", "else", "except", "finally", "for", "from",
    "global", "if", "import", "in", "is", "lambda", "nonlocal", "not",
    "or", "pass", "raise", "return", "try", "while", "with", "yield",
    "False", "None", "True", "self", "cls",
];

const PY_FUNCTION_BUILTINS = [
    "print", "len", "range", "sorted", "reversed", "sum", "min", "max",
    "abs", "round", "enumerate", "zip", "map", "filter", "open", "input",
    "isinstance", "issubclass", "type", "super", "any", "all", "repr",
    "format", "getattr", "setattr", "hasattr", "delattr", "vars", "dir",
    "id", "hash", "iter", "next", "callable",
];

const PY_TYPE_BUILTINS = [
    "int", "float", "str", "bool", "bytes", "list", "dict", "set",
    "frozenset", "tuple", "object", "complex", "bytearray",
];

const PY_EXCEPTIONS = [
    "Exception", "BaseException", "ValueError", "TypeError", "KeyError",
    "IndexError", "AttributeError", "NameError", "RuntimeError",
    "StopIteration", "OSError", "FileNotFoundError", "FileExistsError",
    "PermissionError", "TimeoutError", "ConnectionError",
    "UnicodeDecodeError", "ZeroDivisionError", "ImportError",
    "ModuleNotFoundError", "NotImplementedError", "KeyboardInterrupt",
    "LookupError", "ArithmeticError", "Warning",
];

/** [标签, 插入片段, 说明] */
const PY_SNIPPETS: Array<[string, string, string]> = [
    ["def", "def ${1:name}(${2}):\n    ${3:pass}", "函数定义"],
    ["async def", "async def ${1:name}(${2}):\n    ${3:pass}", "异步函数定义"],
    [
        "class",
        "class ${1:Name}:\n    def __init__(self):\n        ${2:pass}",
        "类定义",
    ],
    ["ifmain", 'if __name__ == "__main__":\n    ${1:main()}', "__main__ 入口"],
    [
        "try/except",
        "try:\n    ${1:pass}\nexcept ${2:Exception} as ${3:e}:\n    ${4:raise}",
        "异常处理",
    ],
    ["for", "for ${1:item} in ${2:items}:\n    ${3:pass}", "for 循环"],
    [
        "with open",
        'with open(${1:path}, ${2:encoding="utf-8"}) as ${3:f}:\n    ${4:pass}',
        "文件上下文",
    ],
];

const registerPythonCompletion = (m: typeof MonacoNamespace) => {
    if (pythonCompletionRegistered) return;
    pythonCompletionRegistered = true;
    const { CompletionItemKind, CompletionItemInsertTextRule } = m.languages;

    const item = (
        label: string,
        kind: MonacoNamespace.languages.CompletionItemKind,
        detail: string,
        range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number },
        extra?: Partial<MonacoNamespace.languages.CompletionItem>,
    ): MonacoNamespace.languages.CompletionItem => ({
        label,
        kind,
        detail,
        range,
        insertText: extra?.insertText ?? label,
        ...extra,
    });

    m.languages.registerCompletionItemProvider("python", {
        triggerCharacters: ["."],
        provideCompletionItems(model, position) {
            const word = model.getWordUntilPosition(position);
            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn,
            };
            const text = model.getValue();
            const suggestions: MonacoNamespace.languages.CompletionItem[] = [];
            const declared = new Set<string>();

            // 「self.」触发：本文档内的实例属性与方法
            const linePrefix = model.getValueInRange({
                startLineNumber: position.lineNumber,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
            });
            if (/self\.\w*$/.test(linePrefix)) {
                for (const match of text.matchAll(/self\.(\w+)\s*=/g)) {
                    if (!declared.has(match[1])) {
                        declared.add(match[1]);
                        suggestions.push(
                            item(match[1], CompletionItemKind.Field, "实例属性", range),
                        );
                    }
                }
                for (const match of text.matchAll(/^\s*(?:async\s+)?def\s+(\w+)\s*\(\s*self\b/gm)) {
                    if (!declared.has(match[1])) {
                        declared.add(match[1]);
                        suggestions.push(
                            item(match[1], CompletionItemKind.Method, "方法", range),
                        );
                    }
                }
                return { suggestions };
            }

            // 本文档符号：类 / 函数（含签名摘要）/ 顶层变量 / 导入名
            for (const match of text.matchAll(/^\s*class\s+(\w+)/gm)) {
                declared.add(match[1]);
                suggestions.push(item(match[1], CompletionItemKind.Class, "本文档类", range));
            }
            for (const match of text.matchAll(/^\s*(?:async\s+)?def\s+(\w+)\s*\(([^)]*)/gm)) {
                if (declared.has(match[1])) continue;
                declared.add(match[1]);
                const args = match[2].replace(/\s+/g, " ").trim();
                const detail = args
                    ? `(${args.length > 42 ? `${args.slice(0, 42)}…` : args})`
                    : "()";
                suggestions.push(
                    item(match[1], CompletionItemKind.Function, detail, range),
                );
            }
            for (const match of text.matchAll(/^(\w+)\s*=(?!=)/gm)) {
                if (declared.has(match[1])) continue;
                declared.add(match[1]);
                suggestions.push(
                    item(match[1], CompletionItemKind.Variable, "本文档变量", range),
                );
            }
            for (const match of text.matchAll(/^from\s+([\w.]+)\s+import\s+(.+)$/gm)) {
                for (const raw of match[2].split(",")) {
                    const name = raw.trim().split(/\s+as\s+/).pop() || "";
                    if (!name || name === "*" || declared.has(name)) continue;
                    declared.add(name);
                    suggestions.push(
                        item(name, CompletionItemKind.Module, `来自 ${match[1]}`, range),
                    );
                }
            }
            for (const match of text.matchAll(/^import\s+(.+)$/gm)) {
                for (const mod of match[1].split(",")) {
                    const name = mod.trim().split(".")[0];
                    if (!name || declared.has(name)) continue;
                    declared.add(name);
                    suggestions.push(
                        item(name, CompletionItemKind.Module, "模块", range),
                    );
                }
            }

            // 关键字 / 内置 / 异常 / 代码片段
            for (const k of PY_KEYWORDS) {
                suggestions.push(item(k, CompletionItemKind.Keyword, "关键字", range));
            }
            for (const f of PY_FUNCTION_BUILTINS) {
                suggestions.push(item(f, CompletionItemKind.Function, "内置函数", range));
            }
            for (const t of PY_TYPE_BUILTINS) {
                suggestions.push(item(t, CompletionItemKind.Class, "内置类型", range));
            }
            for (const e of PY_EXCEPTIONS) {
                suggestions.push(item(e, CompletionItemKind.Class, "内置异常", range));
            }
            for (const [label, body, detail] of PY_SNIPPETS) {
                suggestions.push(
                    item(label, CompletionItemKind.Snippet, detail, range, {
                        insertText: body,
                        insertTextRules:
                            CompletionItemInsertTextRule.InsertAsSnippet,
                    }),
                );
            }
            return { suggestions };
        },
    });
};

export const useWorkbench = () => {
    const themeStore = useThemeStore();
    const monaco = shallowRef<typeof MonacoNamespace | null>(null);
    const isMonacoReady = ref(false);
    /** monaco + 会话标签壳恢复完毕后为 true，宿主再展示完整编辑器窗口 */
    const isReady = ref(false);
    /** 打开编辑器时用户点的文件：恢复会话后优先停在该标签，而不是旧会话活动标签 */
    const sessionPreferPath = ref("");

    const setSessionPreferPath = (path: string) => {
        sessionPreferPath.value = path;
    };


    const tabs = ref<EditorTab[]>([]);
    const activeTabId = ref("");
    /** 底部 SQL 控制台面板（对齐 VSCode 底栏 / Supabase 快捷 SQL） */
    const showBottomSql = ref(false);
    const openBottomSql = () => {
        showBottomSql.value = true;
    };
    const closeBottomSql = () => {
        showBottomSql.value = false;
    };
    const toggleBottomSql = () => {
        showBottomSql.value = !showBottomSql.value;
    };
    /** 表编辑器：侧栏双击列后需要定位的列 */
    const tableFocusColumn = ref<{ table: string; column: string } | null>(
        null,
    );
    const setTableFocusColumn = (table: string, column: string) => {
        tableFocusColumn.value = { table, column };
    };
    const clearTableFocusColumn = () => {
        tableFocusColumn.value = null;
    };
    /** 各分组的 monaco 实例（懒创建，由 EditorPane 挂载时注入 host） */
    const groupEditors = new Map<
        EditorGroupId,
        MonacoNamespace.editor.IStandaloneCodeEditor
    >();
    /** 当前焦点组的 monaco（快捷访问；命令类 API 都打在激活组上） */
    const activeEditor = () => groupEditors.get(activeGroupId.value) || null;
    const editorOf = (gid: EditorGroupId) => groupEditors.get(gid) || null;

    // ==================== VSCode 式编辑器组（列内上下、列间左右，无硬上限） ====================
    /** 软上限，避免拖出过多 monaco 实例卡死页面 */
    const MAX_GROUPS = 10;
    /**
     * 列式布局：layoutColumns[i] = 第 i 列从上到下的组 id 列表。
     * 拆右 = 右侧插入新列；拆下 = 同列 current 下方插入。
     */
    const layoutColumns = ref<EditorGroupId[][]>([["g0"]]);
    const activeGroupId = ref<EditorGroupId>("g0");
    const groupActiveTabIds = reactive<Record<string, string>>({});
    /** 组内激活历史（MRU）：拖走当前标签后回落到上一个，而不是列表第一个 */
    const groupActiveHistory = reactive<Record<string, string[]>>({});
    /** 列宽 flex 权重 */
    const columnWeights = ref<number[]>([1]);
    /** 组高 flex 权重（按组 id） */
    const groupWeights = reactive<Record<string, number>>({ g0: 1 });
    let groupSeq = 1;

    const createGroupId = (): EditorGroupId => `g${groupSeq++}`;

    const allGroupIds = computed(() =>
        layoutColumns.value.flat(),
    );

    const isSplit = computed(() => allGroupIds.value.length > 1);
    /** 旧字段兼容：有任意一列堆叠 >1 视为纵向 */
    const hasSecondRow = computed(() =>
        layoutColumns.value.some((col) => col.length > 1),
    );
    const splitDirection = computed<"horizontal" | "vertical">(() =>
        hasSecondRow.value ? "vertical" : "horizontal",
    );
    const splitRatio = computed({
        get: () => rowRatioCompat(),
        set: (v: number) => setRowRatioCompat(v),
    });

    let rowRatioCompatValue = Math.max(
        20,
        Math.min(80, Number(localStorage.getItem("zx-editor-row-ratio")) || 50),
    );
    const rowRatioCompat = () => rowRatioCompatValue;
    const setRowRatioCompat = (r: number) => {
        rowRatioCompatValue = Math.max(20, Math.min(80, r));
        localStorage.setItem("zx-editor-row-ratio", String(rowRatioCompatValue));
    };

    const locateGroup = (gid: EditorGroupId) => {
        for (let ci = 0; ci < layoutColumns.value.length; ci++) {
            const col = layoutColumns.value[ci]!;
            const ri = col.indexOf(gid);
            if (ri !== -1) return { colIndex: ci, rowIndex: ri };
        }
        return null;
    };

    const normalizeWeights = () => {
        const cols = layoutColumns.value;
        if (columnWeights.value.length !== cols.length) {
            const each = 1 / cols.length;
            columnWeights.value = cols.map(() => each);
        }
        // 归一化列宽
        const sum = columnWeights.value.reduce((a, b) => a + b, 0) || 1;
        columnWeights.value = columnWeights.value.map((w) => w / sum);
        for (const col of cols) {
            if (!col.length) continue;
            if (!groupWeights[col[0]!]) groupWeights[col[0]!] = 1;
            let gsum = 0;
            for (const g of col) {
                groupWeights[g] = groupWeights[g] || 1;
                gsum += groupWeights[g];
            }
            if (gsum > 0) {
                for (const g of col) groupWeights[g] /= gsum;
            }
        }
    };

    const tabsInGroup = (gid: EditorGroupId) =>
        tabs.value.filter((t) => (t.group || "g0") === gid);

    /** 记录组内激活历史（最前为最近一次） */
    const pushGroupHistory = (gid: EditorGroupId, tabId: string) => {
        const h = groupActiveHistory[gid] || (groupActiveHistory[gid] = []);
        const i = h.indexOf(tabId);
        if (i !== -1) h.splice(i, 1);
        h.unshift(tabId);
        if (h.length > 30) h.length = 30;
    };

    /** 从组内历史里挑最近仍在该组的标签（拖走后回落用） */
    const lastActiveInGroup = (gid: EditorGroupId, excludeId?: string) => {
        const list = tabsInGroup(gid);
        const history = groupActiveHistory[gid] || [];
        for (const id of history) {
            if (id === excludeId) continue;
            const t = list.find((x) => x.id === id);
            if (t) return t;
        }
        return list.find((t) => t.id !== excludeId) || list[0] || null;
    };

    const activeTabInGroup = (gid: EditorGroupId) => {
        const list = tabsInGroup(gid);
        if (!list.length) return null;
        const cur = groupActiveTabIds[gid];
        const found = list.find((t) => t.id === cur);
        if (found) return found;
        // 当前 id 不在组内（被拖走/关闭）：回落到 MRU 历史里的上一个
        return lastActiveInGroup(gid) || list[0] || null;
    };

    const activeTab = computed(() => activeTabInGroup(activeGroupId.value));
    const dirtyTabs = computed(() => tabs.value.filter((t) => t.isDirty));

    const setSplitDirection = () => {
        nextTick(() => {
            layoutAll();
        });
    };

    /** 两组时左右/上下互换（菜单入口） */
    const toggleSplitDirection = () => {
        const ids = allGroupIds.value;
        if (ids.length !== 2) return;
        const [a, b] = ids as [EditorGroupId, EditorGroupId];
        if (hasSecondRow.value) {
            layoutColumns.value = [[a, b]];
        } else {
            layoutColumns.value = [[a], [b]];
        }
        normalizeWeights();
        nextTick(() => layoutAll());
    };

    // 状态栏状态（激活标签维度）
    const cursorLine = ref(1);
    const cursorCol = ref(1);
    /** 激活 model 的实时文本：字符数统计与 md 预览取数用 */
    const contentText = ref("");
    const wordWrap = ref(
        localStorage.getItem("zx-workbench-wordwrap") === "true",
    );
    const tabSize = ref(4);
    /** 工作区根路径（状态栏路径锚定用），init 时异步取一次 */
    const rootPath = ref("");

    const normalizePath = (p: string) =>
        p.replace(/\\/g, "/").replace(/\/{2,}/g, "/");

    const langByPath = (path: string) => {
        const name = path.split("/").pop()?.toLowerCase() || "";
        if (name === ".env" || name.startsWith(".env.") || name.endsWith(".env")) return "env";
        if (LANG_BY_EXT[name]) return LANG_BY_EXT[name];
        const ext = name.includes(".") ? name.split(".").pop()! : "";
        return LANG_BY_EXT[ext] || "plaintext";
    };

    const langLabel = (id: string) =>
        LANGUAGE_OPTIONS.find((l) => l.value === id)?.label || id;

    const markDirty = (tab: EditorTab) => {
        if (!tab.model) return;
        const dirty = tab.model.getValue() !== tab.initialContent;
        // VSCode：预览标签被编辑即固定
        if (dirty && tab.isPreview) tab.isPreview = false;
        tab.isDirty = dirty;
        if (tab.id === activeTabId.value) {
            contentText.value = tab.model.getValue();
        }
        scheduleDiffDecorations(tab);
    };

    // ==================== 左侧行改动条（相对打开/保存时的磁盘基线） ====================
    /** model → decoration ids（非响应式，避免包进 reactive） */
    const diffDecorationIds = new WeakMap<object, string[]>();
    const diffTimers = new WeakMap<object, ReturnType<typeof setTimeout>>();

    /**
     * 行级 LCS diff。
     * added / modified：标在 current 行上；deleted：标在删除发生处的 current 行号
     * （删除行本身不在当前缓冲，红条落在「原删除位置」那一带 + overview）。
     */
    const computeLineDiff = (
        baseline: string,
        current: string,
    ): Map<number, "added" | "modified" | "deleted"> => {
        const result = new Map<number, "added" | "modified" | "deleted">();
        if (baseline === current) return result;

        const a = baseline.split("\n");
        const b = current.split("\n");
        const markDeleted = (posInB: number) => {
            // posInB = 0-based 当前行（删除发生处）；标到下一行或末行
            const line = Math.min(posInB + 1, Math.max(b.length, 1));
            result.set(line, "deleted");
        };

        if (a.length * b.length > 4_000_000) {
            let p = 0;
            while (p < a.length && p < b.length && a[p] === b[p]) p++;
            let s = 0;
            while (
                s < a.length - p &&
                s < b.length - p &&
                a[a.length - 1 - s] === b[b.length - 1 - s]
            )
                s++;
            if (a.length - p - s > 0 && b.length - p - s === 0) {
                markDeleted(p);
            }
            for (let i = p; i < b.length - s; i++) {
                result.set(i + 1, i < a.length - s ? "modified" : "added");
            }
            return result;
        }

        const n = a.length;
        const m = b.length;
        const dp: Uint32Array = new Uint32Array((n + 1) * (m + 1));
        const at = (i: number, j: number) => i * (m + 1) + j;
        for (let i = n - 1; i >= 0; i--) {
            for (let j = m - 1; j >= 0; j--) {
                dp[at(i, j)] =
                    a[i] === b[j]
                        ? dp[at(i + 1, j + 1)]! + 1
                        : Math.max(dp[at(i + 1, j)]!, dp[at(i, j + 1)]!);
            }
        }
        let i = 0;
        let j = 0;
        let pendingDelete = false;
        while (i < n && j < m) {
            if (a[i] === b[j]) {
                i++;
                j++;
                pendingDelete = false;
            } else if (dp[at(i + 1, j)]! >= dp[at(i, j + 1)]!) {
                // 基线删除：记在当前 j 位置
                markDeleted(j);
                i++;
                pendingDelete = true;
            } else {
                // 插入：紧邻删除 → modified；否则 added
                const kind = pendingDelete ? "modified" : "added";
                result.set(j + 1, kind);
                // 替换块覆盖原 deleted 标记
                if (pendingDelete) {
                    const delLine = Math.min(j + 1, Math.max(m, 1));
                    if (result.get(delLine) === "deleted") {
                        result.delete(delLine);
                    }
                }
                j++;
                pendingDelete = false;
            }
        }
        while (i < n) {
            markDeleted(j);
            i++;
        }
        while (j < m) {
            result.set(j + 1, "added");
            j++;
        }
        return result;
    };

    const clearDiffDecorations = (tab: EditorTab) => {
        const model = tab.model;
        if (!model) return;
        const old = diffDecorationIds.get(model);
        if (old?.length) {
            model.deltaDecorations(old, []);
            diffDecorationIds.delete(model);
        }
        const t = diffTimers.get(model);
        if (t) {
            clearTimeout(t);
            diffTimers.delete(model);
        }
    };

    const applyDiffDecorations = (tab: EditorTab) => {
        const m = monaco.value;
        const model = tab.model;
        if (!m || !model || tab.viewMode !== "text") return;

        const marks = computeLineDiff(tab.initialContent, model.getValue());
        const next: MonacoNamespace.editor.IModelDeltaDecoration[] = [];
        for (const [line, kind] of marks) {
            const cls =
                kind === "added"
                    ? "wb-diff-added"
                    : kind === "modified"
                      ? "wb-diff-modified"
                      : "wb-diff-deleted";
            const color =
                kind === "added"
                    ? "#22c55e88"
                    : kind === "modified"
                      ? "#3b82f688"
                      : "#ef444488";
            next.push({
                range: new m.Range(line, 1, line, 1),
                options: {
                    isWholeLine: true,
                    linesDecorationsClassName: cls,
                    // 删除：行可能仍是原内容，overview 用红标出删除位置
                    overviewRuler: {
                        color,
                        position: m.editor.OverviewRulerLane.Full,
                    },
                },
            });
        }
        const old = diffDecorationIds.get(model) || [];
        const ids = model.deltaDecorations(old, next);
        diffDecorationIds.set(model, ids);
    };

    const scheduleDiffDecorations = (tab: EditorTab) => {
        const model = tab.model;
        if (!model) return;
        const prev = diffTimers.get(model);
        if (prev) clearTimeout(prev);
        diffTimers.set(
            model,
            setTimeout(() => {
                diffTimers.delete(model);
                applyDiffDecorations(tab);
            }, 120),
        );
    };

    const refreshStatus = () => {
        const tab = activeTab.value;
        if (!tab?.model) return;
        const ed = activeEditor();
        const pos = ed?.getPosition();
        cursorLine.value = pos?.lineNumber ?? 1;
        cursorCol.value = pos?.column ?? 1;
        contentText.value = tab.model.getValue();
        tabSize.value = tab.model.getOptions().tabSize;
    };

    /** 内容对齐期标志：setEOL/setValue 触发的 change 不是用户编辑，
     *  否则 CRLF 文件加载时会被误判 dirty → 预览标签被意外固定 */
    let applyingContent = false;

    /** 把磁盘读到的内容与行尾对齐到 model（createModel 会归一化行尾，基线需重置） */
    const applyContentToModel = (tab: EditorTab) => {
        if (!tab.model) return;
        applyingContent = true;
        try {
            tab.eol = tab.initialContent.includes("\r\n") ? "crlf" : "lf";
            tab.model.setEOL(
                (tab.eol === "crlf" ? EOL_CRLF : EOL_LF) as MonacoNamespace.editor.EndOfLineSequence,
            );
            if (tab.model.getValue() !== tab.initialContent) {
                tab.model.setValue(tab.initialContent);
            }
            // 以模型规范化后的内容为 dirty 基线
            tab.initialContent = tab.model.getValue();
            clearDiffDecorations(tab);
        } finally {
            applyingContent = false;
        }
        markDirty(tab);
    };

    /** 为标签创建 monaco model（可能发生在内容读取前，内容由 applyContentToModel 补齐） */
    const ensureModel = (tab: EditorTab) => {
        const m = monaco.value;
        if (!m || tab.model) return;
        // db:// 等虚拟路径不能走 Uri.file（会拆坏 scheme），用 inmemory 模型
        const uri = tab.path.startsWith("db://")
            ? m.Uri.parse(`inmemory://db/${tab.path.slice("db://".length)}`)
            : m.Uri.file(tab.path);
        const model =
            m.editor.getModel(uri) ||
            m.editor.createModel(tab.initialContent, tab.language, uri);
        // model 必须保持裸对象：tabs 是深层响应式，monaco 内部带惰性缓存，
        // 被 reactive proxy 包住后文本读写会挂死主线程
        tab.model = markRaw(model);
        applyContentToModel(tab);
        tab.model.onDidChangeContent(() => {
            if (!applyingContent) markDirty(tab);
        });
        markDirty(tab);
    };

    /** 激活时按需加载 lazy 标签内容（会话恢复：先出壳，再点再读） */
    const ensureTabLoaded = (tab: EditorTab) => {
        if (!tab.lazy) return;
        tab.lazy = false;

        if (tab.kind === "table") {
            tab.isLoading = true;
            void (async () => {
                try {
                    const tableName =
                        tab.tableName || tab.name.replace(/^表\s*·\s*/, "");
                    const { databaseApi } = await import("@/utils/api-next");
                    const res = await databaseApi.getTableColumns(tableName);
                    tab.missing = !res?.success || !res.data?.length;
                } catch {
                    tab.missing = true;
                } finally {
                    tab.isLoading = false;
                }
            })();
            return;
        }

        if (tab.kind === "sql") {
            tab.isLoading = true;
            void (async () => {
                try {
                    const { useDatabaseStore } = await import("@/store/database");
                    const file = useDatabaseStore().getSqlFile(tab.name);
                    if (file) {
                        tab.initialContent = file.content;
                        tab.missing = false;
                    } else {
                        tab.initialContent = "";
                        tab.missing = true;
                    }
                } finally {
                    tab.isLoading = false;
                    ensureModel(tab);
                    applyContentToModel(tab);
                    if (activeTabId.value === tab.id) activate(tab.id);
                }
            })();
            return;
        }

        tab.isLoading = true;
        void loadByKind(tab);
    };

    const activate = (tabId: string, group?: EditorGroupId) => {
        const next = tabs.value.find((t) => t.id === tabId);
        if (!next) return;
        // 会话恢复：首次激活再拉内容（文本/表/SQL）
        ensureTabLoaded(next);
        const targetGroup = group || next.group || "g0";
        next.group = targetGroup;
        activeGroupId.value = targetGroup;
        activeTabId.value = next.id;

        const currentEditor = groupEditors.get(targetGroup) || null;
        const prev = activeTabInGroup(targetGroup);
        if (prev && prev.id !== next.id && currentEditor) {
            prev.viewState = currentEditor.saveViewState();
        }
        groupActiveTabIds[targetGroup] = next.id;
        pushGroupHistory(targetGroup, next.id);

        if (!currentEditor) return;

        // 图片/hex/压缩包/表 等非文本视图：卸掉 model
        if (next.viewMode !== "text") {
            if (currentEditor.getModel()) currentEditor.setModel(null);
            currentEditor.updateOptions({ readOnly: true });
            return;
        }

        ensureModel(next);
        if (!next.model) return;
        if (currentEditor.getModel() !== next.model) currentEditor.setModel(next.model);
        // 文本文件与 SQL 虚拟标签都可编辑
        currentEditor.updateOptions({
            readOnly: next.kind !== "text" && next.kind !== "sql",
        });
        if (next.viewState) currentEditor.restoreViewState(next.viewState);
        scheduleDiffDecorations(next);
        currentEditor.focus();
        refreshStatus();
    };

    /** 读取文件内容进标签并对齐 model（新建/预览复用两条路径共用） */
    const loadContent = async (tab: EditorTab) => {
        try {
            const res = await fileApi.readFile(tab.path, { skipInterceptor: true });
            if (res?.success && res.data) {
                tab.missing = false;
                tab.initialContent = res.data.content || "";
                const enc = (res.data.encoding || "utf-8").toLowerCase();
                tab.encoding = enc === "gbk" ? "gbk" : "utf-8";
            } else {
                // 源文件不在：VSCode 式保留标签，标记 missing
                tab.missing = true;
                tab.initialContent = "";
            }
        } catch {
            tab.missing = true;
            tab.initialContent = "";
        } finally {
            tab.isLoading = false;
            // activate 可能已在内容读取前建好空 model，这里统一对齐内容
            ensureModel(tab);
            applyContentToModel(tab);
            if (activeTabId.value === tab.id) activate(tab.id);
        }
    };

    /** 读取原始字节（图片/hex/二进制 utf-8 视图共用），文本文件切 hex 时懒加载 */
    const loadBytes = async (tab: EditorTab) => {
        if (tab.bytesB64 || tab.bytesLoading) return;
        tab.bytesLoading = true;
        try {
            const res = await fileApi.readFile(tab.path, {
                skipInterceptor: true,
                as_bytes: true,
            });
            if (res?.success && res.data?.encoding === "base64") {
                tab.bytesB64 = res.data.content || "";
                tab.imageUrl =
                    tab.bytesB64 && tab.kind === "image"
                        ? `data:${imageMime(tab.name)};base64,${tab.bytesB64}`
                        : undefined;
                // 仅非图片二进制才预填 UTF-8 文本（图片有专用视图；
                // 二进制的「文本视图」可在 setViewMode 时再灌入 model）
                if (tab.kind === "binary") {
                    tab.initialContent = b64ToUtf8(tab.bytesB64);
                }
            } else {
                ZXNotification({
                    title: "读取失败",
                    message: res?.message || "文件读取失败了 (´；ω；`)",
                    type: "😭",
                    position: "top-right",
                });
            }
        } catch {
            ZXNotification({
                title: "读取失败",
                message: "文件读取失败了 (´；ω；`)",
                type: "😭",
                position: "top-right",
            });
        } finally {
            tab.bytesLoading = false;
            tab.isLoading = false;
            // 图片/hex/archive 不创建 Monaco model，避免乱码字符警告
            if (tab.viewMode === "text") {
                ensureModel(tab);
                applyContentToModel(tab);
                if (activeTabId.value === tab.id) activate(tab.id);
            }
        }
    };

    const classify = (name: string): FileKind => {
        if (isImageFile(name)) return "image";
        if (isArchiveFile(name)) return "archive";
        if (isBinaryFile(name)) return "binary";
        return "text";
    };

    /** 按类型加载标签内容：文本读正文、图片/二进制读字节、压缩包按需由浏览器组件自取 */
    const loadByKind = (tab: EditorTab) => {
        if (tab.kind === "text") return loadContent(tab);
        if (tab.kind === "archive") {
            tab.isLoading = false;
            return Promise.resolve();
        }
        return loadBytes(tab);
    };

    const defaultViewMode = (kind: FileKind): ViewMode => {
        if (kind === "image") return "image";
        if (kind === "binary") return "hex";
        if (kind === "archive") return "archive";
        if (kind === "table") return "table";
        // SQL 走 Monaco 文本编辑器（language=sql），不是自定义面板
        return "text";
    };

    /** 数据库虚拟标签路径 */
    const dbTablePath = (tableName: string) => `db://table/${tableName}`;

    /**
     * 数据库虚拟标签：
     * - table → 表编辑器（自定义 viewMode）
     * - sql   → Monaco sql 编辑器（viewMode=text）
     */
    const openDbTab = (
        path: string,
        name: string,
        kind: "table" | "sql",
        opts?: {
            group?: EditorGroupId;
            tableName?: string;
            content?: string;
            /** 会话恢复：只建标签壳，激活时再加载 */
            lazy?: boolean;
            /** 是否立即激活（恢复时 false，避免标签逐个跳） */
            activate?: boolean;
        },
    ) => {
        const targetGroup = opts?.group || activeGroupId.value || "g0";
        const existing = tabs.value.find((t) => t.path === path);
        if (existing) {
            existing.isPreview = false;
            if (opts?.activate !== false) {
                activate(existing.id, existing.group || "g0");
            }
            return existing;
        }

        const tab = reactive({
            id: path,
            path,
            // 标签名：表用表名，SQL 用文件名（前缀由标签栏图标/徽标承担）
            name,
            encoding: "utf-8" as const,
            initialContent: opts?.content ?? "",
            isDirty: false,
            isLoading: !!opts?.lazy && !opts?.content,
            lazy: !!opts?.lazy,
            language: kind === "sql" ? "sql" : "plaintext",
            eol: "lf" as const,
            isPreview: false,
            kind,
            viewMode: defaultViewMode(kind),
            bytesB64: null,
            bytesLoading: false,
            model: null,
            viewState: null,
            group: targetGroup,
            tableName: opts?.tableName,
        }) as EditorTab;
        tabs.value.push(tab);
        if (opts?.activate !== false) activate(tab.id, targetGroup);
        return tab;
    };

    /**
     * 打开表标签：每次都是重新拉表结构/数据（不恢复上次编辑态）。
     * 表不存在/加载失败 → 标签保留并 missing（VSCode 式标红）。
     * lazy=true：只建壳，激活时再校验。
     */
    const openTable = async (
        tableName: string,
        opts?: {
            group?: EditorGroupId;
            lazy?: boolean;
            activate?: boolean;
        },
    ) => {
        const tab = openDbTab(dbTablePath(tableName), tableName, "table", {
            group: opts?.group,
            tableName,
            lazy: opts?.lazy,
            activate: opts?.activate,
        });
        tab.missing = false;
        if (opts?.lazy) {
            tab.lazy = true;
            return tab;
        }
        try {
            const { databaseApi } = await import("@/utils/api-next");
            const res = await databaseApi.getTableColumns(tableName);
            if (!res?.success || !res.data?.length) {
                tab.missing = true;
            }
        } catch {
            tab.missing = true;
        }
        return tab;
    };

    /** 打开（或聚焦）SQL：content 用源端最新；源没了则 missing */
    const openSqlFile = (
        fileName: string,
        content: string,
        opts?: {
            group?: EditorGroupId;
            lazy?: boolean;
            activate?: boolean;
        },
    ) =>
        openDbTab(`db://sql/${fileName}`, fileName, "sql", {
            group: opts?.group,
            content,
            lazy: opts?.lazy && !content,
            activate: opts?.activate,
        });

    const openFile = async (
        rawPath: string,
        rawName?: string,
        opts?: {
            preview?: boolean;
            group?: EditorGroupId;
            lazy?: boolean;
            activate?: boolean;
        },
    ) => {
        const path = normalizePath(rawPath);
        const name = rawName || path.split("/").pop() || path;
        const kind = classify(name);
        const targetGroup = opts?.group || activeGroupId.value || "g0";

        const existing = tabs.value.find((t) => t.path === path);
        if (existing) {
            // 双击（非预览）再次打开 = 固定该预览标签（VSCode pin）
            if (!opts?.preview) existing.isPreview = false;
            if (opts?.activate !== false) {
                activate(existing.id, existing.group || "g0");
            }
            return existing;
        }

        // 预览模式：复用当前组未固定的预览标签，原地换成新文件
        const previewTab = opts?.preview
            ? tabs.value.find(
                  (t) =>
                      (t.group || "g0") === targetGroup &&
                      t.isPreview &&
                      !t.isDirty &&
                      !t.isLoading &&
                      !t.lazy,
              )
            : null;
        if (previewTab) {
            previewTab.model?.dispose();
            previewTab.model = null;
            previewTab.viewState = null;
            previewTab.id = path;
            previewTab.path = path;
            previewTab.name = name;
            previewTab.initialContent = "";
            previewTab.isDirty = false;
            previewTab.isLoading = true;
            previewTab.lazy = false;
            previewTab.language = langByPath(path);
            previewTab.encoding = "utf-8";
            previewTab.eol = "lf";
            previewTab.kind = kind;
            previewTab.viewMode = defaultViewMode(kind);
            previewTab.bytesB64 = null;
            previewTab.imageUrl = undefined;
            previewTab.bytesLoading = false;
            previewTab.group = targetGroup;
            activate(previewTab.id, targetGroup);
            await loadByKind(previewTab);
            return previewTab;
        }

        // 必须用 reactive 创建：push 进深层响应式数组后，后续对 tab 的
        // 修改（isLoading/initialContent 等）都走同一代理才能触发视图更新
        const tab = reactive({
            id: path,
            path,
            name,
            encoding: "utf-8",
            initialContent: "",
            isDirty: false,
            isLoading: !opts?.lazy,
            lazy: !!opts?.lazy,
            language: langByPath(path),
            eol: "lf",
            isPreview: !!opts?.preview,
            kind,
            viewMode: defaultViewMode(kind),
            bytesB64: null,
            bytesLoading: false,
            model: null,
            viewState: null,
            group: targetGroup,
        }) as EditorTab;
        tabs.value.push(tab);
        if (opts?.activate !== false) {
            activate(tab.id, targetGroup);
            if (!opts?.lazy) await loadByKind(tab);
        }
        return tab;
    };

    const removeTab = (tab: EditorTab) => {
        const idx = tabs.value.findIndex((t) => t.id === tab.id);
        if (idx === -1) return;
        const group = tab.group || "g0";
        clearDiffDecorations(tab);
        tabs.value.splice(idx, 1);
        tab.model?.dispose();

        const remaining = tabsInGroup(group);
        const wasActive = groupActiveTabIds[group] === tab.id;
        if (wasActive) {
            const prev = lastActiveInGroup(group, tab.id);
            groupActiveTabIds[group] = prev?.id || "";
        }
        if (remaining.length > 0) {
            const nextActive =
                wasActive
                    ? lastActiveInGroup(group, tab.id)
                    : activeTabInGroup(group);
            if (nextActive) activate(nextActive.id, group);
            return;
        }
        // 组空了：从布局移除；至少保留 g0 空组，否则空态节点不渲染
        const pos = locateGroup(group);
        if (pos) {
            layoutColumns.value[pos.colIndex]!.splice(pos.rowIndex, 1);
            if (layoutColumns.value[pos.colIndex]!.length === 0) {
                layoutColumns.value.splice(pos.colIndex, 1);
                columnWeights.value.splice(pos.colIndex, 1);
            }
            normalizeWeights();
        }
        delete groupWeights[group];
        delete groupActiveTabIds[group];
        // g0 编辑器保留到最后：关光标签后仍要支撑空态与后续 openFile
        if (group !== "g0") {
            const ed = groupEditors.get(group);
            if (ed) {
                ed.dispose();
                groupEditors.delete(group);
            }
        } else {
            groupEditors.get("g0")?.setModel(null);
        }
        if (layoutColumns.value.length === 0) {
            layoutColumns.value = [["g0"]];
            columnWeights.value = [1];
            groupWeights.g0 = 1;
            activeGroupId.value = "g0";
        }
        const fallback = activeTabInGroup(activeGroupId.value) || tabs.value[0] || null;
        if (fallback) {
            activate(fallback.id, fallback.group || "g0");
        } else {
            contentText.value = "";
            activeGroupId.value = layoutColumns.value[0]?.[0] || "g0";
        }
        nextTick(() => layoutAll());
    };

    const closeTab = (tabId: string) => {
        const tab = tabs.value.find((t) => t.id === tabId);
        if (!tab) return;
        if (tab.isDirty) {
            ZXMessageBox({
                title: "未保存的修改",
                message: `"${tab.name}" 有未保存的修改，确定要关闭吗？`,
                cancelButtonText: "继续编辑",
                confirmButtonText: "放弃修改",
                onConfirm: () => removeTab(tab),
            });
            return;
        }
        removeTab(tab);
    };

    /** 关闭全部标签：有未保存时统一确认（菜单"关闭全部标签页"用） */
    // ---- 文件菜单扩展：保存全部 / 重载当前文件 / 关闭其他标签 ----
    const saveAllTabs = async () => {
        const dirty = tabs.value.filter((t) => t.isDirty && t.kind === "text");
        for (const t of dirty) await saveTab(t);
    };

    /** 重载当前文件：丢弃未保存修改，恢复为磁盘内容 */
    const revertActive = async () => {
        const tab = activeTab.value;
        if (!tab || tab.kind !== "text") return;
        await loadContent(tab);
    };

    const closeOtherTabs = () => {
        const keepId = activeTabId.value;
        [...tabs.value].filter((t) => t.id !== keepId).forEach((t) => removeTab(t));
    };

    // ---- 快速打开（Ctrl+P）：递归拉取项目文件清单（跳过依赖目录），缓存供过滤 ----
    const quickOpenFiles = ref<{ path: string; name: string }[]>([]);
    const quickOpenLoading = ref(false);
    const QUICK_OPEN_SKIP =
        /(^|\/)(\.git|node_modules|__pycache__|\.venv|venv|\.idea|\.vscode|site-packages|\.ruff_cache)(\/|$)/;
    const refreshQuickOpen = async () => {
        if (quickOpenLoading.value) return;
        quickOpenLoading.value = true;
        try {
            const out: { path: string; name: string }[] = [];
            const walk = async (dir: string) => {
                const res = await fileApi.getFileList(dir || undefined);
                for (const f of res?.data?.files || []) {
                    if (f.is_file) out.push({ path: f.path, name: f.name });
                    else if (!QUICK_OPEN_SKIP.test(f.path)) await walk(f.path);
                }
            };
            await walk("");
            quickOpenFiles.value = out;
        } finally {
            quickOpenLoading.value = false;
        }
    };

    const closeAllTabs = () => {
        if (tabs.value.length === 0) return;
        const dirty = tabs.value.filter((t) => t.isDirty);
        const doClose = () => {
            [...tabs.value].forEach((t) => removeTab(t));
        };
        if (dirty.length > 0) {
            ZXMessageBox({
                title: "关闭全部标签页",
                message: `有 ${dirty.length} 个未保存的文件（${dirty
                    .map((t) => t.name)
                    .join("、")}），全部关闭将丢失这些修改，确定吗？`,
                cancelButtonText: "取消",
                confirmButtonText: "放弃并全部关闭",
                onConfirm: doClose,
            });
            return;
        }
        doClose();
    };

    const saveTab = async (tab: EditorTab) => {
        // SQL 虚拟文件：写入 database store（侧栏 SQL 目录），不走磁盘 API
        if (tab.kind === "sql") {
            const content = tab.model?.getValue() ?? tab.initialContent ?? "";
            try {
                const { useDatabaseStore } = await import("@/store/database");
                await useDatabaseStore().saveSqlFile(tab.name, content);
                tab.initialContent = content;
                tab.isDirty = false;
                clearDiffDecorations(tab);
                ZXNotification({
                    title: "已保存～",
                    message: `${tab.name} 已写入后端 SQL 列表`,
                    type: "🥳",
                    position: "top-right",
                });
                return true;
            } catch (e: any) {
                ZXNotification({
                    title: "保存失败",
                    message: e?.message || "SQL 文件保存失败",
                    type: "😭",
                    position: "top-right",
                });
                return false;
            }
        }
        if (tab.kind === "table") {
            return false;
        }
        if (tab.kind !== "text") {
            ZXNotification({
                title: "只读视图",
                message: `${tab.name} 是${tab.kind === "image" ? "图片" : "二进制"}文件，不支持保存 (´･_･\`)`,
                type: "🫠",
                position: "top-right",
            });
            return false;
        }
        if (!tab.model) return false;
        // getValue 默认按 model 自身 EOL 输出，状态栏切换的 LF/CRLF 直接生效
        const content = tab.model.getValue();
        try {
            const res = await fileApi.saveFile(tab.path, content, tab.encoding);
            if (res?.success) {
                tab.initialContent = content;
                tab.isDirty = false;
                clearDiffDecorations(tab);
                ZXNotification({
                    title: "保存成功～",
                    message: `${tab.name} 已按 ${
                        tab.encoding === "gbk" ? "GBK" : "UTF-8"
                    } 编码保存！`,
                    type: "🥳",
                    position: "top-right",
                });
                return true;
            }
            ZXNotification({
                title: "保存失败",
                message: res?.message || "文件保存失败了 (´；ω；`)",
                type: "😭",
                position: "top-right",
            });
        } catch {
            ZXNotification({
                title: "保存失败",
                message: "文件保存失败了 (´；ω；`)",
                type: "😭",
                position: "top-right",
            });
        }
        return false;
    };

    const saveActive = async () => {
        const tab = activeTab.value;
        if (!tab || tab.isLoading) return;
        await saveTab(tab);
    };

    // ==================== 状态栏指令 ====================
    const setEncoding = (enc: "utf-8" | "gbk") => {
        if (activeTab.value) activeTab.value.encoding = enc;
    };

    const setEol = (eol: "lf" | "crlf") => {
        const tab = activeTab.value;
        if (!tab?.model || tab.eol === eol) return;
        tab.eol = eol;
        tab.model.setEOL(
            (tab.eol === "crlf" ? EOL_CRLF : EOL_LF) as MonacoNamespace.editor.EndOfLineSequence,
        );
        markDirty(tab);
    };

    const toggleEol = () => {
        const tab = activeTab.value;
        if (!tab?.model) return;
        setEol(tab.eol === "lf" ? "crlf" : "lf");
    };

    const setTabSize = (n: number) => {
        const tab = activeTab.value;
        if (!tab?.model) return;
        tabSize.value = n;
        tab.model.updateOptions({ tabSize: n });
    };

    const cycleTabSize = () =>
        setTabSize(tabSize.value === 2 ? 4 : tabSize.value === 4 ? 8 : 2);

    // ---- 查看菜单开关项（状态 + 切换，供菜单勾选展示） ----
    const minimapEnabled = ref(true);
    const toggleMinimap = () => {
        minimapEnabled.value = !minimapEnabled.value;
        const ed = activeEditor();
        ed?.updateOptions({ minimap: { enabled: minimapEnabled.value } });
    };

    const lineNumbersEnabled = ref(true);
    const toggleLineNumbers = () => {
        lineNumbersEnabled.value = !lineNumbersEnabled.value;
        activeEditor()?.updateOptions({
            lineNumbers: lineNumbersEnabled.value ? "on" : "off",
        });
    };

    /**
     * 不可见字符多选：空格 / Tab / 回车。
     * Monaco 无法只显示其中一种空白 → 任一空白开启即 renderWhitespace=all；
     * 行尾 LF 不会画成字符，回车走 renderControlCharacters（文本内的控制符）。
     */
    const showSpaces = ref(localStorage.getItem("zx-ws-space") === "true");
    const showTabs = ref(localStorage.getItem("zx-ws-tab") === "true");
    const renderControlChars = ref(
        localStorage.getItem("zx-wb-control-chars") === "true",
    );
    const renderWhitespaceMode = computed<"none" | "all">(() =>
        showSpaces.value || showTabs.value ? "all" : "none",
    );
    const renderWhitespaceAll = computed(
        () => showSpaces.value || showTabs.value,
    );

    const applyWhitespaceOptions = () => {
        const opts = {
            renderWhitespace: (
                showSpaces.value || showTabs.value ? "all" : "none"
            ) as "all" | "none",
            renderControlCharacters: renderControlChars.value,
        };
        for (const ed of groupEditors.values()) ed.updateOptions(opts);
    };

    const persistWs = () => {
        localStorage.setItem("zx-ws-space", String(showSpaces.value));
        localStorage.setItem("zx-ws-tab", String(showTabs.value));
        localStorage.setItem(
            "zx-wb-control-chars",
            String(renderControlChars.value),
        );
        applyWhitespaceOptions();
    };

    const toggleShowSpaces = () => {
        showSpaces.value = !showSpaces.value;
        persistWs();
    };

    const toggleShowTabs = () => {
        showTabs.value = !showTabs.value;
        persistWs();
    };

    const toggleRenderControlChars = () => {
        renderControlChars.value = !renderControlChars.value;
        persistWs();
    };

    /** 全部显示 / 全部隐藏 */
    const setInvisibleAll = (on: boolean) => {
        showSpaces.value = on;
        showTabs.value = on;
        renderControlChars.value = on;
        persistWs();
    };

    const setRenderWhitespaceMode = (mode: "none" | "all") => {
        setInvisibleAll(mode === "all");
    };

    const toggleRenderWhitespace = () => {
        setInvisibleAll(!(showSpaces.value || showTabs.value));
    };

    /** 缩进模式：2/4 空格、Tab 或自定义空格数（设置菜单用，checked 展示） */
    const indentMode = ref<string>("4");
    const setIndent = (mode: "2" | "4" | "tab" | number) => {
        const m = typeof mode === "number" ? String(mode) : mode;
        indentMode.value = m;
        if (m === "tab") {
            const tab = activeTab.value;
            tab?.model?.updateOptions({ insertSpaces: false, tabSize: 4 });
            return;
        }
        const n = Number(m);
        setTabSize(n);
        const tab = activeTab.value;
        tab?.model?.updateOptions({ insertSpaces: true, tabSize: n });
    };

    const setLanguage = (langId: string) => {
        const tab = activeTab.value;
        const m = monaco.value;
        if (!tab || !m) return;
        tab.language = langId;
        if (tab.model) m.editor.setModelLanguage(tab.model, langId);
    };

    const toggleWordWrap = () => {
        wordWrap.value = !wordWrap.value;
        localStorage.setItem("zx-workbench-wordwrap", String(wordWrap.value));
        activeEditor()?.updateOptions({ wordWrap: wordWrap.value ? "on" : "off" });
    };

    const formatDocument = async () => {
        await activeEditor()?.getAction("editor.action.formatDocument")?.run();
    };

    /** 执行 monaco 内置命令/动作（菜单栏用：撤销/重做/查找/替换/转到行） */
    const runEditorCommand = (id: string) => {
        const ed = activeEditor();
        if (!ed) return;
        ed.focus();
        ed.getAction(id)?.run();
    };

    /** 全选（monaco 无对应 action id，直接 setSelection 全模型范围） */
    const selectAll = () => {
        const ed = activeEditor();
        if (!ed) return;
        const model = ed.getModel();
        if (model) ed.setSelection(model.getFullModelRange());
        ed.focus();
    };

    /** 切换标签视图：文本(UTF-8) / hex / 图片；需要字节的视图懒加载 */
    const setViewMode = async (tab: EditorTab, mode: ViewMode) => {
        if (tab.viewMode === mode) return;
        // 压缩包视图自带数据；其余非文本视图需要原始字节
        const needsBytes =
            mode !== "text" && mode !== "archive" ? true : tab.kind !== "text";
        if (needsBytes && !tab.bytesB64 && !tab.bytesLoading) await loadBytes(tab);

        // 图片切到「文本」视图：用字节 UTF-8 解码结果重建 model（此前故意未建）
        if (mode === "text" && tab.kind !== "text" && tab.bytesB64) {
            tab.model?.dispose();
            tab.model = null;
            tab.viewState = null;
            tab.initialContent = b64ToUtf8(tab.bytesB64);
        }

        tab.viewMode = mode;
        if (tab.id === activeTabId.value) {
            const ed = activeEditor();
            if (ed) {
                if (mode === "text") {
                    ensureModel(tab);
                    if (tab.model) ed.setModel(tab.model);
                } else if (ed.getModel()) {
                    // 离开文本视图时卸掉 model，避免乱码字符告警
                    ed.setModel(null);
                }
                ed.updateOptions({
                    readOnly: tab.kind !== "text" || mode !== "text",
                });
            }
            refreshStatus();
        }
    };

    /**
     * VSCode：把标签移入新组并加入布局。
     * dir: right=同列右侧新列；bottom=同列下方；left=左侧新列；top=上方。
     */
    const placeTabInNewGroup = (
        tab: EditorTab,
        dir: "right" | "left" | "bottom" | "top",
    ) => {
        if (allGroupIds.value.length >= MAX_GROUPS) return false;
        const src = tab.group || "g0";
        const loc = locateGroup(src);
        if (!loc) return false;
        const gid = createGroupId();
        groupWeights[gid] = 1;

        if (dir === "right" || dir === "left") {
            const insertAt = dir === "right" ? loc.colIndex + 1 : loc.colIndex;
            layoutColumns.value.splice(insertAt, 0, [gid]);
            columnWeights.value.splice(insertAt, 0, 1);
        } else {
            const col = layoutColumns.value[loc.colIndex]!;
            const insertAt = dir === "bottom" ? loc.rowIndex + 1 : loc.rowIndex;
            col.splice(insertAt, 0, gid);
        }
        normalizeWeights();
        // 源组若正在显示被拖走的标签，先切回上一个标签并同步其编辑器内容
        const srcWasActive =
            groupActiveTabIds[src] === tab.id ||
            activeTabInGroup(src)?.id === tab.id;
        tab.group = gid;
        if (srcWasActive) {
            const prevTab = lastActiveInGroup(src, tab.id);
            if (prevTab) {
                groupActiveTabIds[src] = prevTab.id;
                activate(prevTab.id, src);
            } else {
                groupActiveTabIds[src] = "";
                groupEditors.get(src)?.setModel(null);
            }
        }
        activate(tab.id, gid);
        nextTick(() => layoutAll());
        return true;
    };

    /** 向右拆分：新列插在当前列右侧 */
    const splitTabToRight = (tabId: string) => {
        const tab = tabs.value.find((t) => t.id === tabId);
        if (!tab) return;
        placeTabInNewGroup(tab, "right");
    };

    /** 向左拆分 */
    const splitTabToLeft = (tabId: string) => {
        const tab = tabs.value.find((t) => t.id === tabId);
        if (!tab) return;
        placeTabInNewGroup(tab, "left");
    };

    /** 向下拆分：同列下方插入 */
    const splitTabToBottom = (tabId: string) => {
        const tab = tabs.value.find((t) => t.id === tabId);
        if (!tab) return;
        placeTabInNewGroup(tab, "bottom");
    };

    /** 向上拆分：同列上方插入 */
    const splitTabToTop = (tabId: string) => {
        const tab = tabs.value.find((t) => t.id === tabId);
        if (!tab) return;
        placeTabInNewGroup(tab, "top");
    };

    /** 跨组移动 / 合并标签页 */
    const moveTabToGroup = (tabId: string, targetGroup: EditorGroupId) => {
        const tab = tabs.value.find((t) => t.id === tabId);
        if (!tab) return;
        const oldGroup = tab.group || "g0";
        if (oldGroup === targetGroup) return;
        if (!locateGroup(targetGroup)) return;

        const wasActiveInOld =
            groupActiveTabIds[oldGroup] === tabId ||
            activeTabInGroup(oldGroup)?.id === tabId;
        tab.group = targetGroup;
        groupActiveTabIds[targetGroup] = tab.id;
        if (wasActiveInOld) {
            const prevTab = lastActiveInGroup(oldGroup, tabId);
            if (prevTab) {
                groupActiveTabIds[oldGroup] = prevTab.id;
                activate(prevTab.id, oldGroup);
            } else {
                groupActiveTabIds[oldGroup] = "";
                groupEditors.get(oldGroup)?.setModel(null);
            }
        }
        activeGroupId.value = targetGroup;
        activate(tab.id, targetGroup);
    };

    /** 标签页排序（组内换位，VSCode 逻辑） */
    const moveTab = (
        fromIndex: number,
        toIndex: number,
        group: EditorGroupId = "g0",
    ) => {
        const groupTabs = tabsInGroup(group);
        if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
        if (fromIndex >= groupTabs.length || toIndex >= groupTabs.length) return;
        const sourceTab = groupTabs[fromIndex];
        const targetTab = groupTabs[toIndex];
        if (!sourceTab || !targetTab) return;

        const globalFrom = tabs.value.indexOf(sourceTab);
        const globalTo = tabs.value.indexOf(targetTab);
        if (globalFrom !== -1 && globalTo !== -1) {
            const [moved] = tabs.value.splice(globalFrom, 1);
            if (moved) {
                tabs.value.splice(globalTo, 0, moved);
            }
        }
    };

    /** 跳转到指定行列并闪烁高亮（搜索结果点击用） */
    const revealLocation = (line: number, column: number, length: number) => {
        const m = monaco.value;
        const ed = activeEditor();
        if (!ed || !m) return;
        const range = new m.Range(line, column, line, column + Math.max(length, 1));
        ed.setSelection(range);
        ed.revealLineInCenter(line);
        ed.focus();
        const deco = ed.createDecorationsCollection([
            { range, options: { className: "wb-match-flash" } },
        ]);
        window.setTimeout(() => deco.clear(), 1400);
    };

    // ==================== 文件树联动（重命名 / 删除后同步标签） ====================
    const handleFileRenamed = (oldPath: string, newPath: string) => {
        const tab = tabs.value.find((t) => t.path === oldPath);
        if (!tab) return;
        // initialContent 仍代表磁盘内容；未保存缓冲单独取出，重建 model 后写回
        const buffer = tab.model?.getValue() ?? tab.initialContent;
        tab.model?.dispose();
        tab.model = null;
        tab.viewState = null;
        tab.path = newPath;
        tab.id = newPath;
        tab.name = newPath.split("/").pop() || tab.name;
        tab.language = langByPath(newPath);
        if (activeTabId.value === oldPath) {
            activeTabId.value = newPath;
            const ed = activeEditor();
            if (ed) {
                ensureModel(tab);
                const model = tab.model as MonacoNamespace.editor.ITextModel | null;
                if (model) {
                    if (buffer !== tab.initialContent) {
                        model.setValue(buffer); // 触发 onDidChangeContent → 恢复 dirty
                    }
                    ed.setModel(model);
                    ed.focus();
                    refreshStatus();
                }
            }
        }
    };

    const handleFileDeleted = (path: string, isFolder: boolean) => {
        const affected = tabs.value.filter((t) =>
            isFolder
                ? t.path === path || t.path.startsWith(`${path}/`)
                : t.path === path,
        );
        // 未修改的标签直接关闭；有未保存缓冲的保留（VSCode 同款，保存时会重建文件）
        affected.forEach((tab) => {
            if (!tab.isDirty) removeTab(tab);
        });
    };

    // ==================== 生命周期 ====================
    const buildEditorOptions = () =>
        ({
            theme: zxThemeName(themeStore.effectiveMode),
            "semanticHighlighting.enabled": true,
            bracketPairColorization: {
                enabled: true,
                independentColorPoolPerBracketType: true,
            },
            guides: {
                bracketPairs: true,
                bracketPairsHorizontal: true,
                highlightActiveBracketPair: true,
                indentation: true,
                highlightActiveIndentation: true,
            },
            automaticLayout: true,
            dragAndDrop: false,
            fontFamily: '"JetBrains Mono", "Cascadia Mono", Consolas, monospace',
            fontSize: 12,
            lineHeight: 22,
            fontLigatures: false,
            minimap: { enabled: true, maxColumn: 80 },
            wordWrap: wordWrap.value ? "on" : "off",
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: "blink",
            cursorSmoothCaretAnimation: "off",
            renderWhitespace: (
                showSpaces.value || showTabs.value ? "all" : "none"
            ) as "all" | "none",
            renderControlCharacters: renderControlChars.value,
            padding: { top: 8, bottom: 8 },
            scrollbar: {
                vertical: "auto",
                horizontal: "auto",
                verticalScrollbarSize: 6,
                horizontalScrollbarSize: 6,
                arrowSize: 0,
                useShadows: false,
            },
            quickSuggestions: { other: true, comments: false, strings: false },
            suggestOnTriggerCharacters: true,
            wordBasedSuggestions: "currentDocument",
            suggestSelection: "first",
        }) as const;

    /** 为指定分组创建 monaco 实例（EditorPane 挂载时调用） */
    const initGroupEditor = (gid: EditorGroupId, host: HTMLElement) => {
        const m = monaco.value;
        if (!m) return;
        const existing = groupEditors.get(gid);
        if (existing) existing.dispose();
        const ed = m.editor.create(host, buildEditorOptions());
        ed.onDidChangeCursorPosition((e) => {
            if (activeGroupId.value === gid) {
                cursorLine.value = e.position.lineNumber;
                cursorCol.value = e.position.column;
            }
        });
        ed.onDidFocusEditorText(() => {
            activeGroupId.value = gid;
            refreshStatus();
        });
        groupEditors.set(gid, ed);
        const tab = activeTabInGroup(gid);
        if (tab && tab.viewMode === "text") {
            ensureModel(tab);
            if (tab.model) ed.setModel(tab.model);
        }
        nextTick(() => ed.layout());
    };

    const disposeGroupEditor = (gid: EditorGroupId) => {
        const ed = groupEditors.get(gid);
        if (ed) {
            ed.dispose();
            groupEditors.delete(gid);
        }
    };

    const init = async (host: HTMLElement) => {
        fileApi
            .getFileList()
            .then((res) => {
                if (res?.success && res.data)
                    rootPath.value = normalizePath(res.data.current_path || "");
            })
            .catch(() => {});
        try {
            const m = await loadMonaco();
            if (!host.isConnected) return;
            monaco.value = m;
            defineZxThemes(m);
            registerPythonCompletion(m);
            isMonacoReady.value = true;
            initGroupEditor("g0", host);
            // 恢复上次关闭时的标签会话（标签壳一次建齐）
            await restoreSession(sessionPreferPath.value);
            // 恢复后可能有多组，补齐各组 monaco host 由 EditorPane 挂载；
            // 激活组若已有 host 会在此路径创建，这里同步一次当前激活
            const act = activeTab.value;
            if (act) activate(act.id, act.group || activeGroupId.value);
            const g0Tab = activeTabInGroup("g0");
            if (!act && g0Tab) activate(g0Tab.id, "g0");
            // 会话与 monaco 就绪后再让宿主展示完整编辑器窗口
            isReady.value = true;
        } catch (e) {
            console.warn("工作台 monaco 初始化失败", e);
            // 失败也要放开窗口，避免一直停在加载态
            isReady.value = true;
            ZXNotification({
                title: "编辑器加载失败",
                message: "monaco 加载失败了，请检查网络后重新打开 (´；ω；`)",
                type: "😭",
                position: "top-right",
            });
        }
    };

    const layoutAll = () => {
        for (const ed of groupEditors.values()) ed.layout();
    };

    /** 构建完整会话快照（内存 + IDB 共用） */
    const buildSession = (): WorkbenchSession | null => {
        if (!tabs.value.length) return null;
        return {
            tabs: tabs.value.map((t) => ({
                path: t.path,
                name: t.name,
                group: t.group || "g0",
                viewMode: t.viewMode,
                kind: t.kind,
                language: t.language,
                tableName: t.tableName,
            })),
            layoutColumns: layoutColumns.value.map((col) => [...col]),
            columnWeights: [...columnWeights.value],
            groupWeights: { ...groupWeights },
            activeTabId: activeTabId.value,
            activeGroupId: activeGroupId.value,
            groupSeq,
        };
    };

    /** 写入 IDB（刷新后仍可还原）；失败不影响内存会话 */
    const persistSession = async () => {
        const snap = buildSession();
        savedSession = snap;
        await idbSet(SESSION_IDB_KEY, snap);
    };

    let persistTimer: ReturnType<typeof setTimeout> | null = null;
    const schedulePersist = () => {
        if (persistTimer) clearTimeout(persistTimer);
        persistTimer = setTimeout(() => {
            void persistSession();
        }, 400);
    };

    const dispose = () => {
        // 关闭窗口时保留会话（内存 + IDB）
        const snap = buildSession();
        savedSession = snap;
        if (snap) void idbSet(SESSION_IDB_KEY, snap);
        else void idbSet(SESSION_IDB_KEY, null);
        tabs.value.forEach((t) => t.model?.dispose());
        tabs.value = [];
        for (const ed of groupEditors.values()) ed.dispose();
        groupEditors.clear();
        layoutColumns.value = [["g0"]];
        columnWeights.value = [1];
        groupWeights.g0 = 1;
        groupActiveTabIds.g0 = "";
        activeGroupId.value = "g0";
        monaco.value = null;
        isMonacoReady.value = false;
    };

    /** 重开时按会话恢复标签与分栏（内存优先，否则 IDB；数据库标签一并还原） */
    const restoreSession = async (preferPath?: string) => {
        const prefer = preferPath || sessionPreferPath.value;
        const norm = (p: string) =>
            String(p || "")
                .replace(/\\/g, "/")
                .replace(/\/{2,}/g, "/");
        const preferNorm = norm(prefer);

        const activatePreferOrSession = async (
            fallbackId?: string,
            fallbackGroup?: string,
        ) => {
            const preferTab = preferNorm
                ? tabs.value.find(
                      (x) =>
                          norm(x.path) === preferNorm ||
                          x.id === prefer ||
                          norm(x.id) === preferNorm,
                  )
                : null;
            if (preferTab) {
                activate(preferTab.id, preferTab.group || "g0");
                return;
            }
            // 用户点开的文件还不在标签里 → 打开并激活（避免只会挂在末尾）
            if (preferNorm) {
                const name = preferNorm.split("/").pop() || preferNorm;
                await openFile(prefer, name);
                return;
            }
            const act = fallbackId
                ? tabs.value.find((x) => x.id === fallbackId)
                : null;
            if (act) {
                activate(act.id, act.group || fallbackGroup || "g0");
                return;
            }
            const last = tabs.value[tabs.value.length - 1];
            if (last) activate(last.id, last.group || "g0");
        };

        let session: WorkbenchSession | null = savedSession;
        savedSession = null;
        if (!session?.tabs?.length) {
            session = (await idbGet<WorkbenchSession>(SESSION_IDB_KEY)) || null;
        }

        if (!session?.tabs?.length) {
            await activatePreferOrSession();
            return;
        }

        if (session.layoutColumns?.length) {
            layoutColumns.value = session.layoutColumns.map((col) => [...col]);
            columnWeights.value = [...session.columnWeights];
            for (const [k, v] of Object.entries(session.groupWeights || {})) {
                groupWeights[k] = v;
            }
        }
        groupSeq = Math.max(groupSeq, session.groupSeq || 1);

        // SQL 标签依赖后端/本地列表，先拉一次
        try {
            const { useDatabaseStore } = await import("@/store/database");
            await useDatabaseStore().loadSqlFiles();
        } catch {
            /* 无后端时忽略 */
        }

        // 先同步建出全部标签壳（标签栏一次展示完），内容留给激活时懒加载
        for (const t of session.tabs) {
            const gid = (t.group || "g0") as EditorGroupId;
            try {
                if (t.path.startsWith("db://table/")) {
                    const tableName =
                        t.tableName || t.name.replace(/^表\s*·\s*/, "");
                    if (tableName) {
                        await openTable(tableName, {
                            group: gid,
                            lazy: true,
                            activate: false,
                        });
                    }
                    continue;
                }
                if (t.path.startsWith("db://sql/")) {
                    const { useDatabaseStore } = await import("@/store/database");
                    const store = useDatabaseStore();
                    const file = store.getSqlFile(t.name);
                    const tab = openSqlFile(t.name, file?.content ?? "", {
                        group: gid,
                        lazy: !file,
                        activate: false,
                    });
                    if (!file) tab.missing = true;
                    continue;
                }
                await openFile(t.path, t.name, {
                    group: gid,
                    lazy: true,
                    activate: false,
                });
            } catch {
                // 单标签失败不阻断其余恢复
            }
        }

        // 优先用户本次打开的文件；否则上次会话活动标签
        await activatePreferOrSession(session.activeTabId, session.activeGroupId);
    };

    // 标签/布局变化时落盘，刷新或崩溃后仍可还原
    watch(
        [tabs, layoutColumns, columnWeights, activeTabId, activeGroupId],
        () => {
            schedulePersist();
        },
        { deep: true },
    );

    // 深浅主题跟随（useWorkbench 在 setup 内同步调用，watch 自动随组件销毁）
    watch(
        () => themeStore.effectiveMode,
        (mode) => {
            if (!monaco.value) return;
            defineZxThemes(monaco.value);
            monaco.value.editor.setTheme(zxThemeName(mode));
        },
    );

    return {
        // 状态
        monaco,
        isMonacoReady,
        isReady,
        tabs,
        activeTabId,
        activeTab,
        dirtyTabs,
        cursorLine,
        cursorCol,
        contentText,
        wordWrap,
        tabSize,
        rootPath,
        minimapEnabled,
        lineNumbersEnabled,
        renderWhitespaceAll,
        renderWhitespaceMode,
        showSpaces,
        showTabs,
        renderControlChars,
        setRenderWhitespaceMode,
        toggleShowSpaces,
        toggleShowTabs,
        toggleRenderControlChars,
        setInvisibleAll,
        indentMode,
        quickOpenFiles,
        quickOpenLoading,
        // 编辑器组布局（VSCode 式：列内上下、列间左右）
        activeGroupId,
        layoutColumns,
        columnWeights,
        groupWeights,
        tabsInGroup,
        activeTabInGroup,
        splitRatio,
        splitDirection,
        setSplitDirection,
        toggleSplitDirection,
        isSplit,
        hasSecondRow,
        // 标签操作
        activate,
        openFile,
        openTable,
        openSqlFile,
        showBottomSql,
        openBottomSql,
        closeBottomSql,
        toggleBottomSql,
        tableFocusColumn,
        setTableFocusColumn,
        clearTableFocusColumn,
        closeTab,
        closeAllTabs,
        saveActive,
        saveTab,
        setViewMode,
        moveTab,
        splitTabToRight,
        splitTabToLeft,
        splitTabToBottom,
        splitTabToTop,
        moveTabToGroup,
        // 状态栏指令
        setEncoding,
        setEol,
        toggleEol,
        setTabSize,
        cycleTabSize,
        setIndent,
        toggleMinimap,
        toggleLineNumbers,
        toggleRenderWhitespace,
        setLanguage,
        toggleWordWrap,
        formatDocument,
        runEditorCommand,
        revealLocation,
        // 文件菜单扩展
        saveAllTabs,
        revertActive,
        closeOtherTabs,
        refreshQuickOpen,
        selectAll,
        // 文件树联动
        handleFileRenamed,
        handleFileDeleted,
        // 生命周期
        init,
        initGroupEditor,
        disposeGroupEditor,
        layoutAll,
        dispose,
        restoreSession,
        setSessionPreferPath,
    };
};

export type Workbench = ReturnType<typeof useWorkbench>;
