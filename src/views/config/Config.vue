<script setup lang="ts">
import { computed, onActivated, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useGlobalStore } from "@/store/global";
import {
    Activity,
    Bot,
    Compass,
    Cpu,
    HardDrive,
    Layers,
    Plus,
    RefreshCw,
    Save,
    Search,
    Server,
    Shield,
    Sliders,
    Sparkles,
    Wrench,
} from "lucide-vue-next";
import ZxButton from "@/components/zxcomponent/ZxButton.vue";
import { ZXMessageBox, ZXNotification } from "@/services/ui";
import { useAiStore } from "@/store/ai";
import { storeToRefs } from "pinia";
import { aiApi } from "@/utils/api-next";
import type {
    AiConfigData,
    DefaultModelsItem,
    ProviderItem,
} from "@/types/ai.types";

import ProviderCard from "./components/ProviderCard.vue";
import ProviderEditModal from "./components/ProviderEditModal.vue";
import DefaultRoutesTab from "./components/DefaultRoutesTab.vue";
import ContextSettingsTab from "./components/ContextSettingsTab.vue";
import EngineSettingsTab from "./components/EngineSettingsTab.vue";

const route = useRoute();
const globalStore = useGlobalStore();

// 顶级模块 (当前专注大模型配置)
type TopModule = "ai" | "system" | "storage";
const currentModule = ref<TopModule>((route.query.tab as TopModule) || "ai");

// 大模型配置内部子选项卡
type AiTabType = "providers" | "routes" | "context" | "engine";
const currentAiTab = ref<AiTabType>("providers");

// 所有大模型配置子选项卡
const ALL_AI_TABS = [
    { id: "providers" as const, label: "服务提供商", icon: Server },
    { id: "routes" as const, label: "任务默认路由", icon: Compass },
    { id: "context" as const, label: "对话上下文压缩", icon: Sparkles },
    { id: "engine" as const, label: "智能体与引擎", icon: Bot },
];

// 实验性功能未开启时仅展示“服务提供商”；在设置中开启实验性功能后解锁全部进阶选项卡
const aiTabs = computed(() => {
    if (globalStore.experimentalFeaturesEnabled) {
        return ALL_AI_TABS;
    }
    return ALL_AI_TABS.filter((tab) => tab.id === "providers");
});

// 若关闭实验性功能时停留在进阶子选项卡，自动回退至“服务提供商”
watch(
    () => globalStore.experimentalFeaturesEnabled,
    (enabled) => {
        if (!enabled && currentAiTab.value !== "providers") {
            currentAiTab.value = "providers";
        }
    },
);

// 弹窗状态
const editModalVisible = ref(false);
const editingProvider = ref<ProviderItem | null>(null);

// 搜索与过滤
const providerSearchQuery = ref("");

// 卡片就地测速状态缓存
const cardTestResults = ref<
    Record<
        string,
        {
            loading?: boolean;
            success?: boolean;
            latency_ms?: number | null;
            message?: string;
        }
    >
>({});

// AI 配置全局 Store
const aiStore = useAiStore();
const { loading, saving, aiConfig, availableModels } = storeToRefs(aiStore);
const { fetchConfig, saveConfig } = aiStore;

// 过滤后的服务商列表
const filteredProviders = computed(() => {
    const q = providerSearchQuery.value.trim().toLowerCase();
    if (!q) return aiConfig.value.providers;
    return aiConfig.value.providers.filter(
        (p) =>
            p.name.toLowerCase().includes(q) ||
            p.api_type.toLowerCase().includes(q) ||
            p.models.some((m) => m.model_name.toLowerCase().includes(q))
    );
});

// 全局保存配置
const handleSaveAll = () => saveConfig();

// 打开新建服务商弹窗
const openAddProviderModal = () => {
    editingProvider.value = null;
    editModalVisible.value = true;
};

// 打开配置服务商弹窗
const handleConfigureProvider = (provider: ProviderItem) => {
    editingProvider.value = JSON.parse(JSON.stringify(provider));
    editModalVisible.value = true;
};

// 保存提供商变更
const handleSaveProvider = (provider: ProviderItem) => {
    const idx = aiConfig.value.providers.findIndex(
        (p) => p.name.toLowerCase() === provider.name.toLowerCase()
    );
    if (idx >= 0) {
        aiConfig.value.providers[idx] = provider;
    } else {
        aiConfig.value.providers.push(provider);
    }

    ZXNotification({
        title: "服务商已暂存",
        message: `服务商 [${provider.name}] 配置已暂存，请记得点击右上角“保存全局配置”生效`,
        type: "🎉",
        position: "top-right",
    });
};

// 删除服务商
const handleDeleteProvider = (providerName: string) => {
    ZXMessageBox({
        title: "删除服务商",
        message: `确认删除服务提供商 [${providerName}] 吗？该提供商下的所有模型配置也将被移除。`,
        cancelButtonText: "取消",
        confirmButtonText: "确认删除",
        confirmButtonHoverBg: "bg-red-500",
        onConfirm: () => {
            aiConfig.value.providers = aiConfig.value.providers.filter(
                (p) => p.name !== providerName
            );
            ZXNotification({
                title: "已移除",
                message: `已移除服务商 [${providerName}]`,
                type: "🎉",
                position: "top-right",
            });
        },
    });
};

