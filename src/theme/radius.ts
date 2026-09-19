/**
 * 全局卡片圆角覆写（设置 → 外观）。
 *
 * Tailwind 的 rounded-3xl 经 @theme 接到 --radius-3xl，而 --radius-3xl
 * 指向运行时变量 --zx-radius-card（主题预设也会写它）。用户覆写存在
 * localStorage，applyTheme 末尾重放，保证换肤不丢设置；无覆写时回写
 * 当前预设自带的值（而不是 removeProperty 抹掉内联样式）。
 */
const RADIUS_KEY = "zhenxun-radius-card";

/** null = 跟随主题预设 */
export const getRadiusOverride = (): number | null => {
    const raw = localStorage.getItem(RADIUS_KEY);
    if (raw === null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
};

/** 当前主题预设声明的 --zx-radius-card（由 applyTheme 同步进来） */
let presetValue: string | undefined;

/** 把生效值写到根元素：用户覆写优先，否则回写预设值 */
export const applyRadiusOverride = () => {
    const root = document.documentElement;
    const v = getRadiusOverride();
    if (v !== null) root.style.setProperty("--zx-radius-card", `${v}px`);
    else if (presetValue) root.style.setProperty("--zx-radius-card", presetValue);
    else root.style.removeProperty("--zx-radius-card");
};

/** applyTheme 写完 cssVars 后调用：记录预设值并重放生效逻辑 */
export const setPresetRadiusValue = (value?: string) => {
    presetValue = value;
    applyRadiusOverride();
};

export const setRadiusOverride = (v: number | null) => {
    if (v === null) localStorage.removeItem(RADIUS_KEY);
    else localStorage.setItem(RADIUS_KEY, String(v));
    applyRadiusOverride();
};
