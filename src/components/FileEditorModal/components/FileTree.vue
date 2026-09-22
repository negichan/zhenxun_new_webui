<script setup lang="ts">
/**
 * 资源管理器文件树（根）：工作区根目录 + 懒加载递归树 + 过滤 + 右键文件操作。
 * 重命名/删除通过 wb.handleFileRenamed / handleFileDeleted 同步已打开的标签。
 */
import {
    computed,
    nextTick,
    onMounted,
    provide,
    ref,
    watch,
} from "vue";
import {
    ClipboardPaste,
    Copy,
    Download,
    FilePlus2,
    FileText,
    FolderPlus,
    Folder,
    Link,
    Loader2,
    Pencil,
    RefreshCw,
    RotateCw,
    Scissors,
    Trash2,
} from "lucide-vue-next";
import { fileApi } from "@/utils/api-next";
import { ZXContextMenu, menuSep } from "@/components/zxcomponent/ContextMenu";
import { ZXMessageBox, ZXNotification } from "@/services/ui";
import { pasteWithConflict } from "@/composables/usePasteConflict";
import { scrollElementInContainer } from "@/composables/scrollInView";
import FileTreeNode from "./FileTreeNode.vue";
import { TREE_CONTEXT_KEY } from "../treeContext";
import type { TreeContext, TreeEditing } from "../treeContext";
import type { TreeNode } from "../types";
import type { Workbench } from "../useWorkbench";

const props = defineProps<{
    wb: Workbench;
}>();

const treeRootRef = ref<HTMLElement | null>(null);
const rootLoading = ref(false);
const editing = ref<TreeEditing | null>(null);

const rootChildren = ref<TreeNode[]>([]);
const rootPath = ref("");
const rootError = ref("");

const normalize = (p: string) =>
    p.replace(/\\/g, "/").replace(/\/{2,}/g, "/");

const toTreeNode = (item: {
    path: string;
    name: string;
    is_file: boolean;
}): TreeNode => ({
    path: normalize(item.path),
    name: item.name,
    is_file: item.is_file,
    isExpanded: false,
    isLoaded: item.is_file,
    isLoading: false,
    children: [],
});

/** VSCode 资源管理器排序：文件夹在前、文件在后，各自按名称（zh-CN 忽略大小写） */
const sortNodes = (nodes: TreeNode[]): TreeNode[] =>
    nodes.sort(
        (a, b) =>
            Number(a.is_file) - Number(b.is_file) ||
            a.name.localeCompare(b.name, "zh-CN", { sensitivity: "base" }),
    );

const loadRoot = async () => {
    rootLoading.value = true;
    rootError.value = "";
    try {
        const res = await fileApi.getFileList();
        if (res?.success && res.data) {
            rootPath.value = normalize(res.data.current_path || "");
            rootChildren.value = sortNodes((res.data.files || []).map(toTreeNode));
        } else {
            rootError.value = res?.message || "目录读取失败，请重试";
        }
    } catch (e) {
        rootError.value = (e as Error)?.message || "目录读取失败，请重试";
    } finally {
        rootLoading.value = false;
    }
};

const loadChildren = async (node: TreeNode, force = false) => {
    if (node.isLoaded && !force) return;
    node.isLoading = true;
    try {
        const res = await fileApi.getFileList(node.path);
        node.children = sortNodes((res?.data?.files || []).map(toTreeNode));
        node.isLoaded = true;
    } finally {
        node.isLoading = false;
    }
};

const selectedPath = ref<string>("");

const toggleNode = (node: TreeNode) => {
    if (node.is_file) return;
    selectedPath.value = node.path;
    node.isExpanded = !node.isExpanded;
    if (node.isExpanded) loadChildren(node);
};

// ==================== 批量选择 ====================
const multiSelected = ref<Set<string>>(new Set());
const lastSelectPath = ref("");

const isMultiSelected = (path: string) => multiSelected.value.has(path);

const clearMultiSelect = () => {
    multiSelected.value = new Set();
    lastSelectPath.value = "";
};

