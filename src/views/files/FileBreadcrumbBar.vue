<script setup lang="ts">
import { nextTick, ref } from "vue";
import { ArrowLeft, ChevronRight, Home, Search } from "lucide-vue-next";

const props = defineProps<{
    currentPath: string;
    pathSegments: string[];
    searchQuery: string;
}>();

const emit = defineEmits<{
    back: [];
    home: [];
    navigate: [path: string];
    "update:searchQuery": [value: string];
}>();

// Windows 式可编辑路径：点击面包屑空白处进入编辑，回车跳转、Esc/失焦取消
const editingPath = ref(false);
const pathInput = ref("");
const pathInputRef = ref<HTMLInputElement | null>(null);

const startEdit = () => {
    pathInput.value = props.currentPath;
    editingPath.value = true;
    nextTick(() => {
        pathInputRef.value?.focus();
        pathInputRef.value?.select();
    });
};

const cancelEdit = () => {
    editingPath.value = false;
};

const commitEdit = () => {
    const target = pathInput.value.trim();
    editingPath.value = false;
    if (target && target !== props.currentPath) {
        emit("navigate", target);
    }
};
</script>

<template>
    <div
        class="rounded-3xl border-1 border-slate-200 bg-white p-3 shadow-sm sm:p-4"
    >
        <div class="scrollbar-hide flex items-center gap-2 overflow-x-auto">
            <button
                :disabled="!currentPath"
                title="返回上一层"
                class="btn-touch flex-shrink-0 cursor-pointer rounded-2xl p-1.5 text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-30"
                @click="emit('back')"
            >
                <ArrowLeft class="h-4 w-4" />
            </button>
            <button
                title="回到根目录"
                class="btn-touch flex-shrink-0 cursor-pointer rounded-2xl p-1.5 text-gray-500 transition-colors hover:bg-gray-100"
                @click="emit('home')"
            >
                <Home class="h-4 w-4" />
            </button>

            <!-- 路径编辑模式（Windows 式：点空白处进入，回车跳转） -->
            <div
                v-if="editingPath"
                class="flex min-w-0 flex-1 items-center"
                @click.stop
            >
                <input
                    ref="pathInputRef"
                    v-model="pathInput"
                    class="min-w-0 flex-1 rounded-2xl border border-zx-primary bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none"
                    placeholder="输入路径后回车，如 data/plugins"
                    type="text"
                    @keydown.enter.prevent="commitEdit"
                    @keydown.esc.prevent="cancelEdit"
                    @blur="cancelEdit"
                />
            </div>

            <!-- 面包屑（每一级独立胶囊；点击空白处进入路径编辑） -->
            <div
                v-else
                class="scrollbar-hide flex min-w-0 flex-1 cursor-text items-center gap-1.5 overflow-x-auto text-sm"
                @click="startEdit"
            >
                <template v-for="(segment, index) in pathSegments" :key="index">
                    <ChevronRight class="h-3.5 w-3.5 flex-shrink-0 text-gray-500" />
                    <button
                        class="max-w-[140px] flex-shrink-0 truncate rounded-lg bg-[var(--zx-color-surface-muted)] px-2.5 py-1 text-[13px] font-medium text-[var(--zx-color-text)] transition-colors hover:bg-[var(--zx-color-primary-tint)] hover:text-zx-primary"
                        :title="segment"
                        @click.stop="
                            emit(
                                'navigate',
                                pathSegments.slice(0, index + 1).join('/'),
                            )
                        "
                    >
                        {{ segment }}
                    </button>
                </template>
                <span
                    v-if="!pathSegments.length"
                    class="px-2 py-1 text-gray-400"
                >
                    点击这里输入路径
                </span>
            </div>

            <div class="relative flex-shrink-0">
                <input
                    :value="searchQuery"
                    class="w-32 rounded-2xl border border-gray-200 px-3 py-1.5 pl-9 text-sm transition-colors focus:outline-none sm:w-48"
                    placeholder="搜索..."
                    type="text"
                    @input="
                        emit(
                            'update:searchQuery',
                            ($event.target as HTMLInputElement).value,
                        )
                    "
                />
                <Search
                    class="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-gray-400"
                />
            </div>
        </div>
    </div>
</template>
