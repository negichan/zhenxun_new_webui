<script setup lang="ts">
import { ref } from "vue";
import {
    Bell,
    Check,
    Pencil,
    Search,
    Settings,
    SlidersHorizontal,
    Trash2,
} from "lucide-vue-next";
import {
    ZXConfetti,
    ZXMessageBox,
    ZXNotification,
} from "@/services/ui";
import { openContextMenu } from "@/components/zxcomponent/ContextMenu";
import ZXInput from "@/components/zxcomponent/ZXInput.vue";
import { ZXDropdown } from "@/components/zxcomponent/ZXDropdown";
import MiniDatePicker from "@/components/zxcomponent/MiniDatePicker.vue";
import ZXTextEditor from "@/components/ZXTextEditor";

// ==================== 通用语义色角色 ====================
const roles = [
    { variant: "primary", name: "primary", desc: "品牌强调、选中态" },
    { variant: "success", name: "success", desc: "启用、完成、在线" },
    { variant: "warning", name: "warning", desc: "注意、待处理" },
    { variant: "danger", name: "danger", desc: "错误、删除" },
    { variant: "info", name: "info", desc: "提示、版本" },
    { variant: "neutral", name: "neutral", desc: "禁用、占位" },
    { variant: "purple", name: "purple", desc: "特殊分类" },
    { variant: "cyan", name: "cyan", desc: "数据类" },
] as const;

// ==================== 演示状态 ====================
const demoInput = ref("");
const demoDate = ref("");
const demoSwitch = ref(false);
const demoDropdown = ref("a");
const demoCode = ref(
    '{\n  "name": "zhenxun_webui",\n  "framework": "vue3 + ts"\n}',
);

const dropdownOptions = [
    { label: "选项一", value: "a" },
    { label: "选项二", value: "b" },
    { label: "选项三", value: "c" },
];

const contextMenuItems = [
    {
        label: "编辑",
        icon: Pencil,
        action: () => ZXNotification({ title: "编辑", type: "info" }),
    },
    {
        label: "删除",
        icon: Trash2,
        action: () => ZXNotification({ title: "删除", type: "warning" }),
    },
];

// ==================== 侧边导航 ====================
const navItems = [
    { id: "token-color", label: "语义色 Token" },
    { id: "zx-tag", label: "徽标 ZxTag" },
    { id: "button", label: "按钮 Button" },
    { id: "input", label: "输入 Input" },
    { id: "dropdown", label: "下拉 ZXDropdown" },
    { id: "datepicker", label: "日期 MiniDatePicker" },
    { id: "switch", label: "开关 Switch" },
    { id: "notification", label: "通知 ZXNotification" },
    { id: "confetti", label: "彩带 ZXConfetti" },
    { id: "contextmenu", label: "右键菜单 ContextMenu" },
    { id: "messagebox", label: "确认框 ZXMessageBox" },
    { id: "editor", label: "编辑器 ZXTextEditor" },
];

const scrollTo = (id: string) => {
    document
        .getElementById(id)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
};

const demoConfirm = () => {
    ZXMessageBox({
        title: "确认弹窗示例",
        message: "这是一个 ZXMessageBox 确认框示例",
        cancelButtonText: "取消",
        onConfirm: () => {},
    });
};

const demoDanger = () => {
    ZXMessageBox({
        title: "危险操作示例",
        message: "确定要删除这条数据吗？此操作不可恢复。",
        cancelButtonText: "取消",
        confirmButtonText: "删除",
        confirmButtonHoverBg: "bg-red-500 hover:bg-red-600",
        onConfirm: () => {},
    });
};
</script>