/** 当前可见节点扁平列表（Shift 范围选） */
const flattenVisible = (): TreeNode[] => {
    const out: TreeNode[] = [];
    const walk = (nodes: TreeNode[]) => {
        for (const n of nodes) {
            out.push(n);
            if (!n.is_file && n.isExpanded) walk(n.children);
        }
    };
    walk(rootChildren.value);
    return out;
};

const selectNode = (node: TreeNode, e?: MouseEvent) => {
    const multi = !!(e && (e.ctrlKey || e.metaKey || e.shiftKey));
    if (!multi) {
        multiSelected.value = new Set([node.path]);
        lastSelectPath.value = node.path;
        selectedPath.value = node.path;
        void nextTick(() => applyTreeSelectionDom());
        return;
    }

    if (e?.shiftKey && lastSelectPath.value) {
        const list = flattenVisible();
        const a = list.findIndex((n) => n.path === lastSelectPath.value);
        const b = list.findIndex((n) => n.path === node.path);
        if (a >= 0 && b >= 0) {
            const [s, en] = a < b ? [a, b] : [b, a];
            const next = new Set(multiSelected.value);
            for (let i = s; i <= en; i++) {
                const n = list[i];
                if (n) next.add(n.path);
            }
            multiSelected.value = next;
        }
        void nextTick(() => applyTreeSelectionDom());
        return;
    }

    const next = new Set(multiSelected.value);
    if (next.has(node.path)) next.delete(node.path);
    else next.add(node.path);
    multiSelected.value = next;
    lastSelectPath.value = node.path;
    void nextTick(() => applyTreeSelectionDom());
};

/** 命令式高亮：选中不触发 Vue 重绘，避免视窗外节点布局被压塌 */
const applyTreeSelectionDom = () => {
    const root = treeRootRef.value;
    if (!root) return;
    const active =
        selectedPath.value || props.wb.activeTab.value?.path || "";
    root.querySelectorAll<HTMLElement>(".tree-node-row[data-node-path]").forEach(
        (el) => {
            const p = el.getAttribute("data-node-path") || "";
            const isActive = !!p && p === active;
            const isMulti = multiSelected.value.has(p);
            el.classList.toggle("tree-row-active", isActive);
            el.classList.toggle("tree-row-multi", !isActive && isMulti);
        },
    );
};

watch([selectedPath, multiSelected], () => {
    void nextTick(() => applyTreeSelectionDom());
});

const selectAllVisible = () => {
    const list = flattenVisible().filter((n) => n.is_file || true);
    multiSelected.value = new Set(list.map((n) => n.path));
};

const openFile = (node: TreeNode) => {
    selectedPath.value = node.path;
    props.wb.openFile(node.path, node.name);
};

