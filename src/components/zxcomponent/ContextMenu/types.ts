import type { Component } from "vue";

export interface ZXContextMenuItem {
    /** 菜单项文字 */
    label: string;
    /** 可选图标（lucide 组件） */
    icon?: Component;
    /** 危险操作样式（红色） */
    danger?: boolean;
    /** 成功/恢复类操作样式（绿色） */
    success?: boolean;
    /** 分组分隔线（JetBrains 风格，不可点击） */
    divider?: boolean;
    disabled?: boolean;
    /** 点击回调，菜单会先关闭再执行 */
    action?: () => void;
    /** 二级子菜单（悬停展开） */
    children?: ZXContextMenuItem[];
    /** 显示快捷键文案 */
    shortcut?: string;
}

export interface ZXContextMenuOptions {
    /** 打开位置（视口坐标，通常用鼠标事件 clientX/clientY） */
    x: number;
    y: number;
    items: ZXContextMenuItem[];
}

/** JetBrains 式功能分组分隔线 */
export const menuSep = (): ZXContextMenuItem => ({
    label: "",
    divider: true,
    disabled: true,
});