// 卡片就地连通性与耗时测速
const handleTestProvider = async (provider: ProviderItem) => {
    if (!provider.models || provider.models.length === 0) {
        ZXNotification({
            title: "无法测速",
            message: `渠道 [${provider.name}] 尚未配置模型，请点击【配置】添加模型`,
            type: "😭",
            position: "top-right",
        });
        return;
    }
    const targetModel = provider.models[0].model_name;
    const fullModelName = `${provider.name}/${targetModel}`;
    cardTestResults.value[provider.name] = { loading: true };
    try {
        const res = await aiApi.testModel(fullModelName);
        if (res.data) {
            cardTestResults.value[provider.name] = {
                loading: false,
                success: res.data.success,
                latency_ms: res.data.latency_ms,
                message: res.data.message,
            };
            if (res.data.success) {
                ZXNotification({
                    title: "测速成功",
                    message: `[${provider.name}] 响应时间: ${res.data.latency_ms} ms (${targetModel})`,
                    type: "🎉",
                    position: "top-right",
                });
            } else {
                ZXNotification({
                    title: "测速连接失败",
                    message: res.data.message || "未能连通大模型接口",
                    type: "😭",
                    position: "top-right",
                });
            }
        }
    } catch (e: any) {
        cardTestResults.value[provider.name] = {
            loading: false,
            success: false,
            message: e?.message || "网络请求异常",
        };
        ZXNotification({
            title: "测试请求异常",
            message: e?.message || "连通性检测接口请求失败",
            type: "😭",
            position: "top-right",
        });
    }
};

// 复制/克隆渠道
const handleCloneProvider = (provider: ProviderItem) => {
    let newName = `${provider.name}_copy`;
    let count = 1;
    while (aiConfig.value.providers.some((p) => p.name.toLowerCase() === newName.toLowerCase())) {
        count++;
        newName = `${provider.name}_copy${count}`;
    }
    const cloned: ProviderItem = JSON.parse(JSON.stringify(provider));
    cloned.name = newName;
    aiConfig.value.providers.push(cloned);
    ZXNotification({
        title: "渠道已复制",
        message: `已创建副本渠道 [${newName}]，请记得点击右上角“保存全局配置”生效`,
        type: "🎉",
        position: "top-right",
    });
};

// 切换启用/禁用状态
const handleToggleEnableProvider = (provider: ProviderItem, enabled: boolean) => {
    provider.enabled = enabled;
    ZXNotification({
        title: enabled ? "渠道已启用" : "渠道已禁用",
        message: `渠道 [${provider.name}] 状态已切换为${enabled ? "启用" : "禁用"}，记得点击右上角保存生效`,
        type: "🎉",
        position: "top-right",
    });
};

onMounted(() => {
    void fetchConfig();
});

onActivated(() => {
    void fetchConfig();
});
</script>

