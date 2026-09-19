<script setup lang="ts">
/**
 * 文件树节点（递归自引用）：一行 = 折叠箭头 + 类型图标 + 名称。
 * 展开懒加载、过滤链路自动展示、行内重命名/新建输入、右键菜单都由 FileTree 注入。
 */
import { computed, inject, nextTick, ref, watch } from "vue";
import {
    ChevronDown,
    ChevronRight,
    FileText,
    Loader2,
} from "lucide-vue-next";
import FolderIcon from "@/components/zxcomponent/icons/FolderIcon.vue";
import { getFileIcon } from "../fileIcons";
import { TREE_CONTEXT_KEY } from "../treeContext";
import { createDoubleTap } from "../pointerDrag";
import type { TreeNode } from "../types";
import { useGlobalStore } from "@/store/global";

const props = defineProps<{
    node: TreeNode;
    depth: number;
}>();

const ctx = inject(TREE_CONTEXT_KEY)!;
const globalStore = useGlobalStore();
/** 移动端无可靠双击：单击直接打开文件；桌面保持双击 */
const isTouchLayout = computed(() => globalStore.isMobileMode);

const fileIcon = computed(() => getFileIcon(props.node.name));

/** 桌面：单击选中，双击打开；触控：同一节点双触打开 */
const fileDoubleTap = createDoubleTap(350);

const onRowClick = (e: MouseEvent) => {
    const multi = !!(e.ctrlKey || e.metaKey || e.shiftKey);
    if (props.node.is_file) {
        if (isTouchLayout.value) {
            ctx.openFile(props.node);
            return;
        }
        ctx.selectNode(props.node, e);
        if (!multi && fileDoubleTap(props.node.path)) {
            ctx.openFile(props.node);
        }
        return;
    }
    // 文件夹：单击选中并展开/收起（与原先一致）
    ctx.selectNode(props.node, e);
    if (!multi) ctx.toggleNode(props.node);
};

const isRenaming = computed(
    () =>
        ctx.editing.value?.kind === "rename" &&
        ctx.editing.value.node === props.node,
);

const isCreateTarget = computed(
    () =>
        ctx.editing.value !== null &&
        ctx.editing.value.kind !== "rename" &&
        ctx.editing.value.parentPath === props.node.path,
);

// 行内编辑输入（get/set 带空保护，避免模板里反复非空断言）
const editingInput = computed({
    get: () => ctx.editing.value?.value ?? "",
    set: (v: string) => {
        if (ctx.editing.value) ctx.editing.value.value = v;
    },
});

const editingPlaceholder = computed(() =>
    ctx.editing.value?.kind === "create-folder" ? "文件夹名" : "文件名（含后缀）",
);

const visibleChildren = computed(() =>
    props.node.isExpanded ? props.node.children : [],
);

const rowStyle = computed(() => ({
    paddingLeft: `${props.depth * 12 + 8}px`,
}));

const nameInputRef = ref<HTMLInputElement | null>(null);

// 进入编辑态后等 DOM 挂好再聚焦；on-vnode-mounted 在部分场景拿不到 el
watch(
    () => ctx.editing.value,
    (val) => {
        if (!val) return;
        nextTick(() => {
            nameInputRef.value?.focus();
            nameInputRef.value?.select();
        });
    },
    { immediate: true },
);
</script>

<template>
        <!-- 重命名态：图标保留，名称换成输入框 -->
        <div
            v-if="isRenaming"
            class="flex h-[26px] items-center gap-1.5 pr-2"
            :style="rowStyle"
        >
            <component
                :is="fileIcon.icon"
                class="h-4 w-4 flex-shrink-0"
                :class="fileIcon.class"
            />
            <input
                ref="nameInputRef"
                v-model="editingInput"
                class="h-5 min-w-0 flex-1 rounded-md border border-zx-primary bg-white px-1.5 text-xs text-zx-text focus:outline-none"
                @keydown.enter.prevent="ctx.commitEditing()"
                @keydown.esc.prevent="ctx.cancelEditing()"
                @blur="ctx.finishEditing()"
            />
        </div>

        <!-- 常规行 -->
        <div
            v-else
            :data-node-path="node.path"
            class="tree-node-row group flex h-[26px] cursor-pointer items-center gap-1.5 rounded-md pr-2 text-xs"
            :class="
                ctx.activePath.value === node.path
                    ? 'bg-zx-primary-tint font-medium text-zx-primary'
                    : ctx.isMultiSelected(node.path)
                      ? 'bg-slate-200/80 font-medium text-zx-text'
                      : 'text-zx-text-muted hover:bg-slate-200/60'
            "
            :style="rowStyle"
            :title="node.path"
            @click="onRowClick($event)"
            @contextmenu.prevent.stop="ctx.showMenu($event, node)"
        >
            <Loader2
                v-if="node.isLoading"
                class="h-3.5 w-3.5 flex-shrink-0 animate-spin text-zx-text-subtle"
            />
            <ChevronDown
                v-else-if="!node.is_file && node.isExpanded"
                class="h-3.5 w-3.5 flex-shrink-0 text-zx-text-subtle"
            />
            <ChevronRight
                v-else-if="!node.is_file"
                class="h-3.5 w-3.5 flex-shrink-0 text-zx-text-subtle"
            />
            <span v-else class="w-3.5 flex-shrink-0"></span>

            <FolderIcon
                v-if="!node.is_file"
                class="h-4 w-4 flex-shrink-0 text-zx-primary"
                :open="node.isExpanded"
            />
            <component
                :is="fileIcon.icon"
                v-else
                class="h-4 w-4 flex-shrink-0"
                :class="fileIcon.class"
            />
            <span class="truncate">{{ node.name }}</span>
        </div>

        <!-- 子级：常规展开或过滤命中链路 -->
        <template v-if="visibleChildren.length > 0 || isCreateTarget">
            <!-- 新建输入行渲染为目标文件夹的第一个子行 -->
            <div
                v-if="isCreateTarget"
                class="flex h-[26px] items-center gap-1.5 pr-2"
                :style="{ paddingLeft: `${(depth + 1) * 12 + 8}px` }"
            >
                <span class="w-3.5 flex-shrink-0"></span>
                <FileText class="h-4 w-4 flex-shrink-0 text-zx-text-subtle" />
                <input
                    ref="nameInputRef"
                    v-model="editingInput"
                    class="h-5 min-w-0 flex-1 rounded-md border border-zx-primary bg-white px-1.5 text-xs text-zx-text focus:outline-none"
                    :placeholder="editingPlaceholder"
                    @keydown.enter.prevent="ctx.commitEditing()"
                    @keydown.esc.prevent="ctx.cancelEditing()"
                    @blur="ctx.finishEditing()"
                />
            </div>

            <FileTreeNode
                v-for="child in visibleChildren"
                :key="child.path"
                :node="child"
                :depth="depth + 1"
            />
        </template>
</template>
