<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import {
    Check,
    CloudDownload,
    ExternalLink,
    Globe,
    Layers,
    Loader2,
    RefreshCw,
    Search,
    Server,
    Sparkles,
    Wrench,
    X,
    Zap,
} from "lucide-vue-next";
import ZxButton from "@/components/zxcomponent/ZxButton.vue";
import ZxTag from "@/components/zxcomponent/ZxTag.vue";
import ProviderIcon from "./ProviderIcon.vue";
import { ZXMessageBox, ZXNotification } from "@/services/ui";
import { aiApi } from "@/utils/api-next";
import type {
    ModelsDevCatalogResponse,
    ModelsDevModelItem,
    ModelsDevProviderItem,
} from "@/types/ai.types";
import { getProtocolMeta } from "@/utils/ai-protocols";

const props = defineProps<{
    modelValue: boolean;
}>();

const emit = defineEmits<{
    (e: "update:modelValue", val: boolean): void;
    (e: "imported"): void;
}>();

// 目录与加载状态
const loading = ref(false);
const refreshing = ref(false);
const importing = ref(false);
const catalog = ref<ModelsDevCatalogResponse>({
    total_providers: 0,
    total_models: 0,
    cached_at: null,
    providers: [],
});

// 筛选与交互状态
const searchQuery = ref("");
const selectedProviderId = ref<string>("deepseek");
const selectedModelIds = ref<Set<string>>(new Set());

// 加载本地/服务端缓存数据
const loadCatalog = async (silent = false) => {
    if (!silent) loading.value = true;
    try {
        const res = await aiApi.getModelsDevCatalog();
        if (res.data) {
            catalog.value = res.data;
            if (!selectedProviderId.value && catalog.value.providers.length > 0) {
                selectedProviderId.value = catalog.value.providers[0].id;
            }
        }
    } catch (e: any) {
        ZXNotification({
            title: "加载失败",
            message: `加载在线模型库失败：${e?.message || e}`,
            type: "😭",
            position: "top-right",
        });
    } finally {
        loading.value = false;
    }
};

// 从远程强制刷新
const handleRefreshRemote = async () => {
    refreshing.value = true;
    try {
        const res = await aiApi.refreshModelsDevCatalog();
        if (res.data) {
            catalog.value = res.data;
            ZXNotification({
                title: "刷新成功",
                message: `成功刷新模型库！共拉取 ${res.data.total_providers} 家服务商、${res.data.total_models} 个模型`,
                type: "🎉",
                position: "top-right",
            });
        }
    } catch (e: any) {
        ZXNotification({
            title: "刷新失败",
            message: `刷新模型库失败：${e?.message || e}`,
            type: "😭",
            position: "top-right",
        });
    } finally {
        refreshing.value = false;
    }
};

// 过滤后的提供商列表
const filteredProviders = computed(() => {
    const q = searchQuery.value.trim().toLowerCase();
    if (!q) return catalog.value.providers;
    return catalog.value.providers.filter(
        (p) =>
            p.name.toLowerCase().includes(q) ||
            p.id.toLowerCase().includes(q) ||
            p.models.some(
                (m) =>
                    m.id.toLowerCase().includes(q) ||
                    m.name.toLowerCase().includes(q)
            )
    );
});

// 当前选中的提供商详情
const activeProvider = computed<ModelsDevProviderItem | undefined>(() => {
    return (
        catalog.value.providers.find(
            (p) => p.id === selectedProviderId.value
        ) || filteredProviders.value[0]
    );
});

// 当前展示的模型列表（支持搜索词高亮过滤）
const activeModels = computed<ModelsDevModelItem[]>(() => {
    if (!activeProvider.value) return [];
    const q = searchQuery.value.trim().toLowerCase();
    if (!q) return activeProvider.value.models;
    return activeProvider.value.models.filter(
        (m) =>
            m.id.toLowerCase().includes(q) ||
            m.name.toLowerCase().includes(q) ||
            (m.description && m.description.toLowerCase().includes(q))
    );
});