<template>
    <div class="mx-auto flex max-w-6xl gap-8 p-4">
        <!-- 侧边导航 -->
        <aside class="hidden w-44 shrink-0 lg:block">
            <div class="sticky top-6 space-y-1">
                <p
                    class="pb-2 text-xs font-semibold tracking-wider text-slate-400 uppercase"
                >
                    组件目录
                </p>
                <button
                    v-for="item in navItems"
                    :key="item.id"
                    class="btn-touch block w-full cursor-pointer rounded-xl px-3 py-1.5 text-left text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-zx-primary"
                    type="button"
                    @click="scrollTo(item.id)"
                >
                    {{ item.label }}
                </button>
            </div>
        </aside>

        <!-- 内容区 -->
        <div class="min-w-0 flex-1 space-y-8">
            <div
                class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
                <h2 class="text-lg font-bold text-gray-800">通用组件库</h2>
                <p class="mt-1 text-sm text-gray-500">
                    设计规范文档见仓库根目录
                    <code class="rounded bg-slate-100 px-1.5 py-0.5">DESIGN.md</code
                    >。通用组件源码在
                    <code class="rounded bg-slate-100 px-1.5 py-0.5"
                        >src/components/zxcomponent/</code
                    >。
                </p>
            </div>

            <!-- 语义色 -->
            <section
                id="token-color"
                class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
                <h3 class="text-base font-bold text-gray-800">语义色 Token</h3>
                <p class="mt-1 text-xs text-gray-400">
                    所有徽标/强调色从这几个角色选，主题无关、页面通用。
                </p>
                <div
                    class="demo-area mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"
                >
                    <div
                        v-for="role in roles"
                        :key="role.variant"
                        class="overflow-hidden rounded-2xl border border-slate-200"
                    >
                        <div
                            class="h-10 w-full"
                            :class="
                                role.variant === 'primary'
                                    ? 'bg-zx-primary'
                                    : ''
                            "
                            :style="
                                role.variant === 'primary'
                                    ? undefined
                                    : {
                                          background:
                                              role.variant === 'success'
                                                  ? '#22c55e'
                                                  : role.variant === 'warning'
                                                    ? '#f59e0b'
                                                    : role.variant === 'danger'
                                                      ? '#ef4444'
                                                      : role.variant === 'info'
                                                        ? '#3b82f6'
                                                        : role.variant ===
                                                              'neutral'
                                                          ? '#9ca3af'
                                                          : role.variant ===
                                                                'purple'
                                                          ? '#8b5cf6'
                                                          : '#06b6d4',
                                      }
                            "
                        ></div>
                        <div class="p-2.5">
                            <p
                                class="font-mono text-xs font-semibold text-slate-700"
                            >
                                {{ role.name }}
                            </p>
                            <p class="mt-0.5 text-[11px] text-slate-400">
                                {{ role.desc }}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- ZxTag -->
            <section
                id="zx-tag"
                class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
                <h3 class="text-base font-bold text-gray-800">徽标 ZxTag</h3>
                <p class="mt-1 text-xs text-gray-400">
                    实色底 + 主题 on-* 对比字，跟随主题语义变量，深浅主题自动适配。
                    h-[22px] 胶囊；自定义品牌色走 color prop（实底 + 亮度对比字）。
                </p>
                <div class="demo-area mt-4 flex flex-wrap items-center gap-2">
                    <ZxTag
                        v-for="role in roles"
                        :key="role.variant"
                        :variant="role.variant"
                        >{{ role.name }}</ZxTag
                    >
                    <ZxTag color="#0ea5e9">自定义色</ZxTag>
                </div>
                <p
                    class="mt-3 rounded-xl bg-slate-50 p-3 font-mono text-xs text-slate-500"
                >
                    &lt;ZxTag variant="success"&gt;已启用&lt;/ZxTag&gt;
                </p>
            </section>

            <!-- 按钮 -->
            <section
                id="button"
                class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
                <h3 class="text-base font-bold text-gray-800">按钮 Button</h3>
                <p class="mt-1 text-xs text-gray-400">
                    统一用 ZxButton（自动注册）；一律胶囊形 rounded-full，内置
                    btn-touch、cursor-pointer 与禁用态。特殊交互形态仍手写。
                </p>
                <div class="demo-area mt-4 flex flex-wrap items-center gap-3">
                    <ZxButton>主按钮</ZxButton>
                    <ZxButton variant="ghost">次按钮</ZxButton>
                    <ZxButton variant="outline">描边按钮</ZxButton>
                    <ZxButton variant="danger">危险按钮</ZxButton>
                    <ZxButton variant="ghost" circle>
                        <Settings class="h-4 w-4" />
                    </ZxButton>
                </div>
                <div
                    class="demo-area mt-3 flex flex-wrap items-center gap-3"
                >
                    <ZxButton size="sm">小按钮</ZxButton>
                    <ZxButton variant="outline" size="sm">描边小按钮</ZxButton>
                    <ZxButton variant="ghost" circle size="sm">
                        <Settings class="h-4 w-4" />
                    </ZxButton>
                    <ZxButton disabled>禁用</ZxButton>
                    <ZxButton variant="outline" disabled>禁用描边</ZxButton>
                </div>
            </section>

            <!-- 输入 -->
            <section
                id="input"
                class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
                <h3 class="text-base font-bold text-gray-800">输入 Input</h3>
                <p class="mt-1 text-xs text-gray-400">
                    文本输入用 ZXInput；搜索类胶囊输入框按页面工具栏样式。
                </p>
                <div class="demo-area mt-4 flex flex-wrap items-center gap-4">
                    <div class="w-56">
                        <ZXInput
                            v-model="demoInput"
                            placeholder="ZXInput 输入框"
                        />
                    </div>
                    <div
                        class="flex min-w-0 flex-1 items-center gap-1 rounded-full border border-slate-200 bg-slate-50 py-1.5 pl-3.5 pr-1.5 transition-colors focus-within:bg-white"
                    >
                        <Search class="h-4 w-4 shrink-0 text-slate-400" />
                        <input
                            type="text"
                            placeholder="搜索…"
                            class="min-w-0 flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                        />
                    </div>
                </div>
            </section>

            <!-- 下拉 -->
            <section
                id="dropdown"
                class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
                <h3 class="text-base font-bold text-gray-800">
                    下拉 ZXDropdown
                </h3>
                <p class="mt-1 text-xs text-gray-400">
                    面板 Teleport 到 body，触发器样式通过 triggerClass 定制。
                </p>
                <div class="demo-area mt-4 flex flex-wrap items-center gap-3">
                    <ZXDropdown
                        v-model="demoDropdown"
                        :options="dropdownOptions"
                        trigger-class="btn-touch flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 text-sm text-slate-600 transition-colors hover:border-slate-300"
                    />
                    <span class="text-xs text-slate-400">
                        当前值：{{ demoDropdown }}
                    </span>
                </div>
            </section>

            <!-- 日期 -->
            <section
                id="datepicker"
                class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
                <h3 class="text-base font-bold text-gray-800">
                    日期 MiniDatePicker
                </h3>
                <p class="mt-1 text-xs text-gray-400">
                    自制日历（不依赖 el-date-picker），月份切换 + 今日高亮 + 清除。
                </p>
                <div class="demo-area mt-4 flex flex-wrap items-center gap-4">
                    <div class="w-44">
                        <MiniDatePicker v-model="demoDate" />
                    </div>
                    <span v-if="demoDate" class="text-xs text-slate-400">
                        已选：{{ demoDate }}
                    </span>
                </div>
            </section>

            <!-- 开关 -->
            <section
                id="switch"
                class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
                <h3 class="text-base font-bold text-gray-800">开关 Switch</h3>
                <p class="mt-1 text-xs text-gray-400">
                    Tailwind peer 写法，选中 bg-zx-primary。
                </p>
                <div class="demo-area mt-4 flex items-center gap-4">
                    <label
                        class="relative inline-flex cursor-pointer items-center"
                    >
                        <input
                            v-model="demoSwitch"
                            type="checkbox"
                            class="peer sr-only"
                        />
                        <div
                            class="h-6 w-11 rounded-full bg-slate-200 transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-all peer-checked:bg-zx-primary peer-checked:after:translate-x-full"
                        ></div>
                    </label>
                    <span class="text-sm text-slate-500">
                        {{ demoSwitch ? "已开启" : "已关闭" }}
                    </span>
                </div>
            </section>

            <!-- 通知 -->
            <section
                id="notification"
                class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
                <h3 class="text-base font-bold text-gray-800">
                    通知 ZXNotification
                </h3>
                <p class="mt-1 text-xs text-gray-400">
                    支持 success/error/warning/info
                    四类，头像模式用于 bot 上下线等场景，confetti
                    可附带彩带特效。
                </p>
                <div class="demo-area mt-4 flex flex-wrap gap-3">
                    <button
                        class="btn-touch cursor-pointer rounded-full bg-green-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600"
                        type="button"
                        @click="
                            ZXNotification({
                                title: '成功啦~',
                                message: '操作已完成 ♪(´▽｀)',
                                type: 'success',
                            })
                        "
                    >
                        success
                    </button>
                    <button
                        class="btn-touch cursor-pointer rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
                        type="button"
                        @click="
                            ZXNotification({
                                title: '失败啦',
                                message: '网络请求失败了 (´；ω；`)',
                                type: 'error',
                            })
                        "
                    >
                        error
                    </button>
                    <button
                        class="btn-touch cursor-pointer rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600"
                        type="button"
                        @click="
                            ZXNotification({
                                title: '注意',
                                message: '还有未保存的修改哦',
                                type: 'warning',
                            })
                        "
                    >
                        warning
                    </button>
                    <button
                        class="btn-touch cursor-pointer rounded-full bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
                        type="button"
                        @click="
                            ZXNotification({
                                title: '提示',
                                message: '这是一条普通信息',
                                type: 'info',
                            })
                        "
                    >
                        info
                    </button>
                    <button
                        class="btn-touch cursor-pointer rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition-colors hover:border-slate-300"
                        type="button"
                        @click="
                            ZXNotification({
                                title: 'Mio',
                                subtitle: '2682007174',
                                avatar:
                                    'https://q1.qlogo.cn/g?b=qq&nk=3625646420&s=640',
                                message: '上线了',
                                type: 'success',
                            })
                        "
                    >
                        头像模式
                    </button>
                    <button
                        class="btn-touch cursor-pointer rounded-full bg-zx-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zx-primary-hover"
                        type="button"
                        @click="
                            ZXNotification({
                                title: '成功啦~',
                                message: '附带彩带特效',
                                type: 'success',
                                confetti: true,
                            })
                        "
                    >
                        confetti
                    </button>
                </div>
            </section>

            <!-- 彩带 -->
            <section
                id="confetti"
                class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
                <h3 class="text-base font-bold text-gray-800">
                    彩带 ZXConfetti
                </h3>
                <p class="mt-1 text-xs text-gray-400">
                    自挂载组件，ZXConfetti.success()/fireworks()/error()
                    直接调用，在鼠标位置爆开。
                </p>
                <div class="demo-area mt-4 flex flex-wrap gap-3">
                    <button
                        class="btn-touch cursor-pointer rounded-full bg-zx-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zx-primary-hover"
                        type="button"
                        @click="ZXConfetti.success()"
                    >
                        success
                    </button>
                    <button
                        class="btn-touch cursor-pointer rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition-colors hover:border-slate-300"
                        type="button"
                        @click="ZXConfetti.fireworks()"
                    >
                        fireworks
                    </button>
                    <button
                        class="btn-touch cursor-pointer rounded-full px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-50 hover:text-red-500"
                        type="button"
                        @click="ZXConfetti.error()"
                    >
                        error
                    </button>
                </div>
            </section>

            <!-- 右键菜单 -->
            <section
                id="contextmenu"
                class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
                <h3 class="text-base font-bold text-gray-800">
                    右键菜单 ContextMenu
                </h3>
                <p class="mt-1 text-xs text-gray-400">
                    元素上绑定
                    @contextmenu，选中文字时会自动附加"复制"项。全局已接管右键。
                </p>
                <div
                    class="demo-area mt-4 flex h-24 cursor-context-menu items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-400 select-none"
                    @contextmenu="
                        openContextMenu($event, contextMenuItems)
                    "
                >
                    在这块区域右键试试
                </div>
            </section>

            <!-- 确认框 -->
            <section
                id="messagebox"
                class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
                <h3 class="text-base font-bold text-gray-800">
                    确认框 ZXMessageBox
                </h3>
                <p class="mt-1 text-xs text-gray-400">
                    支持 slots.default 自定义内容、危险按钮 confirmButtonHoverBg。
                </p>
                <div class="demo-area mt-4 flex flex-wrap gap-3">
                    <button
                        class="btn-touch cursor-pointer rounded-full bg-zx-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-zx-primary-hover"
                        @click="demoConfirm"
                    >
                        确认框
                    </button>
                    <button
                        class="btn-touch cursor-pointer rounded-full px-5 py-2 text-sm text-red-400 transition-colors hover:bg-red-50 hover:text-red-500"
                        @click="demoDanger"
                    >
                        危险确认框
                    </button>
                </div>
            </section>

            <!-- 编辑器 -->
            <section
                id="editor"
                class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
                <h3 class="text-base font-bold text-gray-800">
                    编辑器 ZXTextEditor
                </h3>
                <p class="mt-1 text-xs text-gray-400">
                    轻量代码编辑器（textarea 实现），支持 language / readonly /
                    hideToolbar。
                </p>
                <div class="demo-area mt-4">
                    <ZXTextEditor
                        v-model="demoCode"
                        language="json"
                        :hide-toolbar="true"
                    />
                </div>
            </section>

        </div>
    </div>
</template>

<style scoped>
.demo-area {
    border-radius: 1rem;
    border: 1px solid var(--zx-color-border-soft, #f1f5f9);
    background: var(--zx-color-surface-muted, #f8fafc);
    padding: 1.25rem;
}
</style>
