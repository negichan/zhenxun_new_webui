/**
 * monaco 主题：用应用主题变量定义 zx-light / zx-dark。
 * 各语言语法高亮规则及分词器定义已按模块拆分到 ./languages/ 目录中，
 * 方便独立维护与按需扩充。
 */
import type * as MonacoNamespace from "monaco-editor/editor/editor.api";
import {
    getAllDarkRules,
    getAllLightRules,
    registerAllLanguages,
} from "./languages";

export { registerAllLanguages, registerAllLanguages as registerLanguageEnhancements } from "./languages";
export * from "./languages";

const cssVar = (name: string, fallback: string) =>
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    fallback;

export const defineZxThemes = (monaco: typeof MonacoNamespace) => {
    registerAllLanguages(monaco);

    const commonColors = () => ({
        "editorLineNumber.activeForeground": cssVar(
            "--zx-color-primary",
            "#3b82f6",
        ),
        "editorCursor.foreground": cssVar(
            "--zx-color-primary",
            "#3b82f6",
        ),
        "editorBracketMatch.border": cssVar(
            "--zx-color-primary",
            "#3b82f6",
        ),
        "editorIndentGuide.activeBackground": cssVar(
            "--zx-color-primary",
            "#3b82f6",
        ),
        "scrollbarSlider.background": cssVar(
            "--zx-color-border",
            "#cbd5e1",
        ),
        "scrollbarSlider.hoverBackground": cssVar(
            "--zx-slate-300",
            "#94a3b8",
        ),
        "scrollbarSlider.activeBackground": cssVar(
            "--zx-slate-400",
            "#64748b",
        ),
        "scrollbar.shadow": "#00000000",
    });

    monaco.editor.defineTheme("zx-light", {
        base: "vs",
        inherit: true,
        rules: getAllLightRules(),
        colors: {
            ...commonColors(),
            "editor.background": cssVar("--zx-color-surface", "#ffffff"),
            "editor.foreground": cssVar("--zx-color-text-strong", "#1e293b"),
            "editorLineNumber.foreground": cssVar(
                "--zx-color-text-subtle",
                "#94a3b8",
            ),
            "editorIndentGuide.background": cssVar(
                "--zx-color-border",
                "#e2e8f0",
            ),
            "editor.lineHighlightBackground": "#00000008",
            "editor.selectionBackground": "#3b82f628",
            "editor.inactiveSelectionBackground": "#3b82f614",
            "editorBracketMatch.background": "#3b82f618",

            // 浅色主题 6 级彩虹括号色彩（层次分明，清晰醒目）
            "editorBracketHighlight.foreground1": "#b8860b",
            "editorBracketHighlight.foreground2": "#8a2be2",
            "editorBracketHighlight.foreground3": "#0066cc",
            "editorBracketHighlight.foreground4": "#008080",
            "editorBracketHighlight.foreground5": "#cf222e",
            "editorBracketHighlight.foreground6": "#6f42c1",
            "editorBracketHighlight.unexpectedBracket.foreground": "#cf222e",

            // 活跃彩虹对齐导轨
            "editorBracketPairGuide.activeBackground1": "#b8860b88",
            "editorBracketPairGuide.activeBackground2": "#8a2be288",
            "editorBracketPairGuide.activeBackground3": "#0066cc88",
            "editorBracketPairGuide.activeBackground4": "#00808088",
            "editorBracketPairGuide.activeBackground5": "#cf222e88",
            "editorBracketPairGuide.activeBackground6": "#6f42c188",

            // 常规彩虹对齐导轨
            "editorBracketPairGuide.background1": "#b8860b24",
            "editorBracketPairGuide.background2": "#8a2be224",
            "editorBracketPairGuide.background3": "#0066cc24",
            "editorBracketPairGuide.background4": "#00808024",
            "editorBracketPairGuide.background5": "#cf222e24",
            "editorBracketPairGuide.background6": "#6f42c124",
        },
    });

    monaco.editor.defineTheme("zx-dark", {
        base: "vs-dark",
        inherit: true,
        rules: getAllDarkRules(),
        colors: {
            ...commonColors(),
            "editor.background": cssVar("--zx-color-surface", "#1e1e1e"),
            "editor.foreground": cssVar("--zx-color-text-strong", "#e2e8f0"),
            "editorLineNumber.foreground": cssVar(
                "--zx-color-text-subtle",
                "#64748b",
            ),
            "editorIndentGuide.background": cssVar(
                "--zx-color-border",
                "#334155",
            ),
            "editor.lineHighlightBackground": "#ffffff0a",
            "editor.selectionBackground": "#3b82f640",
            "editor.inactiveSelectionBackground": "#3b82f620",
            "editorBracketMatch.background": "#3b82f630",

            // 深色主题 6 级彩虹括号色彩（One Dark 经典彩虹色，饱和亮丽）
            "editorBracketHighlight.foreground1": "#ffd700",
            "editorBracketHighlight.foreground2": "#da70d6",
            "editorBracketHighlight.foreground3": "#179fff",
            "editorBracketHighlight.foreground4": "#4ec9b0",
            "editorBracketHighlight.foreground5": "#ff7b72",
            "editorBracketHighlight.foreground6": "#d2a8ff",
            "editorBracketHighlight.unexpectedBracket.foreground": "#f85149",

            // 活跃彩虹对齐导轨
            "editorBracketPairGuide.activeBackground1": "#ffd70099",
            "editorBracketPairGuide.activeBackground2": "#da70d699",
            "editorBracketPairGuide.activeBackground3": "#179fff99",
            "editorBracketPairGuide.activeBackground4": "#4ec9b099",
            "editorBracketPairGuide.activeBackground5": "#ff7b7299",
            "editorBracketPairGuide.activeBackground6": "#d2a8ff99",

            // 常规彩虹对齐导轨
            "editorBracketPairGuide.background1": "#ffd70030",
            "editorBracketPairGuide.background2": "#da70d630",
            "editorBracketPairGuide.background3": "#179fff30",
            "editorBracketPairGuide.background4": "#4ec9b030",
            "editorBracketPairGuide.background5": "#ff7b7230",
            "editorBracketPairGuide.background6": "#d2a8ff30",
        },
    });
};

export const zxThemeName = (mode: "light" | "dark") =>
    mode === "dark" ? "zx-dark" : "zx-light";