// 切换提供商
const selectProvider = (id: string) => {
    selectedProviderId.value = id;
    selectedModelIds.value.clear();
};

// 切换单模型选中状态
const toggleModelSelect = (id: string) => {
    if (selectedModelIds.value.has(id)) {
        selectedModelIds.value.delete(id);
    } else {
        selectedModelIds.value.add(id);
    }
};

// 全选/反选当前提供商模型
const isAllSelected = computed(() => {
    if (!activeModels.value.length) return false;
    return activeModels.value.every((m) => selectedModelIds.value.has(m.id));
});

const toggleSelectAll = () => {
    if (isAllSelected.value) {
        activeModels.value.forEach((m) => selectedModelIds.value.delete(m.id));
    } else {
        activeModels.value.forEach((m) => selectedModelIds.value.add(m.id));
    }
};

// 执行导入当前服务商和所选模型
const handleImport = async () => {
    if (!activeProvider.value) return;
    const p = activeProvider.value;
    const count = selectedModelIds.value.size;
    const modelNames = count > 0 ? Array.from(selectedModelIds.value) : [];

    const confirmMsg =
        count > 0
            ? `确定将服务商「${p.name}」及其选中的 ${count} 个模型导入到本地配置中吗？`
            : `当前未勾选特定模型，是否将服务商「${p.name}」的全部 ${p.models.length} 个模型完整导入？`;

    ZXMessageBox({
        title: "导入服务商模型",
        message: confirmMsg,
        confirmButtonText: "确认导入",
        cancelButtonText: "取消",
        onConfirm: async () => {
            importing.value = true;
            try {
                await aiApi.importModelsDevProvider({
                    provider_id: p.id,
                    provider_name: p.name,
                    api_base: p.api_base,
                    api_type: p.api_type,
                    selected_model_names: modelNames,
                });
                ZXNotification({
                    title: "导入成功",
                    message: `服务商「${p.name}」已成功导入，并在 models.json 与主配置中同步！`,
                    type: "🎉",
                    position: "top-right",
                });
                emit("imported");
                emit("update:modelValue", false);
            } catch (e: any) {
                ZXNotification({
                    title: "导入失败",
                    message: `导入失败：${e.message || e}`,
                    type: "😭",
                    position: "top-right",
                });
            } finally {
                importing.value = false;
            }
        },
    });
};

// 格式化数字 Token 简写
const formatTokens = (val?: number | null) => {
    if (!val) return null;
    if (val >= 1000000) return `${(val / 1000000).toFixed(val % 1000000 === 0 ? 0 : 1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k`;
    return `${val}`;
};

// 弹窗打开时加载
watch(
    () => props.modelValue,
    (val) => {
        if (val && !catalog.value.total_providers) {
            loadCatalog();
        }
    }
);

onMounted(() => {
    if (props.modelValue) {
        loadCatalog();
    }
});
</script>

