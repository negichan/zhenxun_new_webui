<script setup lang="ts">
/**
 * SQL 控制台内容体（挂在右侧栏内）
 * 编辑区与 SQL 编辑器一致：Monaco + language=sql + 表/列/关键字补全
 * 不创建后端 SQL 文件、不占用底部面板；宽度由 EditorRightPanel 管理
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Play } from "lucide-vue-next";
import type * as MonacoNamespace from "monaco-editor/editor/editor.api";
import { loadMonaco } from "@/components/ZXTextEditor/monacoLoader";
import {
    defineZxThemes,
    zxThemeName,
} from "@/components/ZXTextEditor/monacoTheme";
import { useThemeStore } from "@/store/theme";
import { databaseApi } from "@/utils/api-next";
import { useDatabaseStore } from "@/store/database";

const props = withDefaults(
    defineProps<{
        /** 当前表名：用于预填 SELECT */
        tableName?: string;
        /** 嵌入右侧栏：外层管宽高与关闭 */
        embedded?: boolean;
    }>(),
    { embedded: false },
);

const emit = defineEmits<{ close: []; resized: [] }>();

const themeStore = useThemeStore();
const dbStore = useDatabaseStore();

let monaco: typeof MonacoNamespace | null = null;
let editor: MonacoNamespace.editor.IStandaloneCodeEditor | null = null;
let applying = false;

const sql = ref("");
const running = ref(false);
const message = ref("");
const resultCols = ref<string[]>([]);
const resultRows = ref<Record<string, any>[]>([]);
const editorHost = ref<HTMLElement | null>(null);

const SQL_KEYWORDS = [
    "SELECT", "FROM", "WHERE", "GROUP BY", "ORDER BY", "HAVING", "LIMIT",
    "OFFSET", "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE",
    "CREATE", "TABLE", "ALTER", "DROP", "JOIN", "LEFT", "RIGHT", "INNER",
    "OUTER", "ON", "AS", "AND", "OR", "NOT", "NULL", "IS", "IN", "LIKE",
    "BETWEEN", "DISTINCT", "COUNT", "SUM", "AVG", "MIN", "MAX", "ASC",
    "DESC", "NULLS FIRST", "NULLS LAST", "CAST", "COALESCE", "CASE",
    "WHEN", "THEN", "ELSE", "END", "WITH", "UNION", "ALL",
] as const;

/** 表/列补全缓存 */
let tableCache: string[] | null = null;
const colCache: Record<string, string[]> = {};

const fetchTables = async () => {
    if (tableCache) return tableCache;
    try {
        const res = await databaseApi.getTableList();
        tableCache = res?.data || [];
    } catch {
        tableCache = [];
    }
    return tableCache;
};

