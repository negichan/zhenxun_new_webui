<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
    Activity,
    Check,
    Cpu,
    Eye,
    EyeOff,
    Key,
    Loader2,
    Play,
    Plus,
    Server,
    Sliders,
    Sparkles,
    Trash2,
    X,
    Zap,
} from "lucide-vue-next";
import { modalJelly } from "@/composables/useGsapTransition";
import ZxButton from "@/components/zxcomponent/ZxButton.vue";
import ZxSwitch from "@/components/zxcomponent/ZxSwitch.vue";
import ZxTag from "@/components/zxcomponent/ZxTag.vue";
import ProviderIcon from "./ProviderIcon.vue";
import { ZXMessageBox, ZXNotification } from "@/services/ui";
import { aiApi } from "@/utils/api-next";
import type {
    ModelDetailItem,
    ModelsDevProviderItem,
    ProviderItem,
} from "@/types/ai.types";
import { COMMON_PROTOCOLS } from "@/utils/ai-protocols";

interface Props {
    visible: boolean;
    provider?: ProviderItem | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
    (e: "close"): void;
    (e: "save", provider: ProviderItem): void;
    (e: "delete", providerName: string): void;
}>();

// models.dev 在线服务商目录
const modelsDevCatalog = ref<ModelsDevProviderItem[]>([]);
const modelsDevSearch = ref("");
const showModelsDevDropdown = ref(false);
const showKeyPlain = ref(false);

// 模型测速状态
const modelTestState = ref<
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

const loadModelsDevCatalog = async () => {
    if (modelsDevCatalog.value.length > 0) return;
    try {
        const res = await aiApi.getModelsDevCatalog();
        if (res.data?.providers) {
            modelsDevCatalog.value = res.data.providers;
        }
    } catch {
        // 忽略静默失败
    }
};

const filteredModelsDevProviders = computed(() => {
    const q = modelsDevSearch.value.trim().toLowerCase();
    if (!q) return modelsDevCatalog.value.slice(0, 15);
    return modelsDevCatalog.value
        .filter(
            (p) =>
                p.name.toLowerCase().includes(q) ||
                p.id.toLowerCase().includes(q)
        )
        .slice(0, 20);
});

const applyModelsDevProvider = (p: ModelsDevProviderItem) => {
    form.value.name = p.name;
    form.value.api_type = p.api_type;
    form.value.api_base = p.api_base || "";
    form.value.models = p.models.map((m) => ({
        model_name: m.id,
        temperature: 0.7,
        max_tokens: m.max_output_tokens,
        max_output_tokens: m.max_output_tokens,
        reasoning_effort: m.reasoning ? "medium" : null,
    }));
    modelsDevSearch.value = p.name;
    showModelsDevDropdown.value = false;
};

// 尝试从 models.dev 自动补全当前厂商的模型
const matchedOnlineProvider = computed(() => {
    const name = form.value.name.trim().toLowerCase();
    if (!name) return null;
    return modelsDevCatalog.value.find(
        (p) => p.name.toLowerCase() === name || p.id.toLowerCase() === name
    );
});

const syncModelsFromOnline = () => {
    if (!matchedOnlineProvider.value) return;
    const p = matchedOnlineProvider.value;
    const existing = new Set(
        form.value.models.map((m) => m.model_name.toLowerCase())
    );
    let addedCount = 0;
    for (const m of p.models) {
        if (!existing.has(m.id.toLowerCase())) {
            form.value.models.push({
                model_name: m.id,
                temperature: 0.7,
                max_tokens: m.max_output_tokens,
                max_output_tokens: m.max_output_tokens,
                reasoning_effort: m.reasoning ? "medium" : null,
            });
            addedCount++;
        }
    }
    if (addedCount > 0) {
        ZXNotification({
            title: "同步成功",
            message: `已从 models.dev 追加 ${addedCount} 个最新官方模型`,
            type: "🎉",
            position: "top-right",
        });
    } else {
        ZXNotification({
            title: "提示",
            message: "当前模型列表已包含该厂商全部官方模型",
            type: "🎉",
            position: "top-right",
        });
    }
};