// ==================== 行内编辑（新建 / 重命名） ====================
const INVALID_NAME = /[\\/:*?"<>|]/;

const startCreate = async (folder: TreeNode, kind: "file" | "folder") => {
    folder.isExpanded = true;
    await loadChildren(folder);
    editing.value = {
        kind: kind === "file" ? "create-file" : "create-folder",
        parentPath: folder.path,
        node: null,
        value: "",
    };
};

const startCreateAtRoot = (kind: "file" | "folder") => {
    editing.value = {
        kind: kind === "file" ? "create-file" : "create-folder",
        parentPath: rootPath.value,
        node: null,
        value: "",
    };
};

const startRename = (node: TreeNode) => {
    editing.value = {
        kind: "rename",
        parentPath: normalize(node.path).split("/").slice(0, -1).join("/"),
        node,
        value: node.name,
    };
};

const notifyFail = (title: string, e: unknown) => {
    ZXNotification({
        title,
        message: (e as Error)?.message || "操作失败了 (´；ω；`)",
        type: "error",
        position: "top-right",
    });
};

const commitEditing = async () => {
    const editingState = editing.value;
    if (!editingState) return;
    const name = editingState.value.trim();
    if (!name || INVALID_NAME.test(name)) {
        ZXNotification({
            title: "名称不合法",
            message: "名称不能为空，且不能包含 \\ / : * ? \" < > | 字符",
            type: "warning",
            position: "top-right",
        });
        return;
    }

    try {
        if (editingState.kind === "rename" && editingState.node) {
            const node = editingState.node;
            const newPath = `${editingState.parentPath}/${name}`;
            if (newPath === node.path) {
                editing.value = null;
                return;
            }
            const res = await fileApi.rename(node.path, name);
            if (!res?.success) {
                notifyFail("重命名失败", new Error(res?.message));
                return;
            }
            // 目录重命名后子路径全部失效：父层重载即可（子节点对象会被替换）
            const wasExpanded = !node.is_file && node.isExpanded;
            await reloadChildrenOf(editingState.parentPath);
            if (wasExpanded) {
                const renamed = findNodeByPath(newPath);
                if (renamed) {
                    renamed.isExpanded = true;
                    await loadChildren(renamed, true);
                }
            }
            props.wb.handleFileRenamed(node.path, newPath);
            ZXNotification({
                title: "重命名成功～",
                message: `已重命名为 ${name}`,
                type: "success",
                position: "top-right",
            });
        } else {
            const parentPath = editingState.parentPath;
            const res =
                editingState.kind === "create-file"
                    ? await fileApi.createFile(parentPath, name)
                    : await fileApi.createFolder(parentPath, name);
            if (!res?.success) {
                notifyFail("创建失败", new Error(res?.message));
                return;
            }
            await reloadChildrenOf(parentPath);
            // 展开目标目录让新节点可见
            if (parentPath !== rootPath.value) {
                const parent = findNodeByPath(parentPath);
                if (parent) parent.isExpanded = true;
            }
            ZXNotification({
                title: "创建成功～",
                message: `${name} 创建成功！`,
                type: "success",
                position: "top-right",
            });
        }
    } catch (e) {
        notifyFail("操作失败", e);
    } finally {
        editing.value = null;
    }
};

const cancelEditing = () => {
    editing.value = null;
};

/** 失焦收尾：重命名有改动则提交；未改名 / 新建为空则取消 */
const finishEditing = () => {
    const s = editing.value;
    if (!s) return;
    const name = s.value.trim();
    if (s.kind === "rename") {
        if (!s.node || name === s.node.name) {
            cancelEditing();
            return;
        }
    } else if (!name) {
        cancelEditing();
        return;
    }
    void commitEditing();
};

// ==================== 删除 / 下载 ====================
const confirmDelete = (node: TreeNode) => {
    ZXMessageBox({
        title: "删除确认",
        type: "warning",
        message: node.is_file
            ? `"${node.name}" 删除后无法恢复，确定要删除吗？`
            : `"${node.name}" 是文件夹，其中的所有内容都会被删除且无法恢复，确定吗？`,
        cancelButtonText: "取消",
        confirmButtonText: "删除",
        confirmButtonHoverBg: "var(--zx-color-danger)",
        onConfirm: async () => {
            try {
                const res = node.is_file
                    ? await fileApi.deleteFile(node.path)
                    : await fileApi.deleteFolder(node.path);
                if (!res?.success) {
                    notifyFail("删除失败", new Error(res?.message));
                    return;
                }
                props.wb.handleFileDeleted(node.path, !node.is_file);
                await reloadChildrenOf(
                    node.path.split("/").slice(0, -1).join("/"),
                );
                ZXNotification({
                    title: "删除成功～",
                    message: `${node.name} 已删除`,
                    type: "success",
                    position: "top-right",
                });
            } catch (e) {
                notifyFail("删除失败", e);
            }
        },
    });
};

const download = async (node: TreeNode) => {
    try {
        const { blob, filename } = await fileApi.downloadFiles([node.path]);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename || node.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    } catch (e) {
        notifyFail("下载失败", e);
    }
};

// ==================== 复制 / 剪切 / 粘贴 / 复制地址 ====================
type ClipItem = { path: string; name: string; isFile: boolean };
const clipboard = ref<{ mode: "copy" | "cut"; items: ClipItem[] } | null>(null);

const notifyOk = (title: string, message: string) => {
    ZXNotification({
        title,
        message,
        type: "success",
        position: "top-right",
    });
};

const copyNode = (node: TreeNode) => {
    const nodes = menuTargetsOf(node);
    clipboard.value = {
        mode: "copy",
        items: nodes.map((n) => ({
            path: n.path,
            name: n.name,
            isFile: n.is_file,
        })),
    };
    notifyOk(
        "已复制",
        nodes.length === 1
            ? `${nodes[0].name}`
            : `${nodes.length} 项（粘贴时写入目标目录）`,
    );
};

const cutNode = (node: TreeNode) => {
    const nodes = menuTargetsOf(node);
    clipboard.value = {
        mode: "cut",
        items: nodes.map((n) => ({
            path: n.path,
            name: n.name,
            isFile: n.is_file,
        })),
    };
    notifyOk(
        "已剪切",
        nodes.length === 1
            ? `${nodes[0].name}`
            : `${nodes.length} 项（粘贴到目标目录）`,
    );
};

/** 右键批量：节点在多选集合且数量>1 时操作整个选区 */
const collectSelectedNodes = (): TreeNode[] => {
    const out: TreeNode[] = [];
    const walk = (nodes: TreeNode[]) => {
        for (const n of nodes) {
            if (multiSelected.value.has(n.path)) out.push(n);
            if (!n.is_file) walk(n.children);
        }
    };
    walk(rootChildren.value);
    return out;
};

const menuTargetsOf = (node: TreeNode): TreeNode[] => {
    if (multiSelected.value.has(node.path) && multiSelected.value.size > 1) {
        const sel = collectSelectedNodes();
        if (sel.length > 1) return sel;
    }
    return [node];
};

/** 绝对地址：树节点上的完整路径 */
const absolutePathOf = (node: TreeNode) => normalize(node.path);

/** 相对地址：相对工作区根（rootPath） */
const relativePathOf = (node: TreeNode) => {
    const full = normalize(node.path);
    const root = normalize(rootPath.value);
    if (!root) return full;
    if (full === root) return ".";
    if (full.startsWith(`${root}/`)) return full.slice(root.length + 1);
    return full;
};

const copyPathText = async (text: string, kind: "绝对地址" | "相对地址") => {
    try {
        await navigator.clipboard?.writeText(text);
        notifyOk(`已复制${kind}`, text);
    } catch {
        notifyFail("复制地址失败", new Error("剪贴板不可用"));
    }
};

/** 复制地址 → 二级：绝对 / 相对 */
const copyAddressMenu = (node: TreeNode) => ({
    label: "复制地址",
    icon: Link,
    children: [
        {
            label: "绝对地址",
            icon: Link,
            action: () => void copyPathText(absolutePathOf(node), "绝对地址"),
        },
        {
            label: "相对地址",
            icon: Link,
            action: () => void copyPathText(relativePathOf(node), "相对地址"),
        },
    ],
});

/** 粘贴目标目录：文件夹=自身；文件/空白=其父目录或工作区根 */
const resolvePasteDir = (target: TreeNode | null): string => {
    if (!target) return rootPath.value;
    if (!target.is_file) return target.path;
    return normalize(target.path).split("/").slice(0, -1).join("/") || rootPath.value;
};

const reloadDir = async (dirPath: string) => {
    if (!dirPath || dirPath === rootPath.value) {
        await loadRoot();
        return;
    }
    const node = findNodeByPath(dirPath);
    if (node && !node.is_file) {
        node.isExpanded = true;
        await loadChildren(node, true);
        return;
    }
    await loadRoot();
};

const pasteTo = async (target: TreeNode | null) => {
    const clip = clipboard.value;
    if (!clip?.items.length) return;
    const destDir = resolvePasteDir(target);
    if (!destDir) {
        notifyFail("粘贴失败", new Error("目标目录无效"));
        return;
    }

    const result = await pasteWithConflict({
        items: clip.items,
        mode: clip.mode,
        destDir,
    });

    if (result.cancelled) {
        notifyOk("已取消粘贴", "未修改目标目录");
        return;
    }

    if (clip.mode === "cut" && result.ok > 0) clipboard.value = null;

    if (result.ok > 0) {
        notifyOk(
            clip.mode === "copy" ? "粘贴成功" : "移动成功",
            result.failed
                ? `成功 ${result.ok} 项，失败/跳过 ${result.failed} 项`
                : `${result.ok} 项已完成`,
        );
    } else if (result.failed > 0) {
        notifyFail(
            "粘贴失败",
            new Error("没有项目被粘贴，后端需支持 /file/copy 与 /file/move"),
        );
    }

    await loadRoot();
    const destNode = findNodeByPath(destDir);
    if (destNode && !destNode.is_file) {
        destNode.isExpanded = true;
        await loadChildren(destNode, true);
    }
};

const canPaste = () => !!clipboard.value?.items.length;

// ==================== 右键菜单（JetBrains 式功能分组） ====================
const showMenu = (e: MouseEvent, node: TreeNode) => {
    /** 在指定目录下新建（文件节点取其父目录） */
    const parentDirOf = (fileNode: TreeNode) => {
        const parentPath = normalize(fileNode.path)
            .split("/")
            .slice(0, -1)
            .join("/");
        return findNodeByPath(parentPath);
    };

    const targets = menuTargetsOf(node);
    const batch = targets.length > 1;

    const deleteTargets = () => {
        if (!batch) {
            confirmDelete(targets[0]!);
            return;
        }
        ZXMessageBox({
            title: "批量删除",
            type: "warning",
            message: `确定删除选中的 ${targets.length} 项吗？此操作不可恢复！`,
            cancelButtonText: "取消",
            confirmButtonText: "删除",
            confirmButtonHoverBg: "var(--zx-color-danger)",
            onConfirm: async () => {
                let failed = 0;
                for (const n of targets) {
                    try {
                        const res = n.is_file
                            ? await fileApi.deleteFile(n.path)
                            : await fileApi.deleteFolder(n.path);
                        if (!res?.success) failed++;
                    } catch {
                        failed++;
                    }
                }
                if (failed === 0) {
                    clearMultiSelect();
                    notifyOk("删除成功", `${targets.length} 项已删除`);
                } else {
                    notifyFail("删除失败", new Error(`${failed} 项失败`));
                }
                await loadRoot();
            },
        });
    };

    const downloadTargets = async () => {
        try {
            const { blob, filename } = await fileApi.downloadFiles(
                targets.map((n) => n.path),
            );
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download =
                filename ||
                (batch ? `files_${targets.length}.zip` : targets[0]!.name);
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            notifyFail("下载失败", err);
        }
    };

    const clipItems = [
        {
            label: batch ? `复制选中项 (${targets.length})` : "复制",
            icon: Copy,
            action: () => copyNode(node),
        },
        {
            label: batch ? `剪切选中项 (${targets.length})` : "剪切",
            icon: Scissors,
            action: () => cutNode(node),
        },
        {
            label: "粘贴",
            icon: ClipboardPaste,
            disabled: !canPaste(),
            action: () => void pasteTo(node),
        },
    ];

    if (node.is_file) {
        ZXContextMenu.show({
            x: e.clientX,
            y: e.clientY,
            items: [
                ...(batch
                    ? []
                    : [
                          {
                              label: "打开",
                              icon: Folder,
                              action: () => openFile(node),
                          },
                          menuSep(),
                      ]),
                {
                    label: "新建",
                    icon: FilePlus2,
                    disabled: batch,
                    children: [
                        {
                            label: "新建文件",
                            icon: FilePlus2,
                            action: () => {
                                const parent = parentDirOf(node);
                                if (parent) startCreate(parent, "file");
                                else startCreateAtRoot("file");
                            },
                        },
                        {
                            label: "新建文件夹",
                            icon: FolderPlus,
                            action: () => {
                                const parent = parentDirOf(node);
                                if (parent) startCreate(parent, "folder");
                                else startCreateAtRoot("folder");
                            },
                        },
                    ],
                },
                menuSep(),
                ...clipItems,
                menuSep(),
                ...(batch
                    ? []
                    : [
                          {
                              label: "重命名",
                              icon: Pencil,
                              action: () => startRename(node),
                          },
                      ]),
                {
                    label: batch
                        ? `下载选中项 (${targets.length})`
                        : "下载",
                    icon: Download,
                    action: () => void downloadTargets(),
                },
                ...(batch
                    ? []
                    : [copyAddressMenu(node)]),
                menuSep(),
                {
                    label: batch
                        ? `删除选中项 (${targets.length})`
                        : "删除",
                    icon: Trash2,
                    danger: true,
                    action: deleteTargets,
                },
            ],
        });
    } else {
        ZXContextMenu.show({
            x: e.clientX,
            y: e.clientY,
            items: [
                {
                    label: "新建",
                    icon: FilePlus2,
                    disabled: batch,
                    children: [
                        {
                            label: "新建文件",
                            icon: FilePlus2,
                            action: () => startCreate(node, "file"),
                        },
                        {
                            label: "新建文件夹",
                            icon: FolderPlus,
                            action: () => startCreate(node, "folder"),
                        },
                    ],
                },
                menuSep(),
                ...clipItems,
                menuSep(),
                ...(batch
                    ? []
                    : [
                          {
                              label: "重命名",
                              icon: Pencil,
                              action: () => startRename(node),
                          },
                          {
                              label: "刷新",
                              icon: RotateCw,
                              action: () => {
                                  node.isExpanded = true;
                                  loadChildren(node, true);
                              },
                          },
                          copyAddressMenu(node),
                      ]),
                {
                    label: batch
                        ? `下载选中项 (${targets.length})`
                        : "下载",
                    icon: Download,
                    action: () => void downloadTargets(),
                },
                menuSep(),
                {
                    label: batch
                        ? `删除选中项 (${targets.length})`
                        : "删除",
                    icon: Trash2,
                    danger: true,
                    action: deleteTargets,
                },
            ],
        });
    }
};

/** 空白区域（列表下方/空隙）右键：新建 / 粘贴到工作区根 */
const showEmptyAreaMenu = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest("[data-node-path]") || target?.closest("input")) return;
    e.preventDefault();
    ZXContextMenu.show({
        x: e.clientX,
        y: e.clientY,
        items: [
            {
                label: "新建",
                icon: FilePlus2,
                children: [
                    {
                        label: "新建文件",
                        icon: FilePlus2,
                        action: () => startCreateAtRoot("file"),
                    },
                    {
                        label: "新建文件夹",
                        icon: FolderPlus,
                        action: () => startCreateAtRoot("folder"),
                    },
                ],
            },
            menuSep(),
            {
                label: "粘贴",
                icon: ClipboardPaste,
                disabled: !canPaste(),
                action: () => void pasteTo(null),
            },
            menuSep(),
            { label: "刷新", icon: RotateCw, action: () => loadRoot() },
        ],
    });
};

