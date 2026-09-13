/**
 * GSAP 驱动的 Vue <Transition> 进出场钩子库。
 *
 * 背景：项目里的 CSS 过渡（modal-jelly、各弹出层）统一改为 GSAP 驱动，
 * 采用 Home 页面切换已验证的 `:css="false"` + JS 钩子模式。
 * - 微交互（hover/状态过渡）保持 CSS，由全局动画开关（zx-no-anim）压平；
 * - 这里的进出场钩子各自尊重动画开关：关闭时直接落位/让位，不播动画。
 *
 * 用法（预设已内置，直接用共享实例）：
 *   <Transition :css="false" @enter="modalJelly.onEnter" @leave="modalJelly.onLeave">
 *   <script>import { modalJelly } from "@/composables/useGsapTransition";</script>
 */
import { gsap } from "gsap";
import { animationsEnabled } from "@/store/global";

type Vars = gsap.TweenVars;

export interface TransitionPreset {
    /** 进场：from 起始态；to 为目标态（数组 = GSAP 关键帧，各项自带 duration） */
    enter: {
        from: Vars;
        to: Vars | Vars[];
        duration: number;
        ease?: string;
        transformOrigin?: string;
    };
    /** 离场目标态 */
    leave: {
        to: Vars;
        duration: number;
        ease?: string;
        transformOrigin?: string;
    };
    /** 根元素内同步淡入淡出的遮罩选择器（如弹窗的 .glass-overlay） */
    overlaySelector?: string;
    overlayEnterDuration?: number;
    overlayLeaveDuration?: number;
}

export function createTransitionHooks(preset: TransitionPreset) {
    const onEnter = (el: Element, done: () => void) => {
        if (!animationsEnabled()) {
            done();
            return;
        }
        const overlay = preset.overlaySelector
            ? el.querySelector(preset.overlaySelector)
            : null;
        if (overlay) {
            gsap.fromTo(
                overlay,
                { opacity: 0 },
                {
                    opacity: 1,
                    duration: preset.overlayEnterDuration ?? 0.35,
                    ease: "power1.out",
                },
            );
        }
        const to = Array.isArray(preset.enter.to)
            ? { keyframes: preset.enter.to, ease: "none" }
            : {
                  ...preset.enter.to,
                  ease: preset.enter.ease ?? "power2.out",
                  duration: preset.enter.duration,
              };
        gsap.fromTo(el, preset.enter.from, {
            ...to,
            onComplete: () => {
                // 清掉内联 transform/opacity，避免影响元素自身的响应式变换
                gsap.set(el, { clearProps: "transform,opacity" });
                done();
            },
        });
    };

    const onLeave = (el: Element, done: () => void) => {
        if (!animationsEnabled()) {
            done();
            return;
        }
        const overlay = preset.overlaySelector
            ? el.querySelector(preset.overlaySelector)
            : null;
        if (overlay) {
            gsap.to(overlay, {
                opacity: 0,
                duration: preset.overlayLeaveDuration ?? 0.25,
                ease: "power1.in",
            });
        }
        gsap.to(el, {
            ...preset.leave.to,
            transformOrigin: preset.leave.transformOrigin,
            duration: preset.leave.duration,
            ease: preset.leave.ease ?? "power2.in",
            onComplete: done,
        });
    };

    return { onEnter, onLeave };
}

/** 弹窗果冻进出场（原 custom.css 的 modal-jelly，关键帧 1:1 复刻） */
export const modalJelly = createTransitionHooks({
    enter: {
        from: { opacity: 0, y: -28, scale: 0.72, rotation: -1.5 },
        to: [
            {
                opacity: 1,
                y: 0,
                scale: 1.04,
                rotation: 0.4,
                duration: 0.175,
                ease: "power3.out",
            },
            { scale: 0.98, rotation: -0.2, duration: 0.125, ease: "sine.inOut" },
            { scale: 1, rotation: 0, duration: 0.2, ease: "sine.inOut" },
        ],
        duration: 0.5,
    },
    leave: { to: { opacity: 0, y: 12, scale: 0.9 }, duration: 0.25 },
    overlaySelector: ".glass-overlay",
    overlayEnterDuration: 0.35,
    overlayLeaveDuration: 0.25,
});

/** 下拉菜单（原 User.vue 的 dropdown：顶部锚点缩放淡入） */
export const dropdownPop = createTransitionHooks({
    enter: {
        from: { opacity: 0, y: -6, scale: 0.98 },
        to: { opacity: 1, y: 0, scale: 1 },
        duration: 0.18,
        ease: "power1.out",
        transformOrigin: "top center",
    },
    leave: {
        to: { opacity: 0, y: -6, scale: 0.98 },
        duration: 0.18,
        ease: "power1.in",
        transformOrigin: "top center",
    },
});

/** 通用小弹出层（原 ZXDropdown 的 zx-dd-pop） */
export const zxDDPop = createTransitionHooks({
    enter: {
        from: { opacity: 0, scale: 0.92, y: -4 },
        to: { opacity: 1, scale: 1, y: 0 },
        duration: 0.12,
        ease: "power1.out",
    },
    leave: {
        to: { opacity: 0, scale: 0.92, y: -4 },
        duration: 0.12,
        ease: "power1.in",
    },
});

/** 右键菜单（原 ContextMenu 的 ctx-pop，与 zx-dd-pop 同款） */
export const ctxPop = zxDDPop;

/** 取色器弹出（原 ColorPicker 的 picker-pop：进场带轻微回弹） */
export const pickerPop = createTransitionHooks({
    enter: {
        from: { opacity: 0, y: 8 },
        to: { opacity: 1, y: 0 },
        duration: 0.2,
        ease: "back.out(1.75)",
    },
    leave: { to: { opacity: 0, y: 4 }, duration: 0.12, ease: "power1.in" },
});
