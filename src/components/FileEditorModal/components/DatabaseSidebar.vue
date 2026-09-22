<script setup lang="ts">
/**
 * 数据库侧栏
 * - 标题：数据库 + [SQL 控制台 / 刷新]
 * - 树：表格（可展开 列/键/索引，DataGrip 风格） / SQL
 * - 表名点击打开表编辑器；左侧 chevron 展开结构
 * - SQL：+ 只新建不打开；右键 重命名 / 下载 / 删除
 */
import { computed, nextTick, onMounted, ref } from "vue";
import {
    ChevronDown,
    ChevronRight,
    Clock,
    Columns3,
    Download,
    Hash,
    KeyRound,
    Loader2,
    Pencil,
    Plus,
    RefreshCw,
    SquareTerminal,
    Trash2,
} from "lucide-vue-next";
import { storeToRefs } from "pinia";
import { databaseApi } from "@/utils/api-next";
import { useDatabaseStore } from "@/store/database";
import { ZXContextMenu, menuSep } from "@/components/zxcomponent/ContextMenu";
import { ZXMessageBox, ZXNotification } from "@/services/ui";
import FolderIcon from "@/components/zxcomponent/icons/FolderIcon.vue";
import { SqlIcon, TableIcon as MaterialTableIcon } from "../materialIcons";
import type { Workbench } from "../useWorkbench";
import type { SqlFileItem } from "@/store/database";
import type { TableColumn } from "@/types/api-next.types";

const props = defineProps<{
    wb: Workbench;
}>();

const emit = defineEmits<{ openSqlConsole: [] }>();

const dbStore = useDatabaseStore();
const { sqlFiles } = storeToRefs(dbStore);

type TableKeyItem = { name: string; columns: string[] };
type TableIndexItem = { name: string; columns: string[]; unique?: boolean };
type TableMeta = {
    columns: TableColumn[];
    keys: TableKeyItem[];
    indexes: TableIndexItem[];
    loading: boolean;
    error: string;
};

const tables = ref<string[]>([]);
const loading = ref(false);
const error = ref("");
const showTables = ref(true);
const showSql = ref(true);

/** 已展开的表 */
const expandedTables = ref<Record<string, boolean>>({});
/** 表结构缓存 */
const tableMeta = ref<Record<string, TableMeta>>({});
/** 表内 列/键/索引 文件夹展开态 */
const partOpen = ref<
    Record<string, { columns: boolean; keys: boolean; indexes: boolean }>
>({});

/** 行内重命名 */
const renamingName = ref("");
const renameValue = ref("");
const renameInputEl = ref<HTMLInputElement | null>(null);

const activePath = computed(() => props.wb.activeTab.value?.path ?? "");

const quoteIdent = (name: string) => `"${String(name).replace(/"/g, '""')}"`;

const emptyMeta = (): TableMeta => ({
    columns: [],
    keys: [],
    indexes: [],
    loading: false,
    error: "",
});

/** 侧栏列只显示类型（全大写）；默认值放 title */
const colMetaText = (c: TableColumn) =>
    (c.type || "").trim().toUpperCase() || "?";

/** 侧栏列图标：主键钥匙 + JetBrains 类型徽标（123/AZ/01/{}） */
type ColBadgeKind = "key" | "number" | "datetime" | "boolean" | "json" | "text";

const colBadgeKind = (col: TableColumn): ColBadgeKind => {
    if (col.primary_key) return "key";
    const t = (col.type || "").toLowerCase();
    if (/\bbool/.test(t)) return "boolean";
    if (
        /int|float|double|numeric|decimal|real|serial|bigint|smallint|money/.test(
            t,
        )
    ) {
        return "number";
    }
    if (/date|time|timestamp/.test(t)) return "datetime";
    if (/json/.test(t)) return "json";
    return "text";
};

const keysFromColumns = (columns: TableColumn[]): TableKeyItem[] => {
    const pk = columns.filter((c) => c.primary_key).map((c) => c.name);
    if (!pk.length) return [];
    return [{ name: "key #1", columns: pk }];
};