// ==================== 节点查找 / 重载 / reveal ====================
const findNodeByPath = (path: string): TreeNode | null => {
    const target = normalize(path);
    if (target === rootPath.value) return null; // 根目录无节点对象
    let layer = rootChildren.value;
    let found: TreeNode | null = null;
    const segs = target.slice(rootPath.value.length + 1).split("/");
    for (const seg of segs) {
        found = layer.find((n) => n.name === seg) || null;
        if (!found) return null;
        layer = found.children;
    }
    return found;
};

const reloadChildrenOf = async (parentPath: string) => {
    const parent = normalize(parentPath);
    if (parent === rootPath.value) {
        await loadRoot();
        return;
    }
    const node = findNodeByPath(parent);
    if (node) await loadChildren(node, true);
};

/** 激活标签变化时逐级展开到目标文件并滚动可见 */
const revealPath = async (path: string) => {
    const target = normalize(path);
    if (!rootPath.value || !target.startsWith(`${rootPath.value}/`)) return;
    const segs = target.slice(rootPath.value.length + 1).split("/");
    let layer = rootChildren.value;
    for (const seg of segs) {
        const node = layer.find((n) => n.name === seg);
        if (!node) return;
        if (!node.is_file) {
            node.isExpanded = true;
            if (!node.isLoaded) await loadChildren(node);
            layer = node.children;
        } else {
            await nextTick();
            const el = treeRootRef.value?.querySelector(
                `[data-node-path="${CSS.escape(node.path)}"]`,
            );
            scrollElementInContainer(treeRootRef.value, el as HTMLElement | null);
        }
    }
};

