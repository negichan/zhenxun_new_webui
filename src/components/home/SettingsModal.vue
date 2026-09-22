<script setup lang="ts">
import { modalJelly } from "@/composables/useGsapTransition";
import { computed, ref, watch } from "vue";
import type { Component } from "vue";
import {
    X,
    LogOut,
    Settings,
    Palette,
    Wrench,
    FlaskConical,
    AlertCircle,
    ArrowRight,
    Info,
    Github,
    Book,
    ExternalLink,
} from "lucide-vue-next";
import { auth } from "@/utils/auth.ts";
import { useGlobalStore } from "@/store/global.ts";
import { ZXMessageBox, ZXNotification } from "@/services/ui";
import { router } from "@/router/index.js";
import { version } from "@/version";
import { getRadiusOverride, setRadiusOverride } from "@/theme/radius";
import { OVERLAY_ID, useZxOverlay } from "@/composables/useOverlayStack";
import ZxTag from "@/components/zxcomponent/ZxTag.vue";
import ZxButton from "@/components/zxcomponent/ZxButton.vue";
import ZxSwitch from "@/components/zxcomponent/ZxSwitch.vue";
import { aiApi, mainApi } from "@/utils/api-next";

interface Props {
    visible: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{ close: [] }>();

const rootRef = ref<HTMLElement | null>(null);
const openState = computed({
    get: () => props.visible,
    set: () => emit("close"),
});
useZxOverlay({
    id: OVERLAY_ID.settings,
    open: openState,
    el: () => rootRef.value,
    onClose: () => emit("close"),
});

// 设置分类：往里加内容时先在这里注册一个分区，再到模板对应分支填内容
interface Section {
    id: string;
    label: string;
    icon: Component;
}

const sections: Section[] = [
    { id: "general", label: "通用", icon: Wrench },
    { id: "appearance", label: "外观", icon: Palette },
    { id: "experimental", label: "实验性功能", icon: FlaskConical },
    { id: "about", label: "关于", icon: Info },
];

const openExternalUrl = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
};

const activeSection = ref<string>(sections[0].id);

// 实验性：协议劫持状态管理
const hijackLoading = ref(false);
const hijackToggling = ref(false);
const hijackEnabled = ref(false);
const hijackInterceptedCount = ref(0);
const supportedProtocols = ref<string[]>(["chat", "response", "claude"]);

const loadHijackStatus = async () => {
    hijackLoading.value = true;
    try {
        const res = await aiApi.getProtocolHijackStatus();
        if (res?.success && res.data) {
            hijackEnabled.value = res.data.enabled;
            supportedProtocols.value = res.data.supported_protocols;
            hijackInterceptedCount.value = res.data.intercepted_count;
        }
    } catch (error) {
        console.error("加载协议劫持状态失败:", error);
    } finally {
        hijackLoading.value = false;
    }
};

const handleToggleHijack = async (val: boolean) => {
    if (hijackToggling.value) return;
    hijackToggling.value = true;
    try {
        const res = await aiApi.updateProtocolHijackStatus(val);
        if (res?.success) {
            hijackEnabled.value = val;
            ZXNotification({
                title: val ? "协议适配与劫持已开启" : "协议适配与劫持已关闭",
                message: val
                    ? "已开启协议适配，chat / response / claude 请求已被接管"
                    : "已关闭协议劫持，恢复原生调用模式",
                type: val ? "success" : "info",
                position: "top-right",
            });
        }
    } catch (err: any) {
        ZXNotification({
            title: "切换失败",
            message: err?.message || "更新协议劫持状态失败",
            type: "error",
            position: "top-right",
        });
    } finally {
        hijackToggling.value = false;
    }
};

const goToTelemetry = () => {
    emit("close");
    globalStore.setExperimentalFeaturesEnabled(true);
    router.push({ path: "/config", query: { subtab: "protocols" } });
};

// 前端更新：查询本地/最新 Release 版本，一键从 GitHub 拉取并热替换 dist
interface WebuiVersion {
    local: string | null;
    latest: string | null;
    has_update: boolean;
}
const webuiVersion = ref<WebuiVersion | null>(null);
const checkingUpdate = ref(false);
const updatingWebui = ref(false);

const loadWebuiVersion = async () => {
    if (checkingUpdate.value) return;
    checkingUpdate.value = true;
    try {
        const res = await mainApi.getWebuiVersion();
        if (res?.success && res.data) webuiVersion.value = res.data;
    } catch (error) {
        console.error("检查前端更新失败:", error);
    } finally {
        checkingUpdate.value = false;
    }
};

