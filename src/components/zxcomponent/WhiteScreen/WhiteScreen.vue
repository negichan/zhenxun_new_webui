<template>
    <div
        v-show="visible"
        class="ws-root"
        :style="{ background: bgColor, zIndex: z_index }"
    >
        <div class="ws-content">
            <!-- 🔴 ERROR 状态 -->
            <template v-if="mode === 'error'">
                <div class="logo">ZHEN&nbsp;XUN</div>
                <div class="title">未检测到协议端</div>
                <div class="subtitle">连接终止</div>
                <div class="desc">请你接入协议端，连接取消，拒绝登入系统。</div>

                <div class="btn-group">
                    <div
                        class="btn btn-primary"
                        :class="{ 'is-disabled': enabling }"
                        @click="handleStartBotClient"
                    >
                        {{ enabling ? "等待模拟端上线..." : enableFailed ? "重试" : "启动 Bot 端" }}
                    </div>
                    <div
                        class="btn btn-force"
                        title="跳过协议端检查直接进入主站"
                        @click="handleForceEnter"
                    >
                        <span class="force-default">强制访问</span>
                        <span class="force-hover">不要！</span>
                    </div>
                    <div class="btn" @click="handleGiveUp">返回</div>
                </div>
                <div v-if="enableFailed" class="retry-hint">
                    {{ failReason }}
                </div>
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onUnmounted, ref, watch } from "vue";
import { gsap } from "gsap";
import { getActivePinia } from "pinia";
import { router } from "@/router";
import { api } from "@/utils/api-next/client";
import { auth } from "@/utils/auth";
import { useBotStore } from "@/store/bot";
import { animationsEnabled } from "@/store/global";
import { openBotClient } from "@/config/menu";

const visible = ref(false);
const bgColor = ref("#fff");
const z_index = ref(999);
const mode = ref<"normal" | "error">("normal");

const enabling = ref(false);
const enableFailed = ref(false);
const failReason = ref("");
let cancelled = false;

// 启动 Bot 端：打开独立的 OneBot 模拟端窗口（autoConnect 会自动
// 接入后端桥接），轮询 bot 列表，协议端上线后自动进入首页
const handleStartBotClient = async () => {
    if (enabling.value) return;
    enabling.value = true;
    enableFailed.value = false;
    failReason.value = "";
    cancelled = false;
    try {
        if (!openBotClient()) {
            failReason.value =
                "Bot 端窗口被浏览器拦截，请允许本站弹出窗口后重试";
            enableFailed.value = true;
            return;
        }
        const online = await waitSimulatorOnline();
        if (cancelled) return;
        if (!online) {
            failReason.value = "等待超时，请在 Bot 端里连接后再重试";
            enableFailed.value = true;
            return;
        }
        await enterApp();
    } catch (error) {
        console.error("启动 Bot 端失败:", error);
        enableFailed.value = true;
    } finally {
        enabling.value = false;
    }
};