// ==================== 键盘导航（对齐 VSCode 资源管理器） ====================
const scrollNodeIntoView = (path: string) => {
    void nextTick(() => {
        const el = treeRootRef.value?.querySelector<HTMLElement>(
            `[data-node-path="${CSS.escape(path)}"]`,
        );
        // 只在树容器内滚动，禁止 scrollIntoView 拖动弹窗/页面
        scrollElementInContainer(treeRootRef.value, el);
    });
};

const selectNodeByPath = (path: string) => {
    selectedPath.value = path;
    multiSelected.value = new Set([path]);
    lastSelectPath.value = path;
    scrollNodeIntoView(path);
    void nextTick(() => applyTreeSelectionDom());
};

const parentPathOf = (path: string) => {
    const i = path.lastIndexOf("/");
    return i <= 0 ? rootPath.value : path.slice(0, i);
};

const onTreeKeydown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (
        editing.value ||
        target?.closest("input, textarea, select, [contenteditable]")
    ) {
        return;
    }

    const mod = e.ctrlKey || e.metaKey;
    const list = flattenVisible();
    if (!list.length && !(mod && e.key.toLowerCase() === "v")) return;

    const active =
        selectedPath.value || props.wb.activeTab.value?.path || "";
    let idx = list.findIndex((n) => n.path === active);
    if (idx < 0) idx = 0;
    const current = list[idx]!;

    // 批量操作快捷键
    if (mod) {
        const k = e.key.toLowerCase();
        if (k === "a") {
            e.preventDefault();
            selectAllVisible();
            return;
        }
        if (k === "c" && multiSelected.value.size) {
            e.preventDefault();
            const nodes = collectSelectedNodes();
            if (nodes.length) copyNode(nodes[0]!);
            return;
        }
        if (k === "x" && multiSelected.value.size) {
            e.preventDefault();
            const nodes = collectSelectedNodes();
            if (nodes.length) cutNode(nodes[0]!);
            return;
        }
        if (k === "v") {
            e.preventDefault();
            void pasteTo(null);
            return;
        }
    }

    if (e.key === "Escape") {
        e.preventDefault();
        clearMultiSelect();
        return;
    }

    switch (e.key) {
        case "ArrowDown": {
            e.preventDefault();
            const next = list[Math.min(list.length - 1, idx + 1)]!;
            if (e.shiftKey) {
                const range = new Set(multiSelected.value);
                range.add(current.path);
                range.add(next.path);
                multiSelected.value = range;
                lastSelectPath.value = lastSelectPath.value || current.path;
                selectedPath.value = next.path;
            } else {
                selectNodeByPath(next.path);
            }
            scrollNodeIntoView(next.path);
            break;
        }
        case "ArrowUp": {
            e.preventDefault();
            const prev = list[Math.max(0, idx - 1)]!;
            if (e.shiftKey) {
                const range = new Set(multiSelected.value);
                range.add(current.path);
                range.add(prev.path);
                multiSelected.value = range;
                selectedPath.value = prev.path;
            } else {
                selectNodeByPath(prev.path);
            }
            scrollNodeIntoView(prev.path);
            break;
        }
        case "ArrowRight": {
            e.preventDefault();
            if (!current.is_file && !current.isExpanded) {
                toggleNode(current);
                return;
            }
            if (!current.is_file && current.isExpanded && current.children[0]) {
                selectNodeByPath(current.children[0].path);
            }
            break;
        }
        case "ArrowLeft": {
            e.preventDefault();
            if (!current.is_file && current.isExpanded) {
                current.isExpanded = false;
                selectNodeByPath(current.path);
                return;
            }
            const parentPath = parentPathOf(current.path);
            if (parentPath && parentPath !== rootPath.value) {
                selectNodeByPath(parentPath);
            } else if (current.is_file) {
                const parent = findNodeByPath(parentPathOf(current.path));
                if (parent) selectNodeByPath(parent.path);
            }
            break;
        }
        case "Enter": {
            e.preventDefault();
            if (current.is_file) openFile(current);
            else toggleNode(current);
            break;
        }
        case " ": {
            e.preventDefault();
            if (!current.is_file) toggleNode(current);
            else openFile(current);
            break;
        }
        default:
            break;
    }
};

