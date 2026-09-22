<script setup lang="ts">
import { onMounted, ref } from "vue";
import {
    Activity,
    AlertCircle,
    CheckCircle2,
    Clock,
    Coins,
    Eye,
    FlaskConical,
    MessageSquare,
    RefreshCw,
    Sparkles,
    Trash2,
    XCircle,
} from "lucide-vue-next";
import ZxButton from "@/components/zxcomponent/ZxButton.vue";
import ZxTag from "@/components/zxcomponent/ZxTag.vue";
import ZxSwitch from "@/components/zxcomponent/ZxSwitch.vue";
import ZxModal from "@/components/zxcomponent/ZxModal.vue";
import ZxEmptyState from "@/components/zxcomponent/ZxEmptyState.vue";
import { aiApi } from "@/utils/api-next";
import { ZXMessageBox, ZXNotification } from "@/services/ui";
import type { TelemetryItem } from "@/types/ai.types";

// 状态管理
const loading = ref(false);
const toggling = ref(false);
const refreshing = ref(false);
const enabled = ref(false);
const interceptedCount = ref(0);
const supportedProtocols = ref<string[]>(["chat", "response", "claude"]);
const telemetryList = ref<TelemetryItem[]>([]);

// 详情弹窗
const selectedItem = ref<TelemetryItem | null>(null);
const showDetailModal = ref(false);

// 加载状态
const loadStatus = async () => {
    loading.value = true;
    try {
        const res = await aiApi.getProtocolHijackStatus();
        if (res?.success && res.data) {
            enabled.value = res.data.enabled;
            supportedProtocols.value = res.data.supported_protocols;
            interceptedCount.value = res.data.intercepted_count;
        }
    } catch (error) {
        console.error("加载协议劫持状态失败:", error);
    } finally {
        loading.value = false;
    }
};

// 加载遥测列表
const loadTelemetry = async () => {
    refreshing.value = true;
    try {
        const res = await aiApi.getProtocolTelemetry(50);
        if (res?.success && res.data) {
            telemetryList.value = res.data;
        }
    } catch (error) {
        console.error("加载遥测数据失败:", error);
    } finally {
        refreshing.value = false;
    }
};

// 切换开关
const toggleSwitch = async () => {
    if (toggling.value) return;
    toggling.value = true;
    const targetState = !enabled.value;

    try {
        const res = await aiApi.updateProtocolHijackStatus(targetState);
        if (res?.success) {
            enabled.value = targetState;
            ZXNotification({
                title: targetState ? "实验性协议已激活" : "实验性协议已关闭",
                message: targetState
                    ? "已开启协议适配与劫持，正在监听 chat / response / claude 流量"
                    : "已关闭协议劫持，恢复原生协议调度模式",
                type: targetState ? "success" : "info",
                position: "top-right",
            });
            if (targetState) {
                loadTelemetry();
            }
        }
    } catch (error: any) {
        ZXNotification({
            title: "切换失败",
            message: error?.message || "更新协议劫持状态失败",
            type: "error",
            position: "top-right",
        });
    } finally {
        toggling.value = false;
    }
};

// 清空遥测
const handleClearTelemetry = () => {
    ZXMessageBox({
        title: "清空抓包遥测",
        message: "确定要清空当前的抓包遥测记录吗？这不会影响实际模型调用。",
        confirmButtonText: "确认清空",
        cancelButtonText: "取消",
        onConfirm: async () => {
            try {
                const res = await aiApi.clearProtocolTelemetry();
                if (res?.success) {
                    telemetryList.value = [];
                    ZXNotification({
                        title: "已清空",
                        message: "抓包遥测记录已全部清空",
                        type: "success",
                        position: "top-right",
                    });
                }
            } catch (err: any) {
                ZXNotification({
                    title: "清空失败",
                    message: err?.message || "操作失败",
                    type: "error",
                    position: "top-right",
                });
            }
        },
    });
};

const openDetail = (item: TelemetryItem) => {
    selectedItem.value = item;
    showDetailModal.value = true;
};

const formatTime = (timestamp: number) => {
    try {
        const d = new Date(timestamp * 1000);
        return d.toLocaleTimeString("zh-CN", { hour12: false });
    } catch {
        return "未知时间";
    }
};