const doUpdateWebui = () => {
    const latest = webuiVersion.value?.latest;
    if (!latest || updatingWebui.value) return;
    ZXMessageBox({
        title: "更新前端",
        message: `将从 GitHub Release 更新前端到 ${latest}，完成后页面会自动刷新，确定继续？`,
        cancelButtonText: "取消",
        confirmButtonText: "立即更新",
        onConfirm: async () => {
            updatingWebui.value = true;
            try {
                const res = await mainApi.updateWebui();
                if (res?.success) {
                    ZXNotification({
                        title: "前端已更新",
                        message: res.message || "正在刷新页面…",
                        type: "success",
                        position: "top-right",
                    });
                    setTimeout(() => window.location.reload(), 1200);
                }
            } catch (err: any) {
                ZXNotification({
                    title: "更新失败",
                    message: err?.message || "拉取最新版本失败",
                    type: "error",
                    position: "top-right",
                });
            } finally {
                updatingWebui.value = false;
            }
        },
    });
};

watch(
    () => props.visible,
    (val) => {
        if (val) {
            loadHijackStatus();
            loadWebuiVersion();
        }
    },
    { immediate: true },
);

// 卡片圆角覆写（null = 跟随主题预设 1.5rem）
const radiusOverride = ref<number | null>(getRadiusOverride());
const PRESET_RADIUS_PX = 24;
const radiusValue = computed(() => radiusOverride.value ?? PRESET_RADIUS_PX);
const onRadiusInput = (e: Event) => {
    const v = Number((e.target as HTMLInputElement).value);
    radiusOverride.value = v;
    setRadiusOverride(v);
};
const resetRadius = () => {
    radiusOverride.value = null;
    setRadiusOverride(null);
};

const globalStore = useGlobalStore();

const handleLogout = () => {
    emit("close");
    ZXMessageBox({
        title: "退出登录",
        message: "你是否要退出登录",
        cancelButtonText: "取消",
        onConfirm: () => {
            auth.logout();
            router.push({ name: "Login" });
        },
    });
};
</script>

