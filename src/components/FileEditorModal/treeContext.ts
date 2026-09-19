/**
 * FileTree ↔ FileTreeNode 递归注入上下文。
 * 单独成文件避免递归组件与父组件的循环依赖。
 */
import type { InjectionKey, Ref } from "vue";
import type { TreeNode } from "./types";

export interface TreeEditing {
    kind: "create-file" | "create-folder" | "rename";
    /** create-* 时为目标父目录；rename 时为被重命名节点的父目录 */
    parentPath: string;
    /** rename 时为被重命名的节点 */
    node: TreeNode | null;
    value: string;
}

export interface TreeContext {
    /** 当前激活标签的规范化路径（高亮 + 自动 reveal） */
    activePath: Ref<string>;
    /** 批量选中（Ctrl/Shift / 复选逻辑） */
    multiSelected: Ref<Set<string>>;
    isMultiSelected: (path: string) => boolean;
    editing: Ref<TreeEditing | null>;
    toggleNode: (node: TreeNode) => void;
    /** 单击节点：普通=单选；Ctrl/Shift=多选 */
    selectNode: (node: TreeNode, e?: MouseEvent) => void;
    clearMultiSelect: () => void;
    openFile: (node: TreeNode) => void;
    showMenu: (e: MouseEvent, node: TreeNode) => void;
    commitEditing: () => void;
    cancelEditing: () => void;
    /** 失焦：重命名有改动则提交，未改/新建为空则取消 */
    finishEditing: () => void;
}

export const TREE_CONTEXT_KEY: InjectionKey<TreeContext> = Symbol(
    "file-tree-context",
);
