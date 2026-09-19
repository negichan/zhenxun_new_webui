<script setup lang="ts">
/**
 * 全局搜索面板：关键词（可选正则/大小写）全文搜索工作区文本文件，
 * 结果按文件分组，点击命中打开文件并跳转到对应行列。
 */
import { computed, onMounted, ref } from "vue";
import { CaseSensitive, Loader2, Regex, Search, WholeWord } from "lucide-vue-next";
import { fileApi } from "@/utils/api-next";
import type { FileSearchGroup, FileSearchMatch, FileSearchResult } from "@/types/api-next.types";
import { getFileIcon } from "../fileIcons";
import type { Workbench } from "../useWorkbench";

const props = defineProps<{
    wb: Workbench;
}>();

const keyword = ref("");
const useRegex = ref(false);
const caseSensitive = ref(false);
const wholeWord = ref(false);
const isSearching = ref(false);
const result = ref<FileSearchResult | null>(null);
const errorMessage = ref("");

const rootPath = ref("");

onMounted(async () => {
    // 仅取根路径用于把结果路径显示为工作区相对路径
    try {
        const res = await fileApi.getFileList();
        if (res?.success && res.data) {
            rootPath.value = (res.data.current_path || "").replace(/\\/g, "/");
        }
    } catch {
        /* 相对路径显示失败无碍功能 */
    }
});

const searchSeq = ref(0);

const runSearch = async () => {
    const kw = keyword.value.trim();
    if (!kw || isSearching.value) return;
    const seq = ++searchSeq.value;
    isSearching.value = true;
    errorMessage.value = "";
    result.value = null;

    try {
        const res = await fileApi.searchFiles({
            keyword: kw,
            is_regex: useRegex.value,
            case_sensitive: caseSensitive.value,
            whole_word: wholeWord.value,
        });
        if (seq !== searchSeq.value) return;
        if (res?.success && res.data) {
            result.value = res.data;
        } else {
            errorMessage.value = res?.message || "搜索失败";
        }
    } catch (e) {
        if (seq !== searchSeq.value) return;
        errorMessage.value = (e as Error)?.message || "搜索失败";
    } finally {
        if (seq === searchSeq.value) isSearching.value = false;
    }
};

const relativePath = (p: string) => {
    const norm = p.replace(/\\/g, "/");
    if (rootPath.value && norm.startsWith(`${rootPath.value}/`)) {
        return norm.slice(rootPath.value.length + 1);
    }
    return norm;
};

/** 命中在展示切片中的 0 起位置 */
const hitStart = (m: FileSearchMatch) =>
    Math.max(0, m.column - m.context_offset - 1);

const splitMatch = (m: FileSearchMatch) => {
    const start = hitStart(m);
    return {
        before: m.line_text.slice(0, start),
        hit: m.line_text.slice(start, start + m.length),
        after: m.line_text.slice(start + m.length),
    };
};

const jump = async (group: FileSearchGroup, match: FileSearchMatch) => {
    const tab = await props.wb.openFile(group.path, group.name);
    if (!tab) return;
    props.wb.activate(tab.id);
    props.wb.revealLocation(match.line_number, match.column, match.length);
};

const toggle = (key: "useRegex" | "caseSensitive" | "wholeWord") => {
    if (key === "useRegex") useRegex.value = !useRegex.value;
    else if (key === "caseSensitive") caseSensitive.value = !caseSensitive.value;
    else wholeWord.value = !wholeWord.value;
};

const totalCount = computed(() => result.value?.total_matches ?? 0);
</script>