<template>
    <div class="flex h-full w-full flex-col gap-3 sm:gap-4 overflow-y-auto select-none">
        <!-- 模块 1：大模型配置 (当前主要区域) -->
        <div v-if="currentModule === 'ai'" class="flex flex-1 flex-col gap-3 min-h-0">
            <!-- 顶部工具栏与子选项卡导航条 -->
            <div
                class="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 rounded-3xl border border-slate-200 bg-white p-2.5 sm:p-3 shadow-sm shrink-0"
            >
                <!-- 左侧：子选项卡导航 -->
                <div class="flex items-center gap-1 overflow-x-auto p-0.5">
                    <button
                        v-for="tab in aiTabs"
                        :key="tab.id"
                        type="button"
                        class="flex items-center gap-1.5 rounded-2xl px-3.5 py-1.5 text-xs font-medium transition-all shrink-0 cursor-pointer"
                        :class="
                            currentAiTab === tab.id
                                ? 'bg-zx-primary text-[color:var(--zx-color-on-primary)] shadow-xs font-bold'
                                : 'text-zx-text-muted hover:bg-slate-100 hover:text-zx-text'
                        "
                        @click="currentAiTab = tab.id"
                    >
                        <component :is="tab.icon" class="h-3.5 w-3.5" />
                        <span>{{ tab.label }}</span>
                    </button>
                </div>

                <!-- 右侧：快捷动作与全局控制 -->
                <div class="flex flex-wrap items-center gap-2 pl-1">
                    <!-- 针对服务提供商选项卡的专有操作 -->
                    <template v-if="currentAiTab === 'providers'">
                        <!-- 搜索框 -->
                        <div
                            class="relative flex items-center rounded-full border border-slate-200 bg-slate-50/80 px-3 py-1 text-xs focus-within:border-zx-primary focus-within:bg-white"
                        >
                            <Search class="h-3.5 w-3.5 text-zx-text-subtle mr-1.5" />
                            <input
                                v-model="providerSearchQuery"
                                type="text"
                                placeholder="筛选服务商..."
                                class="bg-transparent text-xs text-zx-text outline-none placeholder:text-zx-text-subtle w-24 sm:w-32"
                            />
                        </div>

                        <!-- 添加服务商按钮 -->
                        <ZxButton
                            variant="primary"
                            size="sm"
                            @click="openAddProviderModal"
                        >
                            <Plus class="h-3.5 w-3.5 mr-1" />
                            添加服务商
                        </ZxButton>

                        <div class="hidden sm:block h-4 w-px bg-slate-200 mx-0.5"></div>
                    </template>

                    <!-- 刷新配置 -->
                    <ZxButton
                        variant="ghost"
                        size="sm"
                        circle
                        title="刷新配置"
                        :loading="loading"
                        @click="fetchConfig"
                    >
                        <RefreshCw class="h-3.5 w-3.5" />
                    </ZxButton>

                    <!-- 保存全局配置 -->
                    <ZxButton
                        variant="primary"
                        size="sm"
                        :loading="saving"
                        @click="handleSaveAll"
                    >
                        <Save class="h-3.5 w-3.5 mr-1" />
                        保存配置
                    </ZxButton>
                </div>
            </div>

            <!-- 子页面 1：服务提供商卡片网格 -->
            <div
                v-if="currentAiTab === 'providers'"
                class="flex-1 overflow-y-auto"
            >
                <div
                    class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4"
                >
                    <!-- 已配置的服务商卡片 (New API 风格) -->
                    <ProviderCard
                        v-for="provider in filteredProviders"
                        :key="provider.name"
                        :provider="provider"
                        :test-result="cardTestResults[provider.name]"
                        @configure="handleConfigureProvider"
                        @delete="handleDeleteProvider"
                        @test="handleTestProvider"
                        @clone="handleCloneProvider"
                        @toggle-enable="handleToggleEnableProvider"
                    />

                    <!-- 空状态提示 -->
                    <div
                        v-if="filteredProviders.length === 0"
                        class="col-span-full flex flex-col items-center justify-center py-16 text-center"
                    >
                        <p class="text-xs text-zx-text-muted">
                            {{ providerSearchQuery ? '未找到匹配的服务提供商' : '暂无已配置的服务提供商，请点击右上角「添加服务商」' }}
                        </p>
                    </div>
                </div>
            </div>

            <!-- 子页面 2：任务默认路由 -->
            <div
                v-else-if="currentAiTab === 'routes'"
                class="flex-1 overflow-y-auto"
            >
                <DefaultRoutesTab
                    :default-models="aiConfig.default_models"
                    :model-groups="aiConfig.model_groups"
                    :available-models="availableModels"
                />
            </div>

            <!-- 子页面 3：上下文设置 -->
            <div
                v-else-if="currentAiTab === 'context'"
                class="flex-1 overflow-y-auto"
            >
                <ContextSettingsTab
                    :context-settings="aiConfig.context_settings"
                    :available-models="availableModels"
                />
            </div>

            <!-- 子页面 4：智能体引擎与底层网络 -->
            <div
                v-else-if="currentAiTab === 'engine'"
                class="flex-1 overflow-y-auto"
            >
                <EngineSettingsTab
                    :agent-settings="aiConfig.agent_settings"
                    :client-settings="aiConfig.client_settings"
                    :debug-log="aiConfig.debug_log"
                    :sandbox="aiConfig.sandbox"
                    :provider-settings="aiConfig.provider_settings"
                />
            </div>
        </div>

        <!-- 模块 2：系统全局设置 (预留扩展) -->
        <div
            v-else-if="currentModule === 'system'"
            class="flex-1 flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-12 text-center"
        >
            <div
                class="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-400 mb-4"
            >
                <Sliders class="h-8 w-8" />
            </div>
            <h3 class="text-base font-bold text-zx-text-strong">
                系统通用与全局参数
            </h3>
            <p class="text-xs text-zx-text-muted mt-1.5 max-w-md">
                此处预留系统级机器人昵称、群聊行为阈值、网络全局代理与管理员安全选项。目前大模型核心配置请前往“大模型配置”标签页。
            </p>
        </div>

        <!-- 模块 3：存储与数据 (预留扩展) -->
        <div
            v-else-if="currentModule === 'storage'"
            class="flex-1 flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-12 text-center"
        >
            <div
                class="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-400 mb-4"
            >
                <HardDrive class="h-8 w-8" />
            </div>
            <h3 class="text-base font-bold text-zx-text-strong">
                存储路径与数据库配置
            </h3>
            <p class="text-xs text-zx-text-muted mt-1.5 max-w-md">
                此处预留 SQLite / PostgreSQL 数据库链接、资源缓存清理策略与持久化目录映射。
            </p>
        </div>

        <!-- 服务商配置弹窗 (点击卡片“配置”时弹出) -->
        <ProviderEditModal
            :visible="editModalVisible"
            :provider="editingProvider"
            @close="editModalVisible = false"
            @save="handleSaveProvider"
            @delete="handleDeleteProvider"
        />
    </div>
</template>