// 常用厂商快捷预设
interface ProviderPreset {
    label: string;
    name: string;
    api_type: string;
    api_base: string;
    default_models: string[];
}

const PRESETS: ProviderPreset[] = [
    {
        label: "Sub2API",
        name: "Sub2API",
        api_type: "openai",
        api_base: "https://your-sub2api-domain.com/v1",
        default_models: ["gpt-4o", "claude-3-5-sonnet", "claude-3-7-sonnet"],
    },
    {
        label: "New API",
        name: "New API",
        api_type: "openai",
        api_base: "https://your-new-api.com/v1",
        default_models: ["gpt-4o", "claude-3-5-sonnet", "deepseek-chat"],
    },
    {
        label: "One API",
        name: "One API",
        api_type: "openai",
        api_base: "https://your-one-api.com/v1",
        default_models: ["gpt-4o", "claude-3-5-sonnet"],
    },
    {
        label: "302.AI",
        name: "302.AI",
        api_type: "openai",
        api_base: "https://api.302.ai/v1",
        default_models: ["gpt-4o", "claude-3-5-sonnet"],
    },
    {
        label: "DeepSeek",
        name: "DeepSeek",
        api_type: "openai",
        api_base: "https://api.deepseek.com",
        default_models: ["deepseek-chat", "deepseek-reasoner"],
    },
    {
        label: "Google Gemini",
        name: "Gemini",
        api_type: "gemini",
        api_base: "https://generativelanguage.googleapis.com",
        default_models: [
            "gemini-2.5-flash",
            "gemini-2.5-pro",
            "gemini-2.5-flash-lite",
            "gemini-3.5-flash",
            "gemini-embedding-2",
        ],
    },
    {
        label: "火山引擎 (Doubao)",
        name: "Doubao",
        api_type: "doubao",
        api_base: "https://ark.cn-beijing.volces.com/api",
        default_models: [
            "doubao-seed-1-6-250615",
            "doubao-seed-1-6-flash-250615",
        ],
    },
    {
        label: "硅基流动",
        name: "siliconflow",
        api_type: "openai",
        api_base: "https://api.siliconflow.cn",
        default_models: [
            "deepseek-ai/DeepSeek-V3",
            "deepseek-ai/DeepSeek-R1",
            "BAAI/bge-m3",
            "BAAI/bge-reranker-v2-m3",
        ],
    },
    {
        label: "智谱 GLM",
        name: "GLM",
        api_type: "glm",
        api_base: "https://open.bigmodel.cn",
        default_models: ["glm-4-flash", "glm-4-plus", "glm-4.6v-flash"],
    },
    {
        label: "OpenRouter",
        name: "OpenRouter",
        api_type: "openrouter",
        api_base: "https://openrouter.ai/api",
        default_models: ["google/gemini-2.5-flash", "x-ai/grok-4"],
    },
    {
        label: "Groq",
        name: "Groq",
        api_type: "openai",
        api_base: "https://api.groq.com/openai/v1",
        default_models: ["llama-3.3-70b-versatile", "mixtral-8x7b-32768"],
    },
    {
        label: "自定义 OpenAI",
        name: "Custom",
        api_type: "openai",
        api_base: "https://api.openai.com/v1",
        default_models: ["gpt-4o", "gpt-4o-mini"],
    },
];

const form = ref<{
    name: string;
    api_type: string;
    api_base: string;
    api_key_str: string;
    timeout: number;
    temperature: number | null;
    max_output_tokens: number | null;
    models: ModelDetailItem[];
    enabled: boolean;
    priority: number;
    weight: number;
}>({
    name: "",
    api_type: "openai",
    api_base: "",
    api_key_str: "",
    timeout: 180,
    temperature: null,
    max_output_tokens: null,
    models: [],
    enabled: true,
    priority: 1,
    weight: 10,
});

