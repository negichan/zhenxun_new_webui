import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";

const ANIM_KEY = "animationsEnabled";

/** 全局动画开关的默认值：未设置过时跟随系统 prefers-reduced-motion */
function defaultAnimationsEnabled(): boolean {
    const stored = localStorage.getItem(ANIM_KEY);
    if (stored !== null) return stored === "1";
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** 供非响应式上下文（独立 app 实例、服务模块）读取的轻量判断 */
export function animationsEnabled(): boolean {
    return defaultAnimationsEnabled();
}

export const useGlobalStore = defineStore("global", () => {
    const navMini = ref(false);
    const navHidden = ref(false); // 默认显示侧边栏
    // 当前是否为移动模式（由窗口宽度决定，<640px 为移动模式）
    const isMobileMode = ref(false);
    const wsConnected = ref(false);
    const isTableMode = ref(false);

    // 动画开关（低性能设备适配）：关闭后 html 挂 zx-no-anim 压平所有
    // CSS 过渡/动画，GSAP 驱动的重动画各自短路（见各处守卫）
    const animationsEnabled = ref(defaultAnimationsEnabled());

    function setAnimationsEnabled(enabled: boolean): void {
        animationsEnabled.value = enabled;
        localStorage.setItem(ANIM_KEY, enabled ? "1" : "0");
    }

    watch(
        animationsEnabled,
        (enabled) => {
            document.documentElement.classList.toggle("zx-no-anim", !enabled);
        },
        { immediate: true },
    );

    const isDesktopMode = computed(
        () => !(isMobileMode.value || isTableMode.value),
    );

    const activeMenuKey = ref<string>("dashboard");

    function setActiveMenuKey(this: any, activeMenuKey: string): void {
        this.activeMenuKey = activeMenuKey;
    }

    return {
        navMini,
        navHidden,
        isMobileMode,
        activeMenuKey,
        isDesktopMode,
        setActiveMenuKey,
        wsConnected,
        isTableMode,
        animationsEnabled,
        setAnimationsEnabled,
    };
});