// 注入递归上下文
provide<TreeContext>(TREE_CONTEXT_KEY, {
    activePath: computed(
        () => selectedPath.value || props.wb.activeTab.value?.path || "",
    ),
    multiSelected,
    isMultiSelected,
    clearMultiSelect,
    editing,
    toggleNode,
    selectNode,
    openFile,
    showMenu,
    commitEditing,
    cancelEditing,
    finishEditing,
});

onMounted(loadRoot);

defineExpose({
    revealPath,
    reload: loadRoot,
    startCreateAtRoot,
    /** 菜单「重命名」：定位到指定路径的树节点并进入行内编辑 */
    renamePath: async (path: string) => {
        await revealPath(path);
        const node = findNodeByPath(path);
        if (node) startRename(node);
        else
            ZXNotification({
                title: "找不到文件",
                message: "文件不在当前树里，刷新后重试 (´･_･`)",
                type: "warning",
                position: "top-right",
            });
    },
    /** 菜单「删除」：定位并走删除确认流程 */
    deletePath: async (path: string) => {
        await revealPath(path);
        const node = findNodeByPath(path);
        if (node) confirmDelete(node);
        else
            ZXNotification({
                title: "找不到文件",
                message: "文件不在当前树里，刷新后重试 (´･_･`)",
                type: "warning",
                position: "top-right",
            });
    },
});
</script>

