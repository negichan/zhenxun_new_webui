import { createApp, h } from "vue";
import { router } from "@/router";
import { auth } from "@/utils/auth";
import WhiteScreen from "./WhiteScreen.vue";
import { WHITE_SCREEN_ENABLED } from "virtual:white-screen";

let vm: any = null;

function ensure() {
    if (vm) return vm;

    const container = document.createElement("div");
    document.body.appendChild(container);

    const app = createApp({
        render() {
            return h(WhiteScreen, {
                ref: (el: any) => (vm = el),
            });
        },
    });

    app.mount(container);
    return vm;
}

// 白屏开关关闭（vite.config.ts 的 WHITE_SCREEN = false）时
// 白幕与红屏全部成为空操作，登录流程也不再被红屏拦截
export const whiteScreen = {
    async in() {
        if (!WHITE_SCREEN_ENABLED) return;
        const vm = ensure();
        await vm.show({ color: "#fff", mode: "normal" });
    },

    async out() {
        if (!WHITE_SCREEN_ENABLED) return;
        if (!vm) return;
        // 红屏（未检测到协议端）只能通过它自己的按钮或模拟端接入流程关闭，
        // 首页挂载时的自动揭开不能把红屏带掉（否则红屏一闪而过直接进首页）
        if (vm.visible && vm.mode === "error") return;
        await vm.hide();
    },

    async error() {
        if (!WHITE_SCREEN_ENABLED) return;
        const vm = ensure();
        await vm.show({
            color: "#D1383B",
            mode: "error",
        });
        // 红屏即未登录状态：主站内弹的红屏把路由退回登录页
        // （token 保留不清除，协议端接入后自动走白幕登录动线进主站）；
        // 守卫会拦"已登录去登录页"，先打上红屏拦截态标记放行
        auth.setWhiteGate();
        if (router.currentRoute.value.name !== "Login") {
            router.push("/login");
        }
    },
};