onMounted(async () => {
    await loadStatus();
    await loadTelemetry();
});
</script>

<template>
    <div class="flex flex-col gap-4">
        <!-- 实验性功能主开关卡片 -->
        <div class="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div class="flex items-start gap-3.5">
                    <div
                        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-zx-primary"
                    >
                        <FlaskConical class="h-5 w-5" />
                    </div>
                    <div>
                        <div class="flex flex-wrap items-center gap-2">
                            <h2 class="text-base font-bold text-zx-text-strong">
                                AI 协议适配与劫持系统
                            </h2>
                            <ZxTag :variant="enabled ? 'success' : 'neutral'">
                                {{ enabled ? "已激活" : "已停用" }}
                            </ZxTag>
                            <ZxTag variant="purple">实验性</ZxTag>
                        </div>
                        <p class="mt-1 text-sm text-zx-text-muted leading-relaxed">
                            支持原生 Anthropic Claude (<code class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-zx-text-strong">claude</code>) 协议解析，并对 OpenAI Chat 与 Responses 接口实现透明劫持、参数改写与调用抓包遥测。
                        </p>
                    </div>
                </div>

                <!-- 切换开关 -->
                <div class="flex items-center gap-3 self-end sm:self-center">
                    <span class="text-xs font-medium text-zx-text-muted">
                        {{ enabled ? "劫持已生效" : "原生直连" }}
                    </span>
                    <ZxSwitch
                        :model-value="enabled"
                        :disabled="toggling || loading"
                        @change="toggleSwitch"
                    />
                </div>
            </div>

            <!-- 状态说明指示栏 -->
            <div
                class="mt-4 flex flex-col gap-2 rounded-2xl border border-slate-200/80 bg-slate-50 p-3.5 text-xs sm:flex-row sm:items-center sm:justify-between"
            >
                <div class="flex items-center gap-2 text-zx-text">
                    <Sparkles class="h-4 w-4 shrink-0 text-zx-text-muted" />
                    <span>
                        {{
                            enabled
                                ? "劫持代理正在透明拦截三大核心协议调用并实时生成统计日志。"
                                : "未启用时，真寻将遵循原生 11 种适配器直连规范，不记录抓包。"
                        }}
                    </span>
                </div>
                <div class="flex items-center gap-1.5 text-zx-text-muted">
                    <span>累计拦截调用:</span>
                    <span class="font-mono font-bold text-zx-text-strong">{{ interceptedCount }} 次</span>
                </div>
            </div>
        </div>

        <!-- 核心协议矩阵卡片 -->
        <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
            <!-- Chat 协议卡片 -->
            <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <MessageSquare class="h-5 w-5 text-zx-primary" />
                        <span class="font-bold text-zx-text-strong">chat (OpenAI)</span>
                    </div>
                    <ZxTag variant="primary">已就绪</ZxTag>
                </div>
                <div class="mt-2.5 font-mono text-xs text-zx-text-subtle">
                    /v1/chat/completions
                </div>
                <p class="mt-2 text-xs text-zx-text-muted leading-relaxed">
                    行业标准 Chat 接口协议。支持自动参数合并、上下文过滤与故障无缝转移。
                </p>
            </div>

            <!-- Response 协议卡片 -->
            <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <Activity class="h-5 w-5 text-zx-primary" />
                        <span class="font-bold text-zx-text-strong">response</span>
                    </div>
                    <ZxTag variant="cyan">已就绪</ZxTag>
                </div>
                <div class="mt-2.5 font-mono text-xs text-zx-text-subtle">
                    /v1/responses
                </div>
                <p class="mt-2 text-xs text-zx-text-muted leading-relaxed">
                    OpenAI 新一代结构化响应协议。支持直接传入 input 块与服务端原生多模态输出。
                </p>
            </div>

            <!-- Claude 协议卡片 -->
            <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <Sparkles class="h-5 w-5 text-zx-primary" />
                        <span class="font-bold text-zx-text-strong">claude (Anthropic)</span>
                    </div>
                    <ZxTag variant="purple">已适配</ZxTag>
                </div>
                <div class="mt-2.5 font-mono text-xs text-zx-text-subtle">
                    /v1/messages
                </div>
                <p class="mt-2 text-xs text-zx-text-muted leading-relaxed">
                    Anthropic 官方规范驱动。独立分离 system 提示词、max_tokens 自动补全、连续同角色消息合并。
                </p>
            </div>
        </div>

        <!-- 抓包与调用遥测卡片 -->
        <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div class="flex items-center justify-between border-b border-slate-100 pb-4">
                <div class="flex items-center gap-2.5">
                    <Activity class="h-5 w-5 text-zx-text-muted" />
                    <h3 class="text-sm font-bold text-zx-text-strong">
                        抓包与调用遥测 (Live Telemetry)
                    </h3>
                    <ZxTag variant="neutral">记录 {{ telemetryList.length }}</ZxTag>
                </div>
                <div class="flex items-center gap-2">
                    <ZxButton
                        variant="ghost"
                        size="sm"
                        :disabled="refreshing"
                        @click="loadTelemetry"
                    >
                        <RefreshCw class="mr-1 h-3.5 w-3.5" :class="refreshing ? 'animate-spin' : ''" />
                        刷新
                    </ZxButton>
                    <ZxButton
                        v-if="telemetryList.length > 0"
                        variant="ghost"
                        size="sm"
                        @click="handleClearTelemetry"
                    >
                        <Trash2 class="mr-1 h-3.5 w-3.5 text-zx-text-muted" />
                        清空
                    </ZxButton>
                </div>
            </div>

            <!-- 未开启提示 -->
            <ZxEmptyState
                v-if="!enabled"
                :icon="AlertCircle"
                text="协议劫持当前未激活"
                sub-text="开启上方开关后，触发的大模型调用将在此处实时抓包记录"
                size="md"
            />

            <!-- 空列表提示 -->
            <ZxEmptyState
                v-else-if="telemetryList.length === 0"
                :icon="Sparkles"
                text="暂无调用抓包记录"
                sub-text="当机器人或连接测试触发大模型调用时，记录会自动捕获并展示在这里"
                size="md"
            />

            <!-- 遥测记录列表 -->
            <div v-else class="mt-4 divide-y divide-slate-100 overflow-hidden">
                <div
                    v-for="item in telemetryList"
                    :key="item.id"
                    class="group flex flex-col gap-2 sm:flex-row sm:items-center justify-between py-3.5 px-3 hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer"
                    @click="openDetail(item)"
                >
                    <div class="flex items-start gap-3 min-w-0 flex-1">
                        <!-- 状态图标 -->
                        <div class="mt-0.5 shrink-0">
                            <CheckCircle2
                                v-if="item.status === 'success'"
                                class="h-4 w-4 text-[#22c55e]"
                            />
                            <XCircle
                                v-else
                                class="h-4 w-4 text-[#ef4444]"
                            />
                        </div>

                        <!-- 基础信息 -->
                        <div class="min-w-0 flex-1">
                            <div class="flex flex-wrap items-center gap-2">
                                <span class="font-mono text-xs text-zx-text-subtle">
                                    {{ formatTime(item.timestamp) }}
                                </span>
                                <ZxTag variant="neutral">
                                    {{ item.api_type }}
                                </ZxTag>
                                <span class="text-xs font-bold text-zx-text-strong truncate">
                                    {{ item.provider_name }} / {{ item.model_name }}
                                </span>
                                <span
                                    v-if="item.latency_ms !== null && item.latency_ms !== undefined"
                                    class="flex items-center gap-1 font-mono text-xs text-zx-text-muted"
                                >
                                    <Clock class="h-3 w-3" />
                                    <span>{{ item.latency_ms }} ms</span>
                                </span>
                                <span
                                    v-if="item.input_tokens || item.output_tokens"
                                    class="flex items-center gap-1 font-mono text-xs text-zx-text-muted"
                                >
                                    <Coins class="h-3 w-3" />
                                    <span>{{ item.input_tokens || 0 }} + {{ item.output_tokens || 0 }} Tok</span>
                                </span>
                            </div>

                            <!-- 预览文本 -->
                            <p class="mt-1 text-xs text-zx-text-muted truncate max-w-xl">
                                <span class="text-zx-text-subtle">Q:</span> {{ item.prompt_preview || "(无提示词)" }}
                            </p>
                            <p
                                v-if="item.response_preview"
                                class="mt-0.5 text-xs text-zx-text truncate max-w-xl"
                            >
                                <span class="text-zx-text-subtle">A:</span> {{ item.response_preview }}
                            </p>
                            <p
                                v-if="item.error_message"
                                class="mt-0.5 text-xs text-zx-danger truncate max-w-xl"
                            >
                                <span class="text-zx-danger font-medium">Err:</span> {{ item.error_message }}
                            </p>
                        </div>
                    </div>

                    <!-- 查看按钮 -->
                    <div class="flex items-center justify-end gap-2 shrink-0">
                        <ZxButton
                            variant="ghost"
                            size="sm"
                        >
                            <Eye class="mr-1 h-3.5 w-3.5" />
                            <span>查看抓包</span>
                        </ZxButton>
                    </div>
                </div>
            </div>
        </div>

        <!-- 抓包详情弹窗：严格遵从 ZxModal 组件规范 -->
        <ZxModal
            v-model="showDetailModal"
            title="调用抓包详情"
            :icon="FlaskConical"
            size="lg"
        >
            <div v-if="selectedItem" class="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">
                <!-- 状态与协议标签行 -->
                <div class="flex flex-wrap items-center gap-2">
                    <ZxTag :variant="selectedItem.status === 'success' ? 'success' : 'danger'">
                        {{ selectedItem.status === 'success' ? '调用成功' : '调用失败' }}
                    </ZxTag>
                    <ZxTag variant="neutral">
                        {{ selectedItem.api_type }}
                    </ZxTag>
                    <span class="text-xs text-zx-text-muted">
                        {{ formatTime(selectedItem.timestamp) }}
                    </span>
                </div>

                <!-- 元数据网格 -->
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-2xl bg-slate-50 p-3.5 text-xs border border-slate-200/80">
                    <div>
                        <span class="text-zx-text-subtle block">模型提供商</span>
                        <span class="font-bold text-zx-text-strong truncate block">{{ selectedItem.provider_name }}</span>
                    </div>
                    <div>
                        <span class="text-zx-text-subtle block">模型名称</span>
                        <span class="font-bold text-zx-text-strong truncate block">{{ selectedItem.model_name }}</span>
                    </div>
                    <div>
                        <span class="text-zx-text-subtle block">请求耗时</span>
                        <span class="font-mono text-zx-text-strong font-bold">{{ selectedItem.latency_ms || 0 }} ms</span>
                    </div>
                    <div>
                        <span class="text-zx-text-subtle block">Token 统计</span>
                        <span class="font-mono text-zx-text-strong font-bold">
                            {{ selectedItem.input_tokens || 0 }} + {{ selectedItem.output_tokens || 0 }}
                        </span>
                    </div>
                </div>

                <!-- 目标端点 -->
                <div v-if="selectedItem.endpoint">
                    <span class="text-xs font-bold text-zx-text-strong block mb-1">目标请求 URL</span>
                    <div class="rounded-xl bg-slate-900 text-slate-100 p-2.5 font-mono text-xs break-all">
                        {{ selectedItem.endpoint }}
                    </div>
                </div>

                <!-- 提示词 Prompt -->
                <div>
                    <span class="text-xs font-bold text-zx-text-strong block mb-1">提示词内容 (Prompt)</span>
                    <div class="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-zx-text whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                        {{ selectedItem.prompt_preview || "(无提示词内容)" }}
                    </div>
                </div>

                <!-- 返回内容或报错 -->
                <div v-if="selectedItem.status === 'success'">
                    <span class="text-xs font-bold text-zx-text-strong block mb-1">模型回复内容 (Response)</span>
                    <div class="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-zx-text whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                        {{ selectedItem.response_preview || "(无文本响应)" }}
                    </div>
                </div>

                <div v-else>
                    <span class="text-xs font-bold text-zx-danger block mb-1">错误异常堆栈</span>
                    <div class="rounded-xl bg-slate-50 border border-red-200 p-3 text-xs text-zx-danger font-mono whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                        {{ selectedItem.error_message || "未知异常" }}
                    </div>
                </div>
            </div>

            <template #footer>
                <ZxButton variant="primary" size="sm" @click="showDetailModal = false">
                    关闭
                </ZxButton>
            </template>
        </ZxModal>
    </div>
</template>