const newModelInput = ref("");

const isEditMode = computed(() => !!props.provider);

watch(
    () => props.visible,
    (val) => {
        if (val) {
            loadModelsDevCatalog();
            modelsDevSearch.value = "";
            showModelsDevDropdown.value = false;
            modelTestState.value = {};
        }
    }
);

watch(
    () => props.provider,
    (val) => {
        if (val) {
            form.value = {
                name: val.name,
                api_type: val.api_type || "openai",
                api_base: val.api_base || "",
                api_key_str: Array.isArray(val.api_key)
                    ? val.api_key.join("\n")
                    : val.api_key || "",
                timeout: val.timeout ?? 180,
                temperature: val.temperature ?? null,
                max_output_tokens: val.max_output_tokens ?? null,
                models: JSON.parse(JSON.stringify(val.models || [])),
                enabled: val.enabled !== false,
                priority: val.priority ?? 1,
                weight: val.weight ?? 10,
            };
        } else {
            form.value = {
                name: "",
                api_type: "openai",
                api_base: "",
                api_key_str: "",
                timeout: 180,
                temperature: null,
                max_output_tokens: null,
                models: [],
                enabled: true,
                priority: 1,
                weight: 10,
            };
        }
    },
    { immediate: true }
);

const applyPreset = (preset: ProviderPreset) => {
    form.value.name = preset.name;
    form.value.api_type = preset.api_type;
    form.value.api_base = preset.api_base;
    form.value.models = preset.default_models.map((m) => ({
        model_name: m,
    }));
};

const addModel = () => {
    const raw = newModelInput.value.trim();
    if (!raw) return;
    const names = raw.split(/[\n,，\s]+/).filter(Boolean);
    for (const name of names) {
        if (!form.value.models.some((m) => m.model_name === name)) {
            form.value.models.push({ model_name: name });
        }
    }
    newModelInput.value = "";
};

const removeModel = (index: number) => {
    form.value.models.splice(index, 1);
};

// 单模型测速
const handleTestModel = async (modelName: string) => {
    const fullModelName = `${form.value.name}/${modelName}`;
    modelTestState.value[modelName] = { loading: true };
    try {
        const res = await aiApi.testModel(fullModelName);
        if (res.data) {
            modelTestState.value[modelName] = {
                loading: false,
                success: res.data.success,
                latency_ms: res.data.latency_ms,
                message: res.data.message,
            };
            if (res.data.success) {
                ZXNotification({
                    title: "测通成功",
                    message: `${modelName} 响应耗时: ${res.data.latency_ms} ms`,
                    type: "🎉",
                    position: "top-right",
                });
            } else {
                ZXNotification({
                    title: "连通失败",
                    message: res.data.message,
                    type: "😭",
                    position: "top-right",
                });
            }
        }
    } catch (e: any) {
        modelTestState.value[modelName] = {
            loading: false,
            success: false,
            message: e?.message || "测试请求出错",
        };
        ZXNotification({
            title: "测试报错",
            message: `${e?.message || e}`,
            type: "😭",
            position: "top-right",
        });
    }
};

const handleDeleteCurrent = () => {
    if (!form.value.name) return;
    ZXMessageBox({
        title: "删除服务商",
        message: `确定要删除服务商「${form.value.name}」吗？下属配置将被清空。`,
        confirmButtonText: "确认删除",
        confirmButtonHoverBg: "bg-red-500",
        cancelButtonText: "取消",
        onConfirm: () => {
            emit("delete", form.value.name);
            emit("close");
        },
    });
};