/** SQLite：PRAGMA index_list / index_info；失败再试 MySQL SHOW INDEX */
const fetchIndexes = async (
    table: string,
): Promise<TableIndexItem[]> => {
    const execRows = async (sql: string) => {
        const res = await databaseApi.executeSql({ sql });
        if (!res?.success) return null;
        return (res.data?.data || []) as Record<string, any>[];
    };

    try {
        const list = await execRows(`PRAGMA index_list(${quoteIdent(table)})`);
        if (list) {
            const out: TableIndexItem[] = [];
            for (const row of list) {
                const name = String(row.name ?? "");
                if (!name || name.startsWith("sqlite_autoindex")) continue;
                const info = await execRows(
                    `PRAGMA index_info(${quoteIdent(name)})`,
                );
                const cols = (info || [])
                    .map((c) => c.name)
                    .filter((n): n is string => !!n);
                out.push({
                    name,
                    columns: cols,
                    unique: row.unique === 1 || row.unique === true,
                });
            }
            return out;
        }
    } catch {
        /* fall through */
    }

    try {
        const rows = await execRows(`SHOW INDEX FROM ${quoteIdent(table)}`);
        if (!rows) return [];
        const map = new Map<string, TableIndexItem>();
        for (const row of rows) {
            const name = String(row.Key_name ?? row.key_name ?? "");
            if (!name || name === "PRIMARY") continue;
            const col = String(row.Column_name ?? row.column_name ?? "");
            const seq = Number(row.Seq_in_index ?? row.seq_in_index ?? 0);
            const unique = !(row.Non_unique ?? row.non_unique);
            const item =
                map.get(name) ||
                ({ name, columns: [], unique } as TableIndexItem);
            if (col) item.columns[seq > 0 ? seq - 1 : item.columns.length] = col;
            map.set(name, item);
        }
        return [...map.values()].map((it) => ({
            ...it,
            columns: it.columns.filter(Boolean),
        }));
    } catch {
        return [];
    }
};

const ensurePartOpen = (table: string) => {
    if (!partOpen.value[table]) {
        // 默认不展开列/键/索引，由用户点开
        partOpen.value[table] = {
            columns: false,
            keys: false,
            indexes: false,
        };
    }
};

const loadTableMeta = async (table: string) => {
    const meta = emptyMeta();
    meta.loading = true;
    tableMeta.value = { ...tableMeta.value, [table]: meta };
    try {
        const colRes = await databaseApi.getTableColumns(table);
        const columns = colRes?.success && colRes.data ? colRes.data : [];
        const indexes = await fetchIndexes(table);
        tableMeta.value = {
            ...tableMeta.value,
            [table]: {
                columns,
                keys: keysFromColumns(columns),
                indexes,
                loading: false,
                error: colRes?.success ? "" : colRes?.message || "字段加载失败",
            },
        };
    } catch (e: any) {
        tableMeta.value = {
            ...tableMeta.value,
            [table]: {
                ...emptyMeta(),
                loading: false,
                error: e?.message || "表结构加载失败",
            },
        };
    }
};

const toggleTable = (table: string) => {
    const open = !expandedTables.value[table];
    expandedTables.value = { ...expandedTables.value, [table]: open };
    if (!open) return;
    ensurePartOpen(table);
    if (!tableMeta.value[table] || tableMeta.value[table]?.error) {
        void loadTableMeta(table);
    }
};

const togglePart = (table: string, part: "columns" | "keys" | "indexes") => {
    ensurePartOpen(table);
    const cur = partOpen.value[table]!;
    partOpen.value = {
        ...partOpen.value,
        [table]: { ...cur, [part]: !cur[part] },
    };
};

const isPartOpen = (
    table: string,
    part: "columns" | "keys" | "indexes",
) => !!partOpen.value[table]?.[part];

const metaOf = (table: string): TableMeta =>
    tableMeta.value[table] || emptyMeta();