<template>
    <Teleport to="body">
        <Transition :css="false" @enter="modalJelly.onEnter" @leave="modalJelly.onLeave">
            <div
                v-if="visible"
                ref="rootRef"
                class="fixed inset-0 z-50 flex items-center justify-center"
            >
                <div class="glass-overlay absolute h-full w-full"></div>
                <div
                    class="modal-content relative z-1 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl max-sm:mx-4 max-sm:max-h-[90vh]"
                >
                    <!-- 头部：标题 + 关闭 -->
                    <div class="flex items-center gap-3 px-6 pt-5 pb-4">
                        <div class="flex min-w-0 flex-1 items-center gap-2.5">
                            <Settings
                                class="h-5 w-5 shrink-0 text-[var(--zx-color-text-muted)]"
                            />
                            <p
                                class="truncate text-xl font-bold text-[var(--zx-color-text)]"
                            >
                                设置
                            </p>
                        </div>
                        <button
                            class="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--zx-color-text-muted)] transition-colors hover:bg-[var(--zx-color-surface-muted)] hover:text-[var(--zx-color-text)]"
                            type="button"
                            @click="emit('close')"
                        >
                            <X class="h-4 w-4" />
                        </button>
                    </div>

                    <!-- 主体：左分类导航 + 右内容区（窄屏时导航横排在上方） -->
                    <div
                        class="flex min-h-0 flex-1 flex-col sm:flex-row"
                    >
                        <div
                            class="flex shrink-0 flex-col p-3 sm:w-36"
                        >
                            <nav
                                class="flex flex-1 gap-1 overflow-x-auto sm:flex-col sm:overflow-y-auto"
                            >
                                <button
                                    v-for="section in sections"
                                    :key="section.id"
                                    class="flex shrink-0 cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors"
                                    :class="
                                        activeSection === section.id
                                            ? 'bg-zx-primary-tint text-zx-primary'
                                            : 'text-[var(--zx-color-text-muted)] hover:bg-[var(--zx-color-surface-muted)] hover:text-[var(--zx-color-text)]'
                                    "
                                    type="button"
                                    @click="activeSection = section.id"
                                >
                                    <component
                                        :is="section.icon"
                                        class="h-4 w-4 shrink-0"
                                    />
                                    <span>{{ section.label }}</span>
                                </button>
                            </nav>

                            <!-- 侧边栏最底下：退出登录 -->
                            <button
                                class="mt-2 flex shrink-0 cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[var(--zx-color-text-muted)] transition-colors hover:bg-zx-danger-soft hover:text-zx-danger sm:mt-3 sm:pt-3"
                                type="button"
                                @click="handleLogout"
                            >
                                <LogOut class="h-4 w-4 shrink-0" />
                                <span>退出登录</span>
                            </button>
                            <p
                                class="mt-1 shrink-0 px-3 pb-1 text-[11px] text-[var(--zx-color-text-subtle)] select-none"
                            >
                                zhenxun webui v{{ version }}
                            </p>
                        </div>

                        <div
                            class="min-h-[280px] min-w-0 flex-1 overflow-y-auto p-5"
                        >
                            <!-- 通用 -->
                            <template v-if="activeSection === 'general'">
                                <div class="space-y-3">
                                    <div
                                        class="flex items-center justify-between gap-4 rounded-2xl bg-[var(--zx-color-surface-muted)] px-4 py-3"
                                    >
                                        <div class="min-w-0">
                                            <p
                                                class="text-sm font-medium text-zx-text-strong"
                                            >
                                                动画效果
                                            </p>
                                            <p
                                                class="mt-0.5 text-xs text-zx-text-muted"
                                            >
                                                关闭后禁用过渡与动画，适合低性能设备
                                            </p>
                                        </div>
                                        <ZxSwitch
                                            :model-value="globalStore.animationsEnabled"
                                            @change="globalStore.setAnimationsEnabled"
                                        />
                                    </div>

                                    <div
                                        class="flex items-center justify-between gap-4 rounded-2xl bg-[var(--zx-color-surface-muted)] px-4 py-3"
                                    >
                                        <div class="min-w-0">
                                            <div class="flex items-center gap-1.5">
                                                <p
                                                    class="text-sm font-medium text-zx-text-strong"
                                                >
                                                    前端更新
                                                </p>
                                                <ZxTag
                                                    v-if="webuiVersion?.has_update"
                                                    variant="warning"
                                                >
                                                    可更新
                                                </ZxTag>
                                            </div>
                                            <p
                                                class="mt-0.5 text-xs text-zx-text-muted"
                                            >
                                                <span v-if="webuiVersion?.local">
                                                    当前 {{ webuiVersion.local }}
                                                </span>
                                                <span v-else>当前版本未知</span>
                                                <span
                                                    v-if="
                                                        webuiVersion?.latest &&
                                                        webuiVersion.has_update
                                                    "
                                                >
                                                    · 最新 {{ webuiVersion.latest }}
                                                </span>
                                            </p>
                                        </div>
                                        <div class="flex shrink-0 items-center gap-2">
                                            <ZxButton
                                                variant="ghost"
                                                size="sm"
                                                :disabled="
                                                    checkingUpdate || updatingWebui
                                                "
                                                @click="loadWebuiVersion"
                                            >
                                                <span
                                                    v-if="checkingUpdate"
                                                    class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
                                                ></span>
                                                <span>{{
                                                    checkingUpdate
                                                        ? "检查中"
                                                        : "检查更新"
                                                }}</span>
                                            </ZxButton>
                                            <ZxButton
                                                v-if="webuiVersion?.has_update"
                                                variant="primary"
                                                size="sm"
                                                :disabled="updatingWebui"
                                                @click="doUpdateWebui"
                                            >
                                                <span
                                                    v-if="updatingWebui"
                                                    class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
                                                ></span>
                                                <span>{{
                                                    updatingWebui
                                                        ? "更新中"
                                                        : `更新到 ${webuiVersion.latest}`
                                                }}</span>
                                            </ZxButton>
                                        </div>
                                    </div>
                                </div>
                            </template>

                            <!-- 外观 -->
                            <template v-else-if="activeSection === 'appearance'">
                                <div
                                    class="flex items-center justify-between gap-4 rounded-2xl bg-[var(--zx-color-surface-muted)] px-4 py-3"
                                >
                                    <div class="min-w-0">
                                        <p
                                            class="text-sm font-medium text-[var(--zx-color-text)]"
                                        >
                                            卡片圆角
                                        </p>
                                        <p
                                            class="mt-0.5 text-xs text-[var(--zx-color-text-muted)]"
                                        >
                                            全局大圆角（卡片 / 弹窗 / 面板），实时生效
                                        </p>
                                    </div>
                                    <div class="flex shrink-0 items-center gap-2.5">
                                        <span
                                            class="h-9 w-9 border border-slate-200 bg-white shadow-sm"
                                            :style="{ borderRadius: `${radiusValue}px` }"
                                            title="预览"
                                        ></span>
                                        <input
                                            type="range"
                                            min="0"
                                            max="32"
                                            step="2"
                                            :value="radiusValue"
                                            class="w-28 cursor-pointer accent-[var(--zx-color-primary)]"
                                            @input="onRadiusInput"
                                        />
                                        <span
                                            class="w-10 text-right text-xs tabular-nums text-[var(--zx-color-text-muted)]"
                                        >
                                            {{ radiusValue }}px
                                        </span>
                                        <button
                                            v-if="radiusOverride !== null"
                                            class="cursor-pointer rounded-full border border-slate-200 px-2.5 py-1 text-xs text-[var(--zx-color-text-muted)] transition-colors hover:text-[var(--zx-color-text)]"
                                            type="button"
                                            @click="resetRadius"
                                        >
                                            跟随主题
                                        </button>
                                    </div>
                                </div>
                            </template>

                            <!-- 实验性功能 -->
                            <template v-else-if="activeSection === 'experimental'">
                                <div class="flex flex-col gap-3">
                                    <!-- 顶部提示条：对齐 DESIGN.md 标准色与卡片规范 -->
                                    <div
                                        class="flex items-start gap-2.5 rounded-2xl border border-slate-200/80 bg-slate-50 p-3.5 text-xs"
                                    >
                                        <AlertCircle
                                            class="mt-0.5 h-4 w-4 shrink-0 text-zx-text-muted"
                                        />
                                        <div class="min-w-0 flex-1">
                                            <div class="flex items-center gap-1.5">
                                                <p class="font-semibold text-zx-text-strong">
                                                    实验性功能说明
                                                </p>
                                                <ZxTag variant="warning">实验性</ZxTag>
                                            </div>
                                            <p
                                                class="mt-1 leading-relaxed text-zx-text-muted"
                                            >
                                                此分类包含正在开发中的协议桥接、底层内核拦截及前沿交互特性。可能会随版本迭代变更，请根据实际需求开启。
                                            </p>
                                        </div>
                                    </div>

                                    <!-- 开关 1：AI 协议适配与劫持 -->
                                    <div
                                        class="rounded-2xl bg-[var(--zx-color-surface-muted)] p-4 transition-colors"
                                    >
                                        <div
                                            class="flex items-start justify-between gap-4"
                                        >
                                            <div class="min-w-0">
                                                <div
                                                    class="flex flex-wrap items-center gap-1.5"
                                                >
                                                    <p
                                                        class="text-sm font-semibold text-zx-text-strong"
                                                    >
                                                        AI 协议适配与劫持
                                                    </p>
                                                    <ZxTag variant="warning">
                                                        实验性
                                                    </ZxTag>
                                                    <ZxTag variant="purple">
                                                        底层拦截
                                                    </ZxTag>
                                                </div>
                                                <p
                                                    class="mt-1 text-xs leading-relaxed text-zx-text-muted"
                                                >
                                                    接管底层 AI 协议调用，将 chat、response、claude 等非标协议流量透明转换桥接为兼容格式。
                                                </p>
                                            </div>
                                            <ZxSwitch
                                                :model-value="hijackEnabled"
                                                :disabled="hijackLoading || hijackToggling"
                                                @change="handleToggleHijack"
                                            />
                                        </div>

                                        <!-- 生效中面板 -->
                                        <div
                                            v-if="hijackEnabled"
                                            class="mt-3.5 rounded-xl border border-slate-200/80 bg-white p-3 text-xs"
                                        >
                                            <div
                                                class="flex flex-wrap items-center justify-between gap-2"
                                            >
                                                <div
                                                    class="flex items-center gap-2"
                                                >
                                                    <ZxTag variant="success">
                                                        运行中
                                                    </ZxTag>
                                                    <span
                                                        class="text-zx-text-muted"
                                                    >
                                                        已拦截
                                                        <span
                                                            class="font-semibold text-zx-text-strong tabular-nums"
                                                            >{{
                                                                hijackInterceptedCount
                                                            }}</span
                                                        >
                                                        次请求
                                                    </span>
                                                </div>
                                                <div
                                                    class="flex items-center gap-1"
                                                >
                                                    <ZxTag
                                                        v-for="proto in supportedProtocols"
                                                        :key="proto"
                                                        variant="neutral"
                                                    >
                                                        {{ proto }}
                                                    </ZxTag>
                                                </div>
                                            </div>
                                            <div
                                                class="mt-2.5 flex items-center justify-end border-t border-slate-100 pt-2"
                                            >
                                                <ZxButton
                                                    variant="outline"
                                                    size="sm"
                                                    @click="goToTelemetry"
                                                >
                                                    <span>查看抓包遥测</span>
                                                    <ArrowRight
                                                        class="ml-1 h-3.5 w-3.5"
                                                    />
                                                </ZxButton>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- 开关 2：大模型进阶控制面板 -->
                                    <div
                                        class="flex items-center justify-between gap-4 rounded-2xl bg-[var(--zx-color-surface-muted)] px-4 py-3.5"
                                    >
                                        <div class="min-w-0">
                                            <div
                                                class="flex items-center gap-1.5"
                                            >
                                                <p
                                                    class="text-sm font-semibold text-zx-text-strong"
                                                >
                                                    大模型进阶控制面板
                                                </p>
                                                <ZxTag variant="cyan">
                                                    界面扩展
                                                </ZxTag>
                                            </div>
                                            <p
                                                class="mt-1 text-xs leading-relaxed text-zx-text-muted"
                                            >
                                                在大模型配置中解锁「任务默认路由」、「上下文压缩」与「智能体与引擎」进阶选项卡。
                                            </p>
                                        </div>
                                        <ZxSwitch
                                            :model-value="globalStore.experimentalFeaturesEnabled"
                                            @change="globalStore.setExperimentalFeaturesEnabled"
                                        />
                                    </div>

                                    <!-- 开关 3：协议遥测完整报文捕获 -->
                                    <div
                                        class="flex items-center justify-between gap-4 rounded-2xl bg-[var(--zx-color-surface-muted)] px-4 py-3.5"
                                    >
                                        <div class="min-w-0">
                                            <div
                                                class="flex items-center gap-1.5"
                                            >
                                                <p
                                                    class="text-sm font-semibold text-zx-text-strong"
                                                >
                                                    协议遥测报文深度记录
                                                </p>
                                                <ZxTag variant="info">
                                                    抓包排错
                                                </ZxTag>
                                            </div>
                                            <p
                                                class="mt-1 text-xs leading-relaxed text-zx-text-muted"
                                            >
                                                启用后将在遥测监控中记录完整请求入参与响应报文详情，便于接口协议对接排错。
                                            </p>
                                        </div>
                                        <ZxSwitch
                                            :model-value="globalStore.telemetryCaptureEnabled"
                                            @change="globalStore.setTelemetryCaptureEnabled"
                                        />
                                    </div>

                                    <!-- 开关 4：长列表激进预加载模式 -->
                                    <div
                                        class="flex items-center justify-between gap-4 rounded-2xl bg-[var(--zx-color-surface-muted)] px-4 py-3.5"
                                    >
                                        <div class="min-w-0">
                                            <div
                                                class="flex items-center gap-1.5"
                                            >
                                                <p
                                                    class="text-sm font-semibold text-zx-text-strong"
                                                >
                                                    长列表激进预加载
                                                </p>
                                                <ZxTag variant="neutral">
                                                    渲染性能
                                                </ZxTag>
                                            </div>
                                            <p
                                                class="mt-1 text-xs leading-relaxed text-zx-text-muted"
                                            >
                                                在消息历史与好友/群列表虚拟滚动中增大离屏预加载范围，提升极速飞滑时的平滑感。
                                            </p>
                                        </div>
                                        <ZxSwitch
                                            :model-value="globalStore.turboScrollEnabled"
                                            @change="globalStore.setTurboScrollEnabled"
                                        />
                                    </div>
                                </div>
                            </template>

                            <!-- 关于 -->
                            <template v-else-if="activeSection === 'about'">
                                <div class="space-y-4">
                                    <!-- 品牌主卡片 -->
                                    <div
                                        class="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white p-5"
                                    >
                                        <div class="relative z-10 flex items-start gap-4">
                                            <div
                                                class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-pink-50 p-1 border border-pink-100/80 shadow-xs"
                                            >
                                                <img
                                                    src="/stickers/mahiro/01_打招呼_回家啦.png"
                                                    alt="小真寻"
                                                    class="h-full w-full object-contain pointer-events-none select-none"
                                                />
                                            </div>
                                            <div class="min-w-0 flex-1">
                                                <div class="flex flex-wrap items-center gap-2">
                                                    <h3 class="text-base font-bold text-zx-text-strong">
                                                        真寻 Bot
                                                    </h3>
                                                    <ZxTag variant="primary">
                                                        WebUI v{{ version }}
                                                    </ZxTag>
                                                    <ZxTag variant="cyan">
                                                        Nonebot2
                                                    </ZxTag>
                                                    <ZxTag variant="neutral">
                                                        MIT
                                                    </ZxTag>
                                                </div>
                                                <p class="mt-1.5 text-xs leading-relaxed text-zx-text-muted">
                                                    基于 Nonebot2 的多功能二次元 QQ 机器人框架与现代化控制台。
                                                </p>
                                            </div>
                                        </div>

                                        <!-- 快速链接 -->
                                        <div class="mt-4 flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                                            <button
                                                type="button"
                                                class="btn-touch flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-zx-primary cursor-pointer shadow-xs"
                                                @click="openExternalUrl('https://github.com/HibiKier/zhenxun_bot')"
                                            >
                                                <Github class="h-3.5 w-3.5 text-slate-500" />
                                                <span>GitHub 仓库</span>
                                                <ExternalLink class="h-3 w-3 text-slate-400" />
                                            </button>
                                            <button
                                                type="button"
                                                class="btn-touch flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-zx-primary cursor-pointer shadow-xs"
                                                @click="openExternalUrl('https://zhenxun-bot.readthedocs.io/')"
                                            >
                                                <Book class="h-3.5 w-3.5 text-slate-500" />
                                                <span>官方文档</span>
                                                <ExternalLink class="h-3 w-3 text-slate-400" />
                                            </button>
                                        </div>
                                    </div>

                                    <!-- 核心成员与吉祥物 -->
                                    <div class="rounded-2xl bg-[var(--zx-color-surface-muted)] p-4">
                                        <p class="text-xs font-bold text-zx-text-strong uppercase tracking-wider text-slate-500">
                                            项目成员
                                        </p>
                                        <div class="mt-2.5 grid grid-cols-2 gap-2.5">
                                            <div class="flex items-center gap-2.5 rounded-xl bg-white p-2.5 border border-slate-200/60 shadow-xs">
                                                <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xs font-bold text-blue-600">
                                                    H
                                                </div>
                                                <div class="min-w-0">
                                                    <p class="truncate text-xs font-semibold text-zx-text-strong">HibiKier</p>
                                                    <p class="text-[11px] text-zx-text-muted">创始人 / 核心开发</p>
                                                </div>
                                            </div>
                                            <div class="flex items-center gap-2.5 rounded-xl bg-white p-2.5 border border-slate-200/60 shadow-xs">
                                                <img
                                                    src="/stickers/mahiro/06_得意_叉腰哼哼.png"
                                                    alt="小真寻"
                                                    class="h-9 w-9 shrink-0 rounded-xl object-contain bg-pink-50 p-0.5 border border-pink-100"
                                                />
                                                <div class="min-w-0">
                                                    <p class="truncate text-xs font-semibold text-zx-text-strong">小真寻</p>
                                                    <p class="text-[11px] text-zx-text-muted">吉祥物 / 看板娘</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- 技术栈信息 -->
                                    <div class="rounded-2xl bg-[var(--zx-color-surface-muted)] p-4">
                                        <p class="text-xs font-bold text-zx-text-strong uppercase tracking-wider text-slate-500">
                                            技术规格
                                        </p>
                                        <div class="mt-2 grid grid-cols-2 gap-2 text-xs text-zx-text-muted">
                                            <div class="flex items-center justify-between rounded-xl bg-white px-3 py-2 border border-slate-200/60">
                                                <span>前端框架</span>
                                                <span class="font-medium text-zx-text-strong">Vue 3 + Vite</span>
                                            </div>
                                            <div class="flex items-center justify-between rounded-xl bg-white px-3 py-2 border border-slate-200/60">
                                                <span>样式系统</span>
                                                <span class="font-medium text-zx-text-strong">Tailwind CSS v4</span>
                                            </div>
                                            <div class="flex items-center justify-between rounded-xl bg-white px-3 py-2 border border-slate-200/60">
                                                <span>动效驱动</span>
                                                <span class="font-medium text-zx-text-strong">GSAP</span>
                                            </div>
                                            <div class="flex items-center justify-between rounded-xl bg-white px-3 py-2 border border-slate-200/60">
                                                <span>状态管理</span>
                                                <span class="font-medium text-zx-text-strong">Pinia</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </template>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>