const fetchCols = async (table: string) => {
    const key = table.replace(/"/g, "");
    if (colCache[key]) return colCache[key];
    try {
        const res = await databaseApi.getTableColumns(key);
        colCache[key] = (res?.data || []).map((c) => c.name);
    } catch {
        colCache[key] = [];
    }
    return colCache[key];
};

let sqlCompletionRegistered = false;

const registerSqlCompletion = (m: typeof MonacoNamespace) => {
    if (sqlCompletionRegistered) return;
    sqlCompletionRegistered = true;
    const Kind = m.languages.CompletionItemKind;
    const keywordKind = Kind.Keyword;
    const tableKind = Kind.Struct;
    const fieldKind = Kind.Field;

    m.languages.registerCompletionItemProvider("sql", {
        triggerCharacters: [".", " ", '"'],
        async provideCompletionItems(model, position) {
            const word = model.getWordUntilPosition(position);
            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn,
            };
            const suggestions: MonacoNamespace.languages.CompletionItem[] = [];

            const linePrefix = model.getValueInRange({
                startLineNumber: position.lineNumber,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
            });

            // 「表名.」或 FROM/JOIN 后：优先列名
            const tableDot = linePrefix.match(
                /(?:from|join|update|into)\s+"?([\w]+)"?\s*\.\s*\w*$/i,
            );
            const afterFrom = linePrefix.match(
                /(?:from|join|update|into)\s+"?([\w]*)"?$/i,
            );

            if (tableDot?.[1]) {
                const cols = await fetchCols(tableDot[1]);
                for (const c of cols) {
                    suggestions.push({
                        label: c,
                        kind: fieldKind,
                        detail: `列 · ${tableDot[1]}`,
                        range,
                        insertText: c,
                    });
                }
                return { suggestions };
            }

            const tables = await fetchTables();
            const tablesLower = new Set(tables.map((t) => t.toLowerCase()));

            // FROM/JOIN 后补表名
            if (afterFrom && afterFrom[1] !== "") {
                const prefix = afterFrom[1].toLowerCase();
                for (const t of tables) {
                    if (t.toLowerCase().startsWith(prefix)) {
                        suggestions.push({
                            label: t,
                            kind: tableKind,
                            detail: "表",
                            range,
                            insertText: t,
                        });
                    }
                }
            }

            // 当前语句里的表 → 列
            const sqlText = model.getValue();
            const mentioned = new Set<string>();
            for (const mt of sqlText.matchAll(
                /(?:from|join|update|into)\s+"?([\w]+)"?/gi,
            )) {
                if (mt[1] && tablesLower.has(mt[1].toLowerCase())) {
                    mentioned.add(mt[1]);
                }
            }
            if (props.tableName) mentioned.add(props.tableName);
            for (const t of mentioned) {
                const cols = await fetchCols(t);
                for (const c of cols) {
                    suggestions.push({
                        label: c,
                        kind: fieldKind,
                        detail: `列 · ${t}`,
                        range,
                        insertText: c,
                    });
                }
            }

            // 表名
            for (const t of tables) {
                suggestions.push({
                    label: t,
                    kind: tableKind,
                    detail: "表",
                    range,
                    insertText: t,
                });
            }

            // 关键字
            for (const k of SQL_KEYWORDS) {
                suggestions.push({
                    label: k,
                    kind: keywordKind,
                    detail: "关键字",
                    range,
                    insertText: k,
                });
            }

            return { suggestions };
        },
    });
};

const defaultSql = computed(() => {
    const t = props.tableName?.trim();
    return t
        ? `SELECT * FROM ${t} LIMIT 100`
        : "-- 在此编写 SQL，Ctrl+Enter 运行（支持补全）";
});

watch(
    () => props.tableName,
    () => {
        if (!sql.value.trim()) sql.value = defaultSql.value;
        if (editor && editor.getValue() !== sql.value) {
            applying = true;
            editor.setValue(sql.value);
            applying = false;
        }
    },
    { immediate: true },
);

watch(sql, (v) => {
    if (!editor || applying) return;
    if (editor.getValue() !== v) {
        applying = true;
        editor.setValue(v);
        applying = false;
    }
});

watch(
    () => themeStore.effectiveMode,
    (mode) => {
        if (!monaco || !editor) return;
        defineZxThemes(monaco);
        monaco.editor.setTheme(zxThemeName(mode));
    },
);

const run = async () => {
    const q = (editor?.getValue() ?? sql.value).trim();
    sql.value = q;
    if (!q) return;
    running.value = true;
    message.value = "";
    try {
        const res = await databaseApi.executeSql({ sql: q });
        const payload = res?.data;
        if (!res?.success) {
            resultCols.value = [];
            resultRows.value = [];
            message.value = res?.message || payload?.message || "执行失败";
            return;
        }
        const list = (payload?.data || []) as Record<string, any>[];
        resultRows.value = list;
        resultCols.value = list.length ? Object.keys(list[0]) : [];
        message.value = payload?.message || `Success. ${list.length} rows`;
        void dbStore.runSql(q);
    } catch (e: any) {
        resultCols.value = [];
        resultRows.value = [];
        message.value =
            e?.response?.data?.message || e?.message || "执行失败";
    } finally {
        running.value = false;
    }
};