/** 轮询后端 bot 列表，等 Bot 端的模拟端上线（约 60 秒超时） */
const waitSimulatorOnline = async () => {
    const deadline = Date.now() + 60000;
    while (Date.now() < deadline) {
        if (cancelled) return false;
        try {
            const res = (await api.get(
                "/main/bot-list",
                undefined,
                // 红屏场景的轮询跳过拦截器：token 失效时不弹 401 通知、
                // 不触发跳转（循环自身在取消条件里收尾）
                { skipInterceptor: true },
            )) as any;
            if ((res?.data ?? []).length > 0) {
                return true;
            }
        } catch {
            /* 后端暂时不可达，继续等待 */
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    return false;
};

// 模拟端已上线：登录流程来的走白屏过渡进首页；
// 应用内协议端掉线来的揭开红屏并刷新 bot 列表
let enteringApp = false;
const enterApp = async () => {
    if (enteringApp) return;
    enteringApp = true;
    try {
        await doEnterApp();
    } finally {
        enteringApp = false;
    }
};

const doEnterApp = async () => {
    // 离开红屏拦截态：恢复守卫对"已登录去登录页"的正常拦截
    auth.clearWhiteGate();
    const botStore = useBotStore(getActivePinia());
    await botStore.getBotList();
    if (!auth.getAuthState()) {
        await hide();
        await router.push("/login");
        return;
    }
    if (router.currentRoute.value.name === "Login") {
        // 先让白屏滑入再跳转，Home 挂载时会调用 out() 揭开
        await show({ color: "#fff", mode: "normal" });
        await router.push("/dashboard");
    } else {
        await hide();
    }
};

// 强制访问：跳过协议端检查直接进入主站（无 bot 时各页面已有空态占位）；
// 标记存入本标签页会话，刷新页面不再重复弹红屏（登出后失效）。
// 若调试客户端正在等待上线，一并取消等待
const handleForceEnter = async () => {
    cancelled = true;
    auth.setForceEnter();
    await enterApp();
};

// 返回：放弃接入，退出登录回登录页
const handleGiveUp = async () => {
    cancelled = true;
    auth.logout();
    await hide();
    await router.push("/login");
};

// 红屏期间的自动轮询：协议端（真实协议端或模拟端）自己上线时
// 不用用户点按钮，自动揭开红屏进入应用。
// 手动"启动 Bot 端"流程有自己的等待循环，这里让路避免重复进入
let autoPollTimer: ReturnType<typeof setTimeout> | null = null;

const stopAutoPoll = () => {
    if (autoPollTimer) {
        clearTimeout(autoPollTimer);
        autoPollTimer = null;
    }
};

const startAutoPoll = () => {
    stopAutoPoll();
    const loop = async () => {
        autoPollTimer = null;
        if (!visible.value || mode.value !== "error") return;
        if (!enabling.value) {
            try {
                const res = (await api.get(
                    "/main/bot-list",
                    undefined,
                    // 同上：跳过 401 拦截器，避免通知轰炸
                    { skipInterceptor: true },
                )) as any;
                if ((res?.data ?? []).length > 0) {
                    cancelled = true; // 手动等待若还在跑，一并停掉
                    await enterApp();
                    return;
                }
            } catch {
                /* 后端暂时不可达，下轮再试 */
            }
        }
        autoPollTimer = setTimeout(loop, 1000);
    };
    loop();
};

watch(
    () => visible.value && mode.value === "error",
    (active) => {
        if (active) startAutoPoll();
        else stopAutoPoll();
    },
);

onUnmounted(stopAutoPoll);

let resolveFn: (() => void) | null = null;

const show = (
    options = {
        color: "",
        mode: "",
    },
) => {
    const { color = "#fff", mode: m = "normal" } = options;

    const isFirstShow = !visible.value;

    bgColor.value = color;
    mode.value = m as "error" | "normal";
    visible.value = true;
    z_index.value = 99999;

    return new Promise<void>((resolve) => {
        resolveFn = resolve;

        // 🟢 普通模式：右 → 左（动画开关关闭时瞬时完成）
        if (m === "normal") {
            gsap.fromTo(
                ".ws-root",
                { x: "100%" },
                {
                    x: "0%",
                    duration: animationsEnabled() ? 0.45 : 0.01,
                    ease: "power4.inOut",
                    onComplete: resolve,
                },
            );
        }

        // 🔴 ERROR：中心扩散
        else if (m === "error") {
            resolve();
        }
    });
};

const hide = () => {
    return new Promise<void>((resolve) => {
        gsap.to(".ws-root", {
            x: "-100%",
            duration: animationsEnabled() ? 0.6 : 0.01,
            ease: "power3.inOut",
            onComplete: () => {
                visible.value = false;
                resolve();
                resolveFn?.();
                resolveFn = null;
            },
        });
    });
};

defineExpose({
    show,
    hide,
    mode,
    visible,
});
</script>

<style scoped>
.ws-root {
    position: fixed;
    inset: 0;
    z-index: 999;
    display: flex;
    align-items: center;
    justify-content: center;
    user-select: none;
}

.ws-content {
    text-align: center;
    color: #fff;
    /*font-family: sans-serif;*/
    font-family: "黑体", serif;
}

.logo {
    color: white;
    font-family: "Arial Black", Gadget, sans-serif; /* 找一个粗壮的字体 */
    font-size: clamp(4rem, 15vw, 10rem);
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: -5px;

    /* 关键 1：透视变形 */
    /*transform: skew(20deg) scaleY(1.1);*/

    transform-origin: bottom center;
    animation: logoSwing 1s infinite;

    /* 关键 2：3D 挤压阴影 */
    /* 原理：向右下方每隔 1px 绘制一层红色阴影，最后加一层深色阴影增加立体感 */
    text-shadow:
        -1px 1px 0 #d71920,
        -2px 2px 0 #d71920,
        -3px 3px 0 #d71920,
        -4px 4px 0 #d71920,
        -5px 5px 0 #d71920,
        -6px 6px 0 #d71920,
        -7px 7px 0 #d71920,
        -8px 8px 0 #d71920,
        -9px 9px 0 #d71920,
        -10px 10px 0 #d71920,
        -11px 11px 2px rgba(0, 0, 0, 0.3); /* 最后的淡淡投影 */
}

@keyframes logoSwing {
    0% {
        transform: skew(20deg) scaleY(1.1);
    }

    25% {
        transform: skew(30deg) scaleY(1.3); /* 向上拉伸 */
    }

    50% {
        transform: skew(-00deg) scaleY(1.1); /* 切换到右倾 */
    }

    75% {
        transform: skew(-30deg) scaleY(1.3); /* 再拉伸 */
    }

    100% {
        transform: skew(20deg) scaleY(1.1); /* 回到起点 */
    }
}

.title {
    font-size: clamp(2rem, 5vw, 4rem);
    font-weight: bold;
    margin-bottom: 20px;
}

.subtitle {
    font-size: clamp(1.2rem, 3vw, 2.5rem);
    /*margin-bottom: 10px;*/
}

.desc {
    font-size: clamp(1rem, 2vw, 1.4rem);
    /*opacity: 0.85;*/
    margin-bottom: 40px;
}

.btn {
    display: inline-block;
    padding: clamp(10px, 1.5vw, 14px) clamp(30px, 4vw, 56px);
    border: 2px solid rgba(255, 255, 255, 0.6);
    font-size: clamp(1rem, 2vw, 1.2rem);
    /*border-radius: 6px;*/
    cursor: pointer;
    transition: 0.2s;
}

.btn:hover {
    background: rgba(255, 255, 255, 0.1);
}

.btn-group {
    display: flex;
    gap: 18px;
    justify-content: center;
}

/* 主操作：白底实心，在红屏上比幽灵按钮更醒目。
   放在 .btn:hover 之后，同特异性下覆盖它的半透明底色 */
.btn-primary {
    background: #fff;
    color: #d1383b;
    border-color: #fff;
}

.btn-primary:hover {
    background: rgba(255, 255, 255, 0.85);
}

/* 强制访问：悬浮时变成与左侧主按钮一致的白底实心，文字换成"不要！"。
   两层文本叠放在同一网格单元里，宽度取较宽者，悬浮切换不抖动；
   继承自 .btn 的过渡去掉，样式与文字瞬时切换 */
.btn-force {
    display: inline-grid;
    place-items: center;
    transition: none;
}

.btn-force span {
    grid-area: 1 / 1;
}

.btn-force .force-hover {
    visibility: hidden;
}

.btn-force:hover {
    background: #fff;
    color: #d1383b;
    border-color: #fff;
}

.btn-force:hover .force-default {
    visibility: hidden;
}

.btn-force:hover .force-hover {
    visibility: visible;
}

.btn.is-disabled {
    pointer-events: none;
    opacity: 0.7;
}

.retry-hint {
    margin-top: 16px;
    font-size: clamp(0.9rem, 1.6vw, 1.1rem);
    opacity: 0.85;
}
</style>