<template>
    <div class="flex h-full w-full select-none flex-col overflow-hidden">
        <!-- 标题行（与资源管理器标题对齐） -->
        <div
            class="flex h-8 flex-shrink-0 items-center px-3 text-[11px] font-semibold tracking-wider text-zx-text-muted uppercase"
        >
            <span>全局搜索</span>
        </div>

        <!-- 搜索输入 + 开关 -->
        <div class="px-2.5 py-2">
            <div
                class="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 shadow-xs"
            >
                <Search class="h-3 w-3 flex-shrink-0 text-zx-text-subtle" />
                <input
                    v-model="keyword"
                    type="text"
                    placeholder="搜索工作区内容..."
                    class="w-full bg-transparent text-[11px] text-zx-text placeholder:text-zx-text-subtle focus:outline-none"
                    @keydown.enter.prevent="runSearch"
                />
                <button
                    class="flex h-5 w-5 cursor-pointer items-center justify-center rounded transition-colors"
                    :class="wholeWord ? 'bg-zx-primary-soft text-zx-primary' : 'text-zx-text-subtle hover:text-zx-text-muted'"
                    title="匹配整个单词"
                    type="button"
                    @click="toggle('wholeWord')"
                >
                    <WholeWord class="h-3.5 w-3.5" />
                </button>
                <button
                    class="flex h-5 w-5 cursor-pointer items-center justify-center rounded font-bold transition-colors"
                    :class="caseSensitive ? 'bg-zx-primary-soft text-zx-primary' : 'text-zx-text-subtle hover:text-zx-text-muted'"
                    title="区分大小写"
                    type="button"
                    @click="toggle('caseSensitive')"
                >
                    <CaseSensitive class="h-3.5 w-3.5" />
                </button>
                <button
                    class="flex h-5 w-5 cursor-pointer items-center justify-center rounded transition-colors"
                    :class="useRegex ? 'bg-zx-primary-soft text-zx-primary' : 'text-zx-text-subtle hover:text-zx-text-muted'"
                    title="正则表达式"
                    type="button"
                    @click="toggle('useRegex')"
                >
                    <Regex class="h-3.5 w-3.5" />
                </button>
            </div>
        </div>

        <!-- 结果 -->
        <div class="min-h-0 flex-1 overflow-y-auto py-1 text-xs">
            <div
                v-if="isSearching"
                class="flex items-center justify-center gap-2 py-8 text-zx-text-subtle"
            >
                <Loader2 class="h-4 w-4 animate-spin" />
            </div>

            <div v-else-if="errorMessage" class="px-3 py-4 text-xs text-zx-danger">
                {{ errorMessage }}
            </div>

            <div
                v-else-if="result"
                class="flex flex-col"
            >
                <div v-if="result.results.length" class="mb-1 px-3 text-[10px] text-zx-text-subtle">
                    命中 {{ totalCount }} 处
                    <template v-if="result.truncated">（已截断）</template>
                </div>

                <div v-for="group in result.results" :key="group.path" class="flex flex-col">
                    <!-- 文件头 -->
                    <div
                        class="flex h-[26px] items-center gap-1.5 px-2 text-xs font-medium text-zx-text-muted"
                        :title="group.path"
                    >
                        <component
                            :is="getFileIcon(group.name).icon"
                            class="h-4 w-4 flex-shrink-0"
                            :class="getFileIcon(group.name).class"
                        />
                        <span class="truncate">{{ group.name }}</span>
                        <span class="ml-auto flex-shrink-0 rounded-full bg-slate-200/80 px-1.5 text-[10px] text-zx-text-muted">
                            {{ group.matches.length }}
                        </span>
                    </div>
                    <!-- 命中行 -->
                    <button
                        v-for="(match, idx) in group.matches"
                        :key="idx"
                        class="flex h-[24px] cursor-pointer items-center gap-2 overflow-hidden pl-8 pr-2 text-left text-[11px] text-zx-text-muted hover:bg-slate-200/60"
                        type="button"
                        @click="jump(group, match)"
                    >
                        <span class="w-8 flex-shrink-0 text-right text-zx-text-subtle">{{ match.line_number }}</span>
                        <span class="truncate font-mono">
                            {{ splitMatch(match).before }}<mark class="rounded-sm bg-zx-primary-soft px-0.5 text-zx-primary">{{ splitMatch(match).hit }}</mark>{{ splitMatch(match).after }}
                        </span>
                    </button>
                </div>

                <p
                    v-if="result.results.length === 0"
                    class="px-3 py-4 text-center text-zx-text-subtle"
                >
                    无匹配结果
                </p>
            </div>
        </div>
    </div>
</template>
