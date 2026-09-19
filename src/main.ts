import { createApp } from "vue";
import "./assets/style.css";
import App from "./App.vue";
import { router } from "@/router";
import { createPinia } from "pinia";
import { registerEvent } from "@/events";
import { vOdometer } from "@/directives/odometer.ts";
import { initTileGlowAuto, vTileGlow } from "@/directives/tileGlow";
import { vImageViewer } from "@/directives/imageViewer";
import { useThemeStore } from "@/store/theme";
import { useGlobalStore } from "@/store/global.ts";
import { installOverlayStack } from "@/composables/useOverlayStack";

const app = createApp(App);
const pinia = createPinia();

app.use(router);
app.use(pinia);

useThemeStore(pinia).initTheme();
// 提前实例化 global store：动画开关的 html class 同步要在登录页等
// 尚无人使用该 store 的页面也生效
useGlobalStore(pinia);

// 全局浮层栈：多层弹窗点外部/Esc 只关最上层
installOverlayStack();

app.directive("odometer", vOdometer);
app.directive("tile-glow", vTileGlow);
app.directive("image-viewer", vImageViewer);

app.mount("#app");

// 统一边框表面（卡片/浮层菜单/模态框/通知/侧边栏按钮）自动获得磁贴发光
initTileGlowAuto();

registerEvent();

//解决edge最小化问题(要放在引入router之后)
if (navigator.userAgent.includes("Edg/")) {
    window.history.replaceState = function (state, title, url) {
        return;
    };
}