const load = async () => {
    loading.value = true;
    error.value = "";
    try {
        const res = await databaseApi.getTableList();
        if (res?.success && res.data) {
            tables.value = res.data;
            // 表列表变化后清掉已不存在的结构缓存
            const nextMeta: Record<string, TableMeta> = {};
            const nextOpen: Record<string, boolean> = {};
            for (const t of res.data) {
                if (tableMeta.value[t]) nextMeta[t] = tableMeta.value[t]!;
                if (expandedTables.value[t]) nextOpen[t] = true;
            }
            tableMeta.value = nextMeta;
            expandedTables.value = nextOpen;
        } else error.value = res?.message || "表列表加载失败";
    } catch (e: any) {
        error.value = e?.message || "表列表加载失败";
    } finally {
        loading.value = false;
    }
};

/** 标题终端图标：打开右侧栏 SQL 控制台（不建文件） */
const openSqlConsole = () => {
    emit("openSqlConsole");
};

/** 目录行 +：只写入后端，不自动打开 */
const newSqlFile = async () => {
    try {
        await dbStore.createSqlFile();
        ZXNotification({
            title: "已创建～",
            message: "SQL 文件已写入后端，双击打开",
            type: "success",
            position: "top-right",
        });
    } catch {
        /* ignore */
    }
};

const openTable = (name: string) => {
    props.wb.openTable(name);
};

/** 双击列：打开该表并定位到该列 */
const openTableAtColumn = (table: string, column: string) => {
    props.wb.openTable(table);
    props.wb.setTableFocusColumn(table, column);
};

const openSql = (name: string, content: string) => {
    props.wb.openSqlFile(name, content);
};