const handleSave = () => {
    if (!form.value.name.trim()) return;

    // 解析 Key
    const rawKeys = form.value.api_key_str
        .split("\n")
        .map((k) => k.trim())
        .filter(Boolean);
    const apiKey = rawKeys.length <= 1 ? rawKeys[0] || "" : rawKeys;

    const provider: ProviderItem = {
        name: form.value.name.trim(),
        api_type: form.value.api_type.trim(),
        api_base: form.value.api_base.trim() || null,
        api_key: apiKey,
        timeout: Number(form.value.timeout) || 180,
        temperature: form.value.temperature ? Number(form.value.temperature) : null,
        max_output_tokens: form.value.max_output_tokens
            ? Number(form.value.max_output_tokens)
            : null,
        models: form.value.models,
        enabled: form.value.enabled,
        priority: Number(form.value.priority) || 1,
        weight: Number(form.value.weight) || 10,
    };

    emit("save", provider);
    emit("close");
};
</script>

<template>
    <Teleport to="body">
        <Transition
            :css="false"
            @enter="modalJelly.onEnter"
            @leave="modalJelly.onLeave"
        >
            <div
                v-if="visible"
                class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
            >
                <!-- 遮罩 -->
                <div
                    class="glass-overlay absolute inset-0 bg-black/40 backdrop-blur-sm"
                    @click="emit('close')"
                />

                <!-- 弹窗容器 -->
                <div
                    class="modal-content relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl transition-all"
                >
                    <!-- 弹窗标题 -->
                    <div
                        class="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4"
                    >
                        <div class="flex items-center gap-2.5">
                            <div
                                class="flex h-8 w-8 items-center justify-center shrink-0 text-zx-text-muted"
                            >
                                <ProviderIcon
                                    :name="form.name"
                                    :api-type="form.api_type"
                                    size-class="h-7 w-7"
                                />
                            </div>
                            <div>
                                <h3 class="text-base font-bold text-zx-text-strong">
                                    {{ isEditMode ? `配置服务商: ${form.name}` : "添加服务提供商" }}
                                </h3>
                                <p class="text-[11px] text-zx-text-subtle">
                                    配置接口地址、协议、API 密钥与模型列表
                                </p>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <!-- 渠道启用/禁用开关 -->
                            <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200/80">
                                <span
                                    class="text-xs font-medium"
                                    :class="form.enabled ? 'text-emerald-600' : 'text-slate-400'"
                                >
                                    {{ form.enabled ? "已启用" : "已禁用" }}
                                </span>
                                <ZxSwitch v-model="form.enabled" title="切换渠道启用状态" />
                            </div>

                            <button
                                type="button"
                                class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                                @click="emit('close')"
                            >
                                <X class="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <!-- 滚动内容区 -->
                    <div class="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-sm">
                        <!-- 快捷预设 (仅新增时显示) -->
                        <div v-if="!isEditMode" class="space-y-2.5 pb-2 border-b border-slate-100">
                            <div class="flex items-center justify-between">
                                <label class="font-medium text-xs text-zx-text-muted">
                                    快捷厂商模板
                                </label>
                                <span v-if="modelsDevCatalog.length > 0" class="text-[11px] text-zx-text-subtle">
                                    或从全球 {{ modelsDevCatalog.length }} 家 models.dev 厂商自动填入
                                </span>
                            </div>

                            <!-- 常用按钮 -->
                            <div class="flex flex-wrap gap-1.5">
                                <button
                                    v-for="preset in PRESETS"
                                    :key="preset.name"
                                    type="button"
                                    class="cursor-pointer flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-zx-text transition hover:border-zx-primary hover:bg-zx-primary-soft hover:text-zx-primary"
                                    @click="applyPreset(preset)"
                                >
                                    <ProviderIcon
                                        :name="preset.name"
                                        :api-type="preset.api_type"
                                        size-class="h-3.5 w-3.5"
                                    />
                                    <span>{{ preset.label }}</span>
                                </button>
                            </div>

                            <!-- models.dev 在线联想输入框 -->
                            <div v-if="modelsDevCatalog.length > 0" class="relative mt-1.5">
                                <div class="relative flex items-center">
                                    <input
                                        v-model="modelsDevSearch"
                                        type="text"
                                        placeholder="搜索 models.dev 在线厂商 (如 groq, moonshot, mistral, together...)"
                                        class="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs text-zx-text transition focus:border-zx-primary focus:bg-white focus:outline-none"
                                        @focus="showModelsDevDropdown = true"
                                    />
                                    <button
                                        v-if="modelsDevSearch"
                                        type="button"
                                        class="absolute right-2.5 text-zx-text-subtle hover:text-zx-text cursor-pointer"
                                        @click="modelsDevSearch = ''; showModelsDevDropdown = false"
                                    >
                                        <X class="h-3.5 w-3.5" />
                                    </button>
                                </div>

                                <div
                                    v-if="showModelsDevDropdown && filteredModelsDevProviders.length > 0"
                                    class="absolute left-0 right-0 top-full z-30 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg space-y-0.5"
                                >
                                    <button
                                        v-for="p in filteredModelsDevProviders"
                                        :key="p.id"
                                        type="button"
                                        class="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition hover:bg-zx-primary-soft/30 hover:text-zx-primary cursor-pointer"
                                        @click="applyModelsDevProvider(p)"
                                    >
                                        <div class="flex items-center gap-2">
                                            <ProviderIcon
                                                :name="p.name"
                                                :api-type="p.api_type"
                                                size-class="h-4 w-4"
                                            />
                                            <span class="font-bold text-zx-text-strong">{{ p.name }}</span>
                                            <span class="text-[10px] text-zx-text-subtle font-mono">({{ p.id }})</span>
                                        </div>
                                        <div class="flex items-center gap-1.5">
                                            <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-zx-text-muted font-mono">
                                                {{ p.api_type }}
                                            </span>
                                            <span class="text-[10px] text-zx-text-muted">
                                                {{ p.models_count }} 模型
                                            </span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- 基础信息与协议 -->
                        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div class="space-y-1.5">
                                <label class="font-medium text-xs text-zx-text-strong">
                                    提供商名称 <span class="text-red-500">*</span>
                                </label>
                                <input
                                    v-model="form.name"
                                    type="text"
                                    placeholder="例如 DeepSeek, Gemini"
                                    :disabled="isEditMode"
                                    class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-zx-text transition focus:border-zx-primary focus:bg-white focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 font-medium"
                                />
                            </div>

                            <div class="space-y-1.5">
                                <div class="flex items-center justify-between">
                                    <label class="font-medium text-xs text-zx-text-strong">
                                        协议类型 (API Type)
                                    </label>
                                    <span class="text-[11px] text-zx-text-subtle">点击快捷切换</span>
                                </div>
                                <input
                                    v-model="form.api_type"
                                    type="text"
                                    placeholder="openai, openai_responses, gemini 等"
                                    class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-zx-text transition focus:border-zx-primary focus:bg-white focus:outline-none font-mono"
                                />
                                <div class="flex flex-wrap items-center gap-1.5 pt-1">
                                    <button
                                        v-for="proto in COMMON_PROTOCOLS.slice(0, 8)"
                                        :key="proto.value"
                                        type="button"
                                        class="text-[10px] px-2 py-0.5 rounded-md border transition-all cursor-pointer select-none"
                                        :class="form.api_type === proto.value
                                            ? 'bg-zx-primary-soft text-zx-primary border-zx-primary/40 font-bold shadow-xs'
                                            : 'bg-white border-slate-200/80 text-zx-text-muted hover:bg-slate-50 hover:text-zx-text'"
                                        @click="form.api_type = proto.value"
                                    >
                                        {{ proto.label }}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- API Base URL -->
                        <div class="space-y-1.5">
                            <label class="font-medium text-xs text-zx-text-strong">
                                接口基础地址 (API Base URL)
                            </label>
                            <input
                                v-model="form.api_base"
                                type="text"
                                placeholder="例如 https://api.deepseek.com (留空使用协议默认)"
                                class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-zx-text transition focus:border-zx-primary focus:bg-white focus:outline-none font-mono"
                            />
                        </div>

                        <!-- API Key -->
                        <div class="space-y-1.5">
                            <div class="flex items-center justify-between">
                                <label class="font-medium text-xs text-zx-text-strong">
                                    API 密钥 (API Key) <span class="text-red-500">*</span>
                                </label>
                                <div class="flex items-center gap-2">
                                    <button
                                        type="button"
                                        class="text-xs text-zx-text-subtle hover:text-zx-text flex items-center gap-1 cursor-pointer"
                                        @click="showKeyPlain = !showKeyPlain"
                                    >
                                        <Eye v-if="!showKeyPlain" class="h-3.5 w-3.5" />
                                        <EyeOff v-else class="h-3.5 w-3.5" />
                                        {{ showKeyPlain ? "掩码" : "明文" }}
                                    </button>
                                    <span class="text-[11px] text-zx-text-subtle">
                                        支持每行一个进行轮询
                                    </span>
                                </div>
                            </div>
                            <textarea
                                v-model="form.api_key_str"
                                rows="2"
                                :placeholder="showKeyPlain ? 'sk-xxxxxxxxxxxxxxxxxxxxxxxx' : '••••••••••••••••••••••••'"
                                class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-zx-text transition focus:border-zx-primary focus:bg-white focus:outline-none font-mono leading-relaxed"
                            />
                        </div>

                        <!-- 调度与高级参数 (New API 风格) -->
                        <div class="space-y-2 pt-1 border-t border-slate-100">
                            <div class="flex items-center justify-between">
                                <label class="font-medium text-xs text-zx-text-strong">
                                    调度与模型调用参数
                                </label>
                                <span class="text-[10px] text-zx-text-subtle font-mono">
                                    优先级数值越小越优先调用
                                </span>
                            </div>
                            <div class="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                                <div class="space-y-1">
                                    <label class="font-medium text-[11px] text-zx-text-muted">
                                        调度优先级
                                    </label>
                                    <input
                                        v-model.number="form.priority"
                                        type="number"
                                        min="1"
                                        placeholder="1"
                                        class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-zx-text transition focus:border-zx-primary focus:bg-white focus:outline-none"
                                    />
                                </div>
                                <div class="space-y-1">
                                    <label class="font-medium text-[11px] text-zx-text-muted">
                                        负载权重
                                    </label>
                                    <input
                                        v-model.number="form.weight"
                                        type="number"
                                        min="1"
                                        placeholder="10"
                                        class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-zx-text transition focus:border-zx-primary focus:bg-white focus:outline-none"
                                    />
                                </div>
                                <div class="space-y-1">
                                    <label class="font-medium text-[11px] text-zx-text-muted">
                                        超时 (秒)
                                    </label>
                                    <input
                                        v-model.number="form.timeout"
                                        type="number"
                                        class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-zx-text transition focus:border-zx-primary focus:bg-white focus:outline-none"
                                    />
                                </div>
                                <div class="space-y-1">
                                    <label class="font-medium text-[11px] text-zx-text-muted">
                                        默认温度
                                    </label>
                                    <input
                                        v-model.number="form.temperature"
                                        type="number"
                                        step="0.1"
                                        placeholder="默认"
                                        class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-zx-text transition focus:border-zx-primary focus:bg-white focus:outline-none"
                                    />
                                </div>
                                <div class="space-y-1 col-span-2 sm:col-span-1">
                                    <label class="font-medium text-[11px] text-zx-text-muted">
                                        最大 Token
                                    </label>
                                    <input
                                        v-model.number="form.max_output_tokens"
                                        type="number"
                                        placeholder="不限制"
                                        class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-zx-text transition focus:border-zx-primary focus:bg-white focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <!-- 模型列表管理 -->
                        <div class="space-y-2 pt-2 border-t border-slate-100">
                            <div class="flex items-center justify-between">
                                <label class="font-medium text-xs text-zx-text-strong">
                                    模型列表 ({{ form.models.length }})
                                </label>
                                <button
                                    v-if="matchedOnlineProvider"
                                    type="button"
                                    class="text-xs text-zx-primary hover:underline cursor-pointer flex items-center gap-1 font-medium"
                                    @click="syncModelsFromOnline"
                                >
                                    <Sparkles class="h-3.5 w-3.5" />
                                    从 models.dev 补齐模型
                                </button>
                            </div>

                            <!-- 添加模型输入框 -->
                            <div class="flex gap-2">
                                <input
                                    v-model="newModelInput"
                                    type="text"
                                    placeholder="输入模型标识（支持逗号或空格批量添加）"
                                    class="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs text-zx-text transition focus:border-zx-primary focus:bg-white focus:outline-none font-mono"
                                    @keydown.enter.prevent="addModel"
                                />
                                <ZxButton variant="primary" size="sm" @click="addModel">
                                    <Plus class="h-3.5 w-3.5 mr-1" /> 添加
                                </ZxButton>
                            </div>

                            <!-- 模型列表流（带单模型测速与删除） -->
                            <div
                                class="max-h-56 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50/50 p-2.5 space-y-1.5"
                            >
                                <div
                                    v-for="(model, idx) in form.models"
                                    :key="model.model_name"
                                    class="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-zx-text shadow-2xs"
                                >
                                    <div class="flex items-center gap-2 min-w-0">
                                        <span class="font-mono font-bold truncate">
                                            {{ model.model_name }}
                                        </span>
                                        <span
                                            v-if="model.max_output_tokens"
                                            class="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-zx-text-muted font-mono"
                                        >
                                            {{ model.max_output_tokens }}
                                        </span>
                                    </div>

                                    <div class="flex items-center gap-1.5 shrink-0">
                                        <!-- 测速耗时显示 -->
                                        <span
                                            v-if="modelTestState[model.model_name]?.latency_ms"
                                            class="text-[10px] font-mono text-emerald-600 font-bold"
                                        >
                                            {{ modelTestState[model.model_name].latency_ms }} ms
                                        </span>

                                        <!-- 测通按钮 -->
                                        <button
                                            type="button"
                                            class="p-1 rounded-lg text-slate-400 hover:text-zx-primary hover:bg-slate-100 transition cursor-pointer"
                                            title="测试此模型连通性"
                                            :disabled="modelTestState[model.model_name]?.loading"
                                            @click="handleTestModel(model.model_name)"
                                        >
                                            <Loader2
                                                v-if="modelTestState[model.model_name]?.loading"
                                                class="h-3.5 w-3.5 animate-spin text-zx-primary"
                                            />
                                            <Play v-else class="h-3.5 w-3.5" />
                                        </button>

                                        <!-- 移除按钮 -->
                                        <button
                                            type="button"
                                            class="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 transition cursor-pointer"
                                            title="移除模型"
                                            @click="removeModel(idx)"
                                        >
                                            <X class="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>

                                <div
                                    v-if="!form.models.length"
                                    class="w-full py-4 text-center text-xs text-zx-text-subtle"
                                >
                                    尚未添加模型，请输入模型名称添加或从模板载入
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 弹窗底部操作栏 -->
                    <div
                        class="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-4"
                    >
                        <div>
                            <ZxButton
                                v-if="isEditMode"
                                variant="danger"
                                size="sm"
                                @click="handleDeleteCurrent"
                            >
                                <Trash2 class="h-3.5 w-3.5 mr-1" />
                                删除服务商
                            </ZxButton>
                        </div>

                        <div class="flex items-center gap-2.5">
                            <ZxButton variant="ghost" size="sm" @click="emit('close')">
                                取消
                            </ZxButton>
                            <ZxButton
                                variant="primary"
                                size="sm"
                                :disabled="!form.name.trim()"
                                @click="handleSave"
                            >
                                <Check class="h-3.5 w-3.5 mr-1" />
                                保存配置
                            </ZxButton>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>