onMounted(async () => {
    try {
        monaco = await loadMonaco();
        if (!editorHost.value || !monaco) return;
        defineZxThemes(monaco);
        registerSqlCompletion(monaco);
        editor = monaco.editor.create(editorHost.value, {
            value: sql.value,
            language: "sql",
            theme: zxThemeName(themeStore.effectiveMode),
            automaticLayout: true,
            fontFamily:
                '"JetBrains Mono", "Cascadia Mono", Consolas, monospace',
            fontSize: 12,
            lineHeight: 20,
            minimap: { enabled: false },
            wordWrap: "on",
            scrollBeyondLastLine: false,
            tabSize: 2,
            renderLineHighlight: "none",
            smoothScrolling: true,
            padding: { top: 6, bottom: 6 },
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
            // 仅 SQL 关键字/表/列，不掺文档词联想
            suggestOnTriggerCharacters: true,
            quickSuggestions: {
                other: true,
                comments: false,
                strings: false,
            },
            wordBasedSuggestions: "off",
            suggest: {
                showKeywords: true,
                showFunctions: false,
                showSnippets: false,
                showWords: false,
            },
        });
        editor.onDidChangeModelContent(() => {
            if (!applying && editor) sql.value = editor.getValue();
        });
        monaco.KeyMod.CtrlCmd;
        editor.addCommand(
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
            () => {
                void run();
            },
        );
        editor.focus();
    } catch (e) {
        console.warn("SQL 控制台 Monaco 初始化失败", e);
    }
});

onBeforeUnmount(() => {
    editor?.dispose();
    editor = null;
});

const formatCell = (v: unknown) => {
    if (v === null || v === undefined) return "NULL";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
};
</script>

<template>
    <div
        class="flex h-full min-h-0 w-full flex-col overflow-hidden bg-white"
        :class="embedded ? '' : 'border-l border-slate-200'"
    >
        <div
            v-if="!embedded"
            class="flex h-8 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50/80 px-3"
        >
            <span
                class="text-[11px] font-semibold tracking-wide text-zx-text-muted"
            >
                SQL 控制台
            </span>
            <button
                type="button"
                class="btn-touch flex h-6 w-6 cursor-pointer items-center justify-center rounded text-zx-text-subtle hover:bg-slate-200/80 hover:text-zx-text"
                title="关闭"
                @click="emit('close')"
            >
                <svg
                    viewBox="0 0 24 24"
                    class="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                >
                    <path d="M18 6L6 18M6 6l12 12" />
                </svg>
            </button>
        </div>

        <!-- Monaco 编辑区（与 SQL 编辑器同引擎，支持补全） -->
        <div
            class="flex min-h-[200px] flex-1 flex-col"
            :class="resultRows.length ? 'border-b border-slate-200' : ''"
        >
            <div ref="editorHost" class="min-h-0 flex-1" />
            <div
                class="flex flex-shrink-0 items-center gap-2 border-t border-slate-100 px-2 py-1.5"
            >
                <span
                    v-if="message"
                    class="min-w-0 flex-1 truncate text-[11px] select-text"
                    :class="
                        resultRows.length || message.startsWith('Success')
                            ? 'text-zx-text-muted'
                            : 'text-zx-danger'
                    "
                >
                    {{ message }}
                </span>
                <span v-else class="min-w-0 flex-1"></span>
                <button
                    type="button"
                    class="btn-touch flex h-7 items-center gap-1 rounded-md bg-zx-primary px-3 text-xs font-medium text-[color:var(--zx-color-on-primary)] transition-colors hover:bg-zx-primary-hover disabled:opacity-40"
                    :disabled="running || !sql.trim()"
                    @click="run"
                >
                    <Play class="h-3.5 w-3.5" />
                    <span>{{ running ? "执行中…" : "运行" }}</span>
                </button>
            </div>
        </div>

        <!-- 结果：仅有数据行时显示；空态不占位 -->
        <div
            v-if="resultRows.length"
            class="min-h-0 flex-1 overflow-auto select-text"
        >
            <table class="w-max min-w-full border-collapse text-xs">
                <thead class="sticky top-0 z-10 bg-slate-50/95">
                    <tr>
                        <th
                            v-for="c in resultCols"
                            :key="c"
                            class="border-b border-r border-slate-200 px-2 py-1 text-left font-semibold whitespace-nowrap text-zx-text"
                        >
                            {{ c }}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="(r, i) in resultRows"
                        :key="i"
                        class="hover:bg-slate-50"
                    >
                        <td
                            v-for="c in resultCols"
                            :key="c"
                            class="border-b border-r border-slate-100 px-2 py-0.5 font-mono whitespace-nowrap text-zx-text-muted"
                        >
                            {{ formatCell(r[c]) }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>
