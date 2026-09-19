import type * as MonacoNamespace from "monaco-editor/editor/editor.api";

/** 文件在编辑器里的分类（决定默认可用视图） */
export type FileKind = "text" | "binary" | "image" | "archive" | "table" | "sql";

/** 标签视图模式：文本 / 十六进制 / 图片 / 压缩包 / 数据表 / SQL 控制台 */
export type ViewMode = "text" | "hex" | "image" | "archive" | "table" | "sql";

/** 编辑器组 id（动态字符串，如 g0/g1/…，随拆分增长） */
export type EditorGroupId = string;

/** 工作台打开的一个文件标签（model / viewState 为 monaco 对象引用，保持非响应式语义） */
export interface EditorTab {
    /** = 规范化后的绝对路径（统一 / 分隔）；数据库虚拟标签用 db://… */
    id: string;
    path: string;
    name: string;
    /** 保存时告知后端的写盘编码（readFile 探测结果） */
    encoding: "utf-8" | "gbk";
    /** 打开时的原始内容，用于 dirty 判定 */
    initialContent: string;
    isDirty: boolean;
    isLoading: boolean;
    /** monaco 语言 id（后缀推断，可被状态栏覆盖） */
    language: string;
    eol: "lf" | "crlf";
    /** VSCode 预览标签：单击打开的临时标签，会被下一次单击替换；编辑/双击固定 */
    isPreview: boolean;
    kind: FileKind;
    viewMode: ViewMode;
    /** 原始字节的 base64（hex/utf-8 视图懒加载；图片视图也走它） */
    bytesB64: string | null;
    /** 图片 data URL 缓存：bytes 只构建一次，避免分栏拖宽时每帧重算导致解码卡顿 */
    imageUrl?: string;
    /** 字节加载中 */
    bytesLoading: boolean;
    model: MonacoNamespace.editor.ITextModel | null;
    viewState: MonacoNamespace.editor.ICodeEditorViewState | null;
    group?: EditorGroupId;
    /** 数据库表标签：表名 */
    tableName?: string;
    /** 恢复会话时源文件已不存在（VSCode 式保留标签） */
    missing?: boolean;
    /** 会话恢复用：标签已显示，内容尚未加载，激活时再拉 */
    lazy?: boolean;
}

/** 文件树节点 */
export interface TreeNode {
    path: string;
    name: string;
    is_file: boolean;
    isExpanded: boolean;
    /** children 是否已加载（懒加载） */
    isLoaded: boolean;
    isLoading: boolean;
    children: TreeNode[];
}

/** 侧边栏面板 */
export type SidebarPanel = "explorer" | "search" | "database";

// ==================== 标签页拖拽共享状态 ====================
import { ref } from "vue";

export const currentDraggingTab = ref<EditorTab | null>(null);
export const currentDraggingGroup = ref<EditorGroupId>("g0");

export function setDraggingTab(tab: EditorTab, group: EditorGroupId = "g0") {
    currentDraggingTab.value = tab;
    currentDraggingGroup.value = group;
}

export function clearDraggingTab() {
    currentDraggingTab.value = null;
}