<template>
    <div
        class="flex h-full w-full select-none flex-col overflow-hidden"
    >
        <!-- 标题行 -->
        <div
            class="group flex h-8 flex-shrink-0 items-center justify-between px-3 text-[11px] font-semibold tracking-wider text-zx-text-muted uppercase"
        >
            <span>资源管理器</span>
            <ZxButton
                variant="ghost"
                circle
                size="sm"
                class="!h-6 !w-6 transition-opacity"
                :class="[
                    rootError || rootChildren.length === 0
                        ? 'opacity-100'
                        : 'opacity-0 group-hover:opacity-100',
                    { 'animate-spin': rootLoading },
                ]"
                title="刷新根目录"
                @click="loadRoot"
            >
                <RefreshCw class="h-3 w-3" />
            </ZxButton>
        </div>


        <!-- 树主体（不显示工作区根节点，直接平铺根层内容；下方空白可右键） -->
        <div
            ref="treeRootRef"
            class="min-h-0 flex-1 overflow-y-auto pt-0 pb-1.5 text-xs outline-none"
            tabindex="0"
            @keydown="onTreeKeydown"
            @contextmenu.prevent="showEmptyAreaMenu"
        >
            <div
                v-if="rootLoading && rootChildren.length === 0"
                class="flex h-[26px] items-center gap-1.5 px-2 text-[11px] text-zx-text-subtle"
            >
                <Loader2 class="h-3.5 w-3.5 animate-spin" />
                <span>加载中...</span>
            </div>
            <div
                v-else-if="rootError && rootChildren.length === 0"
                class="px-2 py-3 text-[11px] text-zx-danger"
            >
                <p>{{ rootError }}</p>
                <button
                    class="mt-1.5 cursor-pointer rounded-md border border-slate-200 px-2 py-1 text-zx-text-muted transition-colors hover:text-zx-text"
                    type="button"
                    @click="loadRoot"
                >
                    重试
                </button>
            </div>

            <!-- 根层新建输入行 -->
            <div
                v-if="
                    editing && editing.kind !== 'rename' && editing.parentPath === rootPath
                "
                class="flex h-[26px] items-center gap-1.5 pr-2 pl-2"
            >
                <span class="w-3.5 flex-shrink-0"></span>
                <FileText class="h-4 w-4 flex-shrink-0 text-zx-text-subtle" />
                <input
                    v-model="editing.value"
                    class="h-5 min-w-0 flex-1 rounded-md border border-zx-primary bg-white px-1.5 text-xs text-zx-text focus:outline-none"
                    :placeholder="
                        editing.kind === 'create-file' ? '文件名（含后缀）' : '文件夹名'
                    "
                    :on-vnode-mounted="
                        (v: { el?: unknown }) => (v.el as HTMLInputElement | null)?.focus()
                    "
                    @keydown.enter.prevent="commitEditing"
                    @keydown.esc.prevent="cancelEditing"
                    @blur="finishEditing"
                />
            </div>

            <FileTreeNode
                v-for="node in rootChildren"
                :key="node.path"
                :node="node"
                :depth="0"
            />

            <!-- 底部留出一点空白，方便空白区右键 -->
            <div class="min-h-8" />
        </div>
    </div>
</template>
