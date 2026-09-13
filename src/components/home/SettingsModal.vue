<script setup lang="ts">
import { modalJelly } from "@/composables/useGsapTransition";
import { ref } from "vue";
import type { Component } from "vue";
import { X, LogOut, Settings, Palette, Wrench } from "lucide-vue-next";
import { auth } from "@/utils/auth.ts";
import { useGlobalStore } from "@/store/global.ts";
import { ZXMessageBox } from "@/services/ui";
import { router } from "@/router/index.js";
import { version } from "@/version";

interface Props {
    visible: boolean;
}

defineProps<Props>();
const emit = defineEmits<{ close: [] }>();

// 设置分类：往里加内容时先在这里注册一个分区，再到模板对应分支填内容
interface Section {
    id: string;
    label: string;
    icon: Component;
}

const sections: Section[] = [
    { id: "general", label: "通用", icon: Wrench },
    { id: "appearance", label: "外观", icon: Palette },
];

const activeSection = ref<string>(sections[0].id);

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
                class="fixed inset-0 z-50 flex items-center justify-center"
            >
                <div
                    class="glass-overlay absolute h-full w-full"
                    @click.self="emit('close')"
                ></div>
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
                                <div
                                    class="flex items-center justify-between gap-4 rounded-2xl bg-[var(--zx-color-surface-muted)] px-4 py-3"
                                >
                                    <div class="min-w-0">
                                        <p
                                            class="text-sm font-medium text-[var(--zx-color-text)]"
                                        >
                                            动画效果
                                        </p>
                                        <p
                                            class="mt-0.5 text-xs text-[var(--zx-color-text-muted)]"
                                        >
                                            关闭后禁用过渡与动画，适合低性能设备
                                        </p>
                                    </div>
                                    <label
                                        class="relative inline-block h-6 w-11 shrink-0 cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            class="peer sr-only"
                                            :checked="
                                                globalStore.animationsEnabled
                                            "
                                            @change="
                                                globalStore.setAnimationsEnabled(
                                                    ($event.target as HTMLInputElement)
                                                        .checked,
                                                )
                                            "
                                        />
                                        <span
                                            class="absolute inset-0 rounded-full bg-slate-300 transition-colors peer-checked:bg-zx-primary"
                                        ></span>
                                        <span
                                            class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5"
                                        ></span>
                                    </label>
                                </div>
                            </template>

                            <!-- 外观：待填充 -->
                            <template v-else-if="activeSection === 'appearance'">
                                <p
                                    class="text-center text-xs text-[var(--zx-color-text-subtle)]"
                                >
                                    暂无设置项
                                </p>
                            </template>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>