<template>
    <Teleport to="body">
        <Transition name="modal-jelly" :duration="{ enter: 500, leave: 250 }">
            <div
                v-if="modelValue"
                class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
            >
                <!-- 背景遮罩 -->
                <div
                    class="glass-overlay absolute inset-0 backdrop-blur-md bg-black/40"
                    @click="emit('update:modelValue', false)"
                />

                <!-- 主弹窗容器 -->
                <div
                    class="relative flex flex-col w-full max-w-6xl h-[88vh] max-h-[920px] rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden z-10"
                >
                    <!-- 顶部标题栏 -->
                    <div
                        class="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0 bg-slate-50/50"
                    >
                        <div class="flex items-center gap-3">
                            <div
                                class="flex h-10 w-10 items-center justify-center rounded-2xl bg-zx-primary-soft/30 text-zx-primary"
                            >
                                <Globe class="h-5 w-5" />
                            </div>
                            <div>
                                <div class="flex items-center gap-2">
                                    <h2 class="text-base font-bold text-zx-text-strong">
                                        在线模型库 (models.dev)
                                    </h2>
                                    <ZxTag variant="purple">
                                        {{ catalog.total_providers }} 服务商 · {{ catalog.total_models }} 模型
                                    </ZxTag>
                                </div>
                                <p class="text-xs text-zx-text-muted mt-0.5">
                                    实时索引全球大模型规范，一键引入至真寻多模型路由系统
                                    <span v-if="catalog.cached_at" class="ml-2 opacity-75">
                                        (缓存于 {{ catalog.cached_at }})
                                    </span>
                                </p>
                            </div>
                        </div>

                        <div class="flex items-center gap-2">
                            <ZxButton
                                variant="outline"
                                size="sm"
                                :disabled="refreshing || loading"
                                @click="handleRefreshRemote"
                            >
                                <RefreshCw
                                    class="h-3.5 w-3.5 mr-1.5"
                                    :class="{ 'animate-spin': refreshing }"
                                />
                                {{ refreshing ? "拉取中..." : "在线同步" }}
                            </ZxButton>
                            <ZxButton
                                variant="ghost"
                                circle
                                size="sm"
                                @click="emit('update:modelValue', false)"
                            >
                                <X class="h-4 w-4" />
                            </ZxButton>
                        </div>
                    </div>

                    <!-- 搜索工具条 -->
                    <div
                        class="flex items-center justify-between px-6 py-2.5 border-b border-slate-100 shrink-0 bg-white"
                    >
                        <div
                            class="relative flex-1 max-w-md flex items-center rounded-full border border-slate-200 bg-slate-50/70 px-3 py-1.5 focus-within:bg-white focus-within:border-zx-primary transition-all"
                        >
                            <Search class="h-4 w-4 text-zx-text-subtle mr-2 shrink-0" />
                            <input
                                v-model="searchQuery"
                                type="text"
                                placeholder="搜索服务商 (如 Google, DeepSeek, Groq) 或模型名称..."
                                class="w-full bg-transparent text-xs text-zx-text outline-none placeholder:text-zx-text-subtle"
                            />
                            <button
                                v-if="searchQuery"
                                class="text-zx-text-subtle hover:text-zx-text cursor-pointer"
                                @click="searchQuery = ''"
                            >
                                <X class="h-3.5 w-3.5" />
                            </button>
                        </div>

                        <div class="text-xs text-zx-text-muted hidden sm:flex items-center gap-1.5">
                            <span class="inline-block w-2 h-2 rounded-full bg-green-500" />
                            <span>协议智能转译：OpenAI 兼容 / Gemini / Anthropic / OpenRouter</span>
                        </div>
                    </div>

                    <!-- 主工作区：左侧提供商列表 + 右侧模型详情 -->
                    <div class="flex flex-1 min-h-0 overflow-hidden">
                        <!-- 左侧栏：服务商列表 -->
                        <div
                            class="w-72 sm:w-80 border-r border-slate-100 flex flex-col bg-slate-50/30 shrink-0 overflow-hidden"
                        >
                            <div class="p-2.5 border-b border-slate-100 flex items-center justify-between text-xs text-zx-text-muted font-medium">
                                <span>服务提供商 ({{ filteredProviders.length }})</span>
                                <span class="text-[10px] text-zx-text-subtle">按主流度智能排序</span>
                            </div>

                            <div
                                v-if="loading"
                                class="flex-1 flex flex-col items-center justify-center p-8 text-zx-text-muted"
                            >
                                <Loader2 class="h-6 w-6 animate-spin mb-2 text-zx-primary" />
                                <span class="text-xs">加载模型库中...</span>
                            </div>

                            <div
                                v-else-if="filteredProviders.length === 0"
                                class="flex-1 flex flex-col items-center justify-center p-6 text-center text-zx-text-muted text-xs"
                            >
                                未找到匹配的服务商
                            </div>

                            <div
                                v-else
                                class="flex-1 overflow-y-auto divide-y divide-slate-100/60 p-2 space-y-1"
                            >
                                <button
                                    v-for="p in filteredProviders"
                                    :key="p.id"
                                    type="button"
                                    class="w-full text-left p-2.5 rounded-2xl transition-all flex items-center justify-between cursor-pointer"
                                    :class="
                                        selectedProviderId === p.id
                                            ? 'bg-zx-primary-soft/40 border border-zx-primary/40 shadow-xs'
                                            : 'hover:bg-slate-100/70 border border-transparent'
                                    "
                                    @click="selectProvider(p.id)"
                                >
                                    <div class="flex items-center gap-2.5 min-w-0 pr-2">
                                        <div
                                            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200/80 p-1 shadow-2xs"
                                        >
                                            <ProviderIcon
                                                :name="p.name"
                                                :api-type="p.api_type"
                                                size-class="h-4 w-4"
                                            />
                                        </div>
                                        <div class="min-w-0">
                                            <div class="flex items-center gap-1.5">
                                                <span
                                                    class="font-semibold text-xs truncate"
                                                    :class="
                                                        selectedProviderId === p.id
                                                            ? 'text-zx-primary font-bold'
                                                            : 'text-zx-text-strong'
                                                    "
                                                >
                                                    {{ p.name }}
                                                </span>
                                            </div>
                                        <div class="flex items-center gap-1.5 mt-1">
                                            <span
                                                class="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200/60 text-zx-text-muted font-medium"
                                            >
                                                {{ getProtocolMeta(p.api_type).label }}
                                            </span>
                                            <span
                                                v-if="p.models.some((m) => m.reasoning)"
                                                class="text-[10px] text-purple-600 font-medium flex items-center"
                                            >
                                                <Sparkles class="h-2.5 w-2.5 mr-0.5" />思考
                                            </span>
                                        </div>
                                    </div>
                                    </div>
                                    <ZxTag variant="info" class="shrink-0 text-[10px] scale-90">
                                        {{ p.models_count }}
                                    </ZxTag>
                                </button>
                            </div>
                        </div>

                        <!-- 右侧栏：服务商详情与模型列表 -->
                        <div
                            v-if="activeProvider"
                            class="flex-1 flex flex-col min-w-0 bg-white overflow-hidden"
                        >
                            <!-- 服务商元数据头部 -->
                            <div
                                class="p-5 border-b border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0"
                            >
                                <div class="flex items-start gap-3">
                                    <div
                                        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white border border-slate-200/80 p-1.5 shadow-2xs"
                                    >
                                        <ProviderIcon
                                            :name="activeProvider.name"
                                            :api-type="activeProvider.api_type"
                                            size-class="h-6 w-6"
                                        />
                                    </div>
                                    <div>
                                        <div class="flex items-center gap-2">
                                            <h3 class="text-base font-bold text-zx-text-strong">
                                                {{ activeProvider.name }}
                                            </h3>
                                        <ZxTag variant="primary">
                                            协议：{{ getProtocolMeta(activeProvider.api_type).label }}
                                        </ZxTag>
                                        <ZxTag v-if="activeProvider.npm" variant="neutral">
                                            {{ activeProvider.npm }}
                                        </ZxTag>
                                    </div>
                                    <div class="flex items-center gap-4 mt-2 text-xs text-zx-text-muted">
                                        <span v-if="activeProvider.api_base" class="truncate font-mono">
                                            Base URL: {{ activeProvider.api_base }}
                                        </span>
                                        <span v-else class="text-slate-400 italic">
                                            使用协议官方默认 API 终结点
                                        </span>
                                        <a
                                            v-if="activeProvider.doc"
                                            :href="activeProvider.doc"
                                            target="_blank"
                                            class="text-zx-primary hover:underline flex items-center gap-1 shrink-0"
                                        >
                                            <ExternalLink class="h-3 w-3" />
                                            官方文档与定价
                                        </a>
                                    </div>
                                </div>
                            </div>

                                <!-- 全选当前提供商模型按钮 -->
                                <div class="flex items-center gap-2 shrink-0">
                                    <ZxButton
                                        variant="outline"
                                        size="sm"
                                        @click="toggleSelectAll"
                                    >
                                        <Check
                                            class="h-3.5 w-3.5 mr-1"
                                            :class="isAllSelected ? 'text-zx-primary font-bold' : ''"
                                        />
                                        {{ isAllSelected ? "取消全选" : "全选本组模型" }}
                                    </ZxButton>
                                </div>
                            </div>

                            <!-- 模型列表卡片流 -->
                            <div
                                class="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-3.5"
                            >
                                <div
                                    v-for="m in activeModels"
                                    :key="m.id"
                                    class="p-3.5 rounded-2xl border transition-all flex flex-col justify-between cursor-pointer relative select-none"
                                    :class="
                                        selectedModelIds.has(m.id)
                                            ? 'border-zx-primary bg-zx-primary-soft/10 shadow-xs'
                                            : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                                    "
                                    @click="toggleModelSelect(m.id)"
                                >
                                    <!-- 顶部标题与复选勾选 -->
                                    <div>
                                        <div class="flex items-start justify-between gap-2">
                                            <div class="min-w-0">
                                                <div class="font-bold text-xs text-zx-text-strong truncate">
                                                    {{ m.name }}
                                                </div>
                                                <div class="text-[11px] font-mono text-zx-text-muted truncate mt-0.5">
                                                    {{ m.id }}
                                                </div>
                                            </div>

                                            <!-- 勾选圈 -->
                                            <div
                                                class="flex h-5 w-5 items-center justify-center rounded-lg border transition-all shrink-0 mt-0.5"
                                                :class="
                                                    selectedModelIds.has(m.id)
                                                        ? 'border-zx-primary bg-zx-primary text-white'
                                                        : 'border-slate-300 bg-white'
                                                "
                                            >
                                                <Check
                                                    v-if="selectedModelIds.has(m.id)"
                                                    class="h-3.5 w-3.5"
                                                />
                                            </div>
                                        </div>

                                        <!-- 描述 -->
                                        <p
                                            v-if="m.description"
                                            class="text-[11px] text-zx-text-subtle line-clamp-2 mt-2 leading-relaxed"
                                        >
                                            {{ m.description }}
                                        </p>
                                    </div>

                                    <!-- 底部属性 Chip -->
                                    <div class="flex flex-wrap items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-100/70">
                                        <span
                                            v-if="m.context_limit"
                                            class="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-zx-text-muted font-medium"
                                            title="上下文总窗口限制"
                                        >
                                            Context: {{ formatTokens(m.context_limit) }}
                                        </span>
                                        <span
                                            v-if="m.max_output_tokens"
                                            class="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-zx-text-muted font-medium"
                                            title="最大生成 Token"
                                        >
                                            Output: {{ formatTokens(m.max_output_tokens) }}
                                        </span>
                                        <ZxTag
                                            v-if="m.reasoning"
                                            variant="purple"
                                            class="scale-90 origin-left"
                                        >
                                            思考推理
                                        </ZxTag>
                                        <ZxTag
                                            v-if="m.tool_call"
                                            variant="cyan"
                                            class="scale-90 origin-left"
                                        >
                                            函数调用
                                        </ZxTag>
                                    </div>
                                </div>
                            </div>

                            <!-- 底部操作底栏 -->
                            <div
                                class="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0"
                            >
                                <div class="text-xs text-zx-text-muted">
                                    <span v-if="selectedModelIds.size > 0">
                                        已选中
                                        <strong class="text-zx-primary font-bold">
                                            {{ selectedModelIds.size }}
                                        </strong>
                                        个模型
                                    </span>
                                    <span v-else>
                                        未选择模型时将
                                        <strong>一键导入该服务商全部 {{ activeProvider.models.length }} 个模型</strong>
                                    </span>
                                </div>

                                <div class="flex items-center gap-3">
                                    <ZxButton
                                        variant="ghost"
                                        size="sm"
                                        @click="emit('update:modelValue', false)"
                                    >
                                        取消
                                    </ZxButton>
                                    <ZxButton
                                        variant="primary"
                                        size="sm"
                                        :disabled="importing"
                                        @click="handleImport"
                                    >
                                        <CloudDownload
                                            class="h-4 w-4 mr-1.5"
                                            :class="{ 'animate-bounce': importing }"
                                        />
                                        {{ importing ? "导入中..." : "导入至当前配置" }}
                                    </ZxButton>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>