const downloadSql = (f: SqlFileItem) => {
    try {
        const blob = new Blob([f.content ?? ""], {
            type: "text/plain;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = f.name.endsWith(".sql") ? f.name : `${f.name}.sql`;
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    } catch {
        ZXNotification({
            title: "下载失败",
            message: f.name,
            type: "error",
            position: "top-right",
        });
    }
};

const startRename = (f: SqlFileItem) => {
    renamingName.value = f.name;
    renameValue.value = f.name;
    nextTick(() => {
        renameInputEl.value?.focus();
        renameInputEl.value?.select();
    });
};

const cancelRename = () => {
    renamingName.value = "";
    renameValue.value = "";
};

const commitRename = async (oldName: string) => {
    const next = renameValue.value.trim();
    if (!next || next === oldName) {
        cancelRename();
        return;
    }
    try {
        await dbStore.renameSqlFile(oldName, next);
        const oldPath = `db://sql/${oldName}`;
        const tab = props.wb.tabs.value.find((t) => t.path === oldPath);
        if (tab) props.wb.closeTab(tab.id);
        ZXNotification({
            title: "已重命名～",
            message: `${oldName} → ${next}`,
            type: "success",
            position: "top-right",
        });
    } catch (e: any) {
        ZXNotification({
            title: "重命名失败",
            message: e?.message || "",
            type: "error",
            position: "top-right",
        });
    } finally {
        cancelRename();
    }
};

const confirmDeleteSql = async (f: SqlFileItem) => {
    const ok = await ZXMessageBox({
        title: "删除确认",
        message: `确定删除 SQL 文件「${f.name}」吗？此操作不可恢复。`,
        confirmButtonText: "删除",
        cancelButtonText: "取消",
        type: "warning",
    });
    if (!ok) return;
    try {
        await dbStore.removeSqlFile(f.name);
        const path = `db://sql/${f.name}`;
        const tab = props.wb.tabs.value.find((t) => t.path === path);
        if (tab) props.wb.closeTab(tab.id);
        ZXNotification({
            title: "已删除～",
            message: f.name,
            type: "success",
            position: "top-right",
        });
    } catch (e: any) {
        ZXNotification({
            title: "删除失败",
            message: e?.message || "",
            type: "error",
            position: "top-right",
        });
    }
};

const showSqlMenu = (e: MouseEvent, f: SqlFileItem) => {
    ZXContextMenu.show({
        x: e.clientX,
        y: e.clientY,
        items: [
            { label: "重命名", icon: Pencil, action: () => startRename(f) },
            { label: "下载", icon: Download, action: () => downloadSql(f) },
            menuSep(),
            {
                label: "删除",
                icon: Trash2,
                danger: true,
                action: () => confirmDeleteSql(f),
            },
        ],
    });
};

onMounted(() => {
    void load();
    void dbStore.loadSqlFiles();
});
defineExpose({
    reload: load,
    newSqlFile,
    openSqlConsole,
});
</script>

<template>
    <div class="flex h-full w-full select-none flex-col overflow-hidden">
        <div
            class="group flex h-8 flex-shrink-0 items-center justify-between px-3 text-[11px] font-semibold tracking-wider text-zx-text-muted uppercase"
        >
            <span>数据库</span>
            <div class="flex items-center gap-0.5">
                <button
                    type="button"
                    class="btn-touch cursor-pointer rounded p-0.5 text-zx-text-subtle transition-colors hover:text-zx-primary"
                    title="SQL 控制台"
                    @click="openSqlConsole"
                >
                    <SquareTerminal class="h-3.5 w-3.5" />
                </button>
                <button
                    type="button"
                    class="btn-touch cursor-pointer rounded p-0.5 text-zx-text-subtle transition-colors hover:text-zx-text"
                    title="刷新表列表"
                    @click="load"
                >
                    <RefreshCw
                        class="h-3 w-3"
                        :class="{ 'animate-spin': loading }"
                    />
                </button>
            </div>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto pb-1.5 text-xs">
            <!-- 表格 -->
            <button
                type="button"
                class="btn-touch flex h-[26px] w-full cursor-pointer items-center gap-1.5 px-2 text-xs font-medium text-zx-text-muted transition-colors hover:bg-slate-200/60"
                @click="showTables = !showTables"
            >
                <ChevronDown
                    v-if="showTables"
                    class="h-3.5 w-3.5 flex-shrink-0 text-zx-text-subtle"
                />
                <ChevronRight
                    v-else
                    class="h-3.5 w-3.5 flex-shrink-0 text-zx-text-subtle"
                />
                <FolderIcon
                    class="h-4 w-4 flex-shrink-0 text-zx-primary"
                    :open="showTables"
                />
                <span>表</span>
                <span class="ml-auto text-[10px] text-zx-text-subtle">{{
                    tables.length
                }}</span>
            </button>

            <div v-show="showTables" class="pl-3">
                <div
                    v-if="loading && !tables.length"
                    class="flex h-[26px] items-center gap-1.5 px-2 text-[11px] text-zx-text-subtle"
                >
                    <Loader2 class="h-3.5 w-3.5 animate-spin" />
                    <span>加载中...</span>
                </div>
                <div
                    v-else-if="error && !tables.length"
                    class="px-2 py-2 text-[11px] text-zx-danger"
                >
                    {{ error }}
                </div>

                <div
                    v-for="table in tables"
                    :key="table"
                    class="rounded-md"
                    :class="
                        activePath === `db://table/${table}`
                            ? 'bg-zx-primary-tint/40'
                            : ''
                    "
                >
                    <!-- 表行：chevron 展开结构 / 名称打开表 -->
                    <div
                        class="flex h-[26px] w-full items-center gap-1 rounded-md px-1 text-xs transition-colors"
                        :class="
                            activePath === `db://table/${table}`
                                ? 'font-medium text-zx-primary'
                                : 'text-zx-text-muted hover:bg-slate-200/60'
                        "
                    >
                        <button
                            type="button"
                            class="btn-touch flex h-5 w-5 flex-shrink-0 cursor-pointer items-center justify-center rounded text-zx-text-subtle hover:text-zx-text"
                            :title="
                                expandedTables[table]
                                    ? '收起表结构'
                                    : '展开列 / 键 / 索引'
                            "
                            @click.stop="toggleTable(table)"
                        >
                            <ChevronDown
                                v-if="expandedTables[table]"
                                class="h-3.5 w-3.5"
                            />
                            <ChevronRight v-else class="h-3.5 w-3.5" />
                        </button>
                        <button
                            type="button"
                            class="btn-touch flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 text-left"
                            @click="openTable(table)"
                            @dblclick="toggleTable(table)"
                        >
                            <MaterialTableIcon
                                class="h-3.5 w-3.5 flex-shrink-0 object-contain"
                            />
                            <span class="truncate">{{ table }}</span>
                        </button>
                    </div>

                    <!-- 表结构：列 / 键 / 索引 -->
                    <div v-if="expandedTables[table]" class="pl-4 pb-0.5">
                        <div
                            v-if="metaOf(table).loading"
                            class="flex h-[24px] items-center gap-1.5 px-2 text-[11px] text-zx-text-subtle"
                        >
                            <Loader2 class="h-3 w-3 animate-spin" />
                            <span>加载结构...</span>
                        </div>
                        <div
                            v-else-if="metaOf(table).error"
                            class="px-2 py-1 text-[11px] text-zx-danger"
                        >
                            {{ metaOf(table).error }}
                        </div>

                        <template v-else>
                            <!-- 列 -->
                            <button
                                type="button"
                                class="btn-touch flex h-[24px] w-full cursor-pointer items-center gap-1.5 rounded-md px-1.5 text-[11px] text-zx-text-muted transition-colors hover:bg-slate-200/60"
                                @click="togglePart(table, 'columns')"
                            >
                                <ChevronDown
                                    v-if="isPartOpen(table, 'columns')"
                                    class="h-3 w-3 flex-shrink-0 text-zx-text-subtle"
                                />
                                <ChevronRight
                                    v-else
                                    class="h-3 w-3 flex-shrink-0 text-zx-text-subtle"
                                />
                                <Columns3
                                    class="h-3.5 w-3.5 flex-shrink-0 text-zx-info"
                                />
                                <span>列</span>
                                <span
                                    class="ml-auto text-[10px] text-zx-text-subtle"
                                    >{{ metaOf(table).columns.length }}</span
                                >
                            </button>
                            <div
                                v-show="isPartOpen(table, 'columns')"
                                class="pl-4"
                            >
                                <div
                                    v-if="!metaOf(table).columns.length"
                                    class="px-2 py-1 text-[11px] text-zx-text-subtle"
                                >
                                    无字段
                                </div>
                                <div
                                    v-for="col in metaOf(table).columns"
                                    :key="col.name"
                                    class="flex h-[22px] cursor-pointer items-center gap-1.5 rounded-md px-1.5 text-[11px] text-zx-text-muted transition-colors hover:bg-slate-200/60"
                                    :title="
                                        col.default != null &&
                                        String(col.default).length
                                            ? `${col.name} · ${col.type} · 默认 ${col.default}（双击定位）`
                                            : `${col.name} · ${col.type}（双击定位）`
                                    "
                                    @dblclick.stop="
                                        openTableAtColumn(table, col.name)
                                    "
                                >
                                    <KeyRound
                                        v-if="colBadgeKind(col) === 'key'"
                                        class="h-3 w-3 flex-shrink-0 text-zx-primary"
                                    />
                                    <Clock
                                        v-else-if="colBadgeKind(col) === 'datetime'"
                                        class="h-3 w-3 flex-shrink-0 text-zx-text-subtle"
                                    />
                                    <span
                                        v-else
                                        class="flex w-4 flex-shrink-0 items-center justify-center text-[9px] font-bold leading-none"
                                        :class="
                                            colBadgeKind(col) === 'number'
                                                ? 'text-zx-primary'
                                                : colBadgeKind(col) === 'boolean'
                                                  ? 'text-zx-info'
                                                  : colBadgeKind(col) === 'json'
                                                    ? 'text-zx-warning'
                                                    : 'text-zx-text-muted'
                                        "
                                    >
                                        {{
                                            colBadgeKind(col) === "number"
                                                ? "123"
                                                : colBadgeKind(col) === "boolean"
                                                  ? "01"
                                                  : colBadgeKind(col) === "json"
                                                    ? "{}"
                                                    : "AZ"
                                        }}
                                    </span>
                                    <span
                                        class="flex-shrink-0 font-medium text-zx-text"
                                        >{{ col.name }}</span
                                    >
                                    <span
                                        class="min-w-0 truncate text-[10px] text-zx-text-subtle"
                                        >{{ colMetaText(col) }}</span
                                    >
                                </div>
                            </div>

                            <!-- 键 -->
                            <button
                                type="button"
                                class="btn-touch flex h-[24px] w-full cursor-pointer items-center gap-1.5 rounded-md px-1.5 text-[11px] text-zx-text-muted transition-colors hover:bg-slate-200/60"
                                @click="togglePart(table, 'keys')"
                            >
                                <ChevronDown
                                    v-if="isPartOpen(table, 'keys')"
                                    class="h-3 w-3 flex-shrink-0 text-zx-text-subtle"
                                />
                                <ChevronRight
                                    v-else
                                    class="h-3 w-3 flex-shrink-0 text-zx-text-subtle"
                                />
                                <KeyRound
                                    class="h-3.5 w-3.5 flex-shrink-0 text-zx-primary"
                                />
                                <span>键</span>
                                <span
                                    class="ml-auto text-[10px] text-zx-text-subtle"
                                    >{{ metaOf(table).keys.length }}</span
                                >
                            </button>
                            <div
                                v-show="isPartOpen(table, 'keys')"
                                class="pl-4"
                            >
                                <div
                                    v-if="!metaOf(table).keys.length"
                                    class="px-2 py-1 text-[11px] text-zx-text-subtle"
                                >
                                    无主键
                                </div>
                                <div
                                    v-for="k in metaOf(table).keys"
                                    :key="k.name"
                                    class="flex h-[22px] items-center gap-1.5 rounded-md px-1.5 text-[11px] text-zx-text-muted"
                                >
                                    <KeyRound
                                        class="h-3 w-3 flex-shrink-0 text-zx-primary"
                                    />
                                    <span class="flex-shrink-0 font-medium text-zx-text">{{
                                        k.name
                                    }}</span>
                                    <span
                                        class="min-w-0 truncate text-[10px] text-zx-text-subtle"
                                        >({{ k.columns.join(", ") }})</span
                                    >
                                </div>
                            </div>

                            <!-- 索引 -->
                            <button
                                type="button"
                                class="btn-touch flex h-[24px] w-full cursor-pointer items-center gap-1.5 rounded-md px-1.5 text-[11px] text-zx-text-muted transition-colors hover:bg-slate-200/60"
                                @click="togglePart(table, 'indexes')"
                            >
                                <ChevronDown
                                    v-if="isPartOpen(table, 'indexes')"
                                    class="h-3 w-3 flex-shrink-0 text-zx-text-subtle"
                                />
                                <ChevronRight
                                    v-else
                                    class="h-3 w-3 flex-shrink-0 text-zx-text-subtle"
                                />
                                <Hash
                                    class="h-3.5 w-3.5 flex-shrink-0 text-zx-info"
                                />
                                <span>索引</span>
                                <span
                                    class="ml-auto text-[10px] text-zx-text-subtle"
                                    >{{ metaOf(table).indexes.length }}</span
                                >
                            </button>
                            <div
                                v-show="isPartOpen(table, 'indexes')"
                                class="pl-4"
                            >
                                <div
                                    v-if="!metaOf(table).indexes.length"
                                    class="px-2 py-1 text-[11px] text-zx-text-subtle"
                                >
                                    无索引
                                </div>
                                <div
                                    v-for="ix in metaOf(table).indexes"
                                    :key="ix.name"
                                    class="flex h-[22px] items-center gap-1.5 rounded-md px-1.5 text-[11px] text-zx-text-muted"
                                    :title="ix.name"
                                >
                                    <!-- 索引：DataGrip 式斜体 i -->
                                    <span
                                        class="flex h-3 w-3 flex-shrink-0 items-center justify-center text-[11px] font-bold italic text-zx-info"
                                        >i</span
                                    >
                                    <span
                                        class="min-w-0 flex-1 truncate font-medium text-zx-text"
                                        >{{ ix.name }}</span
                                    >
                                    <span
                                        class="min-w-0 max-w-[45%] truncate text-[10px] text-zx-text-subtle"
                                        >({{ ix.columns.join(", ") }})</span
                                    >
                                </div>
                            </div>
                        </template>
                    </div>
                </div>
            </div>

            <!-- SQL 目录行：+ 在最右，只新建不打开 -->
            <div
                class="flex h-[26px] w-full items-center gap-1.5 px-2 text-xs font-medium text-zx-text-muted transition-colors hover:bg-slate-200/60"
            >
                <button
                    type="button"
                    class="btn-touch flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 text-left"
                    @click="showSql = !showSql"
                >
                    <ChevronDown
                        v-if="showSql"
                        class="h-3.5 w-3.5 flex-shrink-0 text-zx-text-subtle"
                    />
                    <ChevronRight
                        v-else
                        class="h-3.5 w-3.5 flex-shrink-0 text-zx-text-subtle"
                    />
                    <FolderIcon
                        class="h-4 w-4 flex-shrink-0 text-zx-primary"
                        :open="showSql"
                    />
                    <span class="truncate">SQL</span>
                    <span class="ml-auto text-[10px] text-zx-text-subtle">{{
                        sqlFiles.length
                    }}</span>
                </button>
                <button
                    type="button"
                    class="btn-touch flex h-6 w-6 flex-shrink-0 cursor-pointer items-center justify-center rounded-md text-zx-text-subtle transition-colors hover:bg-slate-200/80 hover:text-zx-primary"
                    title="新建 SQL（不打开）"
                    @click.stop="newSqlFile"
                >
                    <Plus class="h-3.5 w-3.5" />
                </button>
            </div>

            <div v-show="showSql" class="pl-3">
                <div
                    v-if="!sqlFiles.length"
                    class="px-2 py-1.5 text-[11px] text-zx-text-subtle"
                >
                    暂无 SQL 文件
                </div>

                <!-- 行内重命名 -->
                <div
                    v-if="renamingName"
                    class="flex h-[26px] items-center gap-1 rounded-md px-1"
                >
                    <SqlIcon class="h-3.5 w-3.5 flex-shrink-0 object-contain" />
                    <input
                        ref="renameInputEl"
                        v-model="renameValue"
                        class="h-5 min-w-0 flex-1 rounded-md border border-zx-primary bg-white px-1.5 text-xs text-zx-text outline-none"
                        @keydown.enter.prevent="commitRename(renamingName)"
                        @keydown.esc.prevent="cancelRename"
                        @blur="commitRename(renamingName)"
                    />
                </div>

                <template v-for="f in sqlFiles" :key="f.id">
                    <button
                        v-if="renamingName !== f.name"
                        type="button"
                        class="btn-touch flex h-[26px] w-full cursor-pointer items-center gap-1.5 rounded-md px-2 text-left text-xs transition-colors"
                        :class="
                            activePath === f.id
                                ? 'bg-zx-primary-tint font-medium text-zx-primary'
                                : 'text-zx-text-muted hover:bg-slate-200/60'
                        "
                        @click="openSql(f.name, f.content)"
                        @contextmenu.prevent.stop="showSqlMenu($event, f)"
                    >
                        <SqlIcon
                            class="h-3.5 w-3.5 flex-shrink-0 object-contain"
                        />
                        <span class="truncate">{{ f.name }}</span>
                    </button>
                </template>
            </div>
        </div>
    </div>
</template>
