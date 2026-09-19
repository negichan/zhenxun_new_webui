import type { LanguageModule } from "./types";

/**
 * Markdown 专属高亮规则：
 * 覆盖标题（H1~H6）、粗体、斜体、引用、链接、列表标号、行内代码与代码块
 */
export const markdownModule: LanguageModule = {
    id: "markdown",
    lightRules: [
        // 标题
        { token: "keyword.md", foreground: "0969da", fontStyle: "bold" },
        { token: "markup.heading", foreground: "0969da", fontStyle: "bold" },
        { token: "heading.1.markdown", foreground: "0969da", fontStyle: "bold" },
        { token: "heading.2.markdown", foreground: "0e7490", fontStyle: "bold" },
        { token: "heading.3.markdown", foreground: "b45309", fontStyle: "bold" },
        { token: "heading.4.markdown", foreground: "cf222e", fontStyle: "bold" },
        // 粗体 / 斜体
        { token: "markup.bold", foreground: "1e293b", fontStyle: "bold" },
        { token: "strong", foreground: "1e293b", fontStyle: "bold" },
        { token: "markup.italic", foreground: "475569", fontStyle: "italic" },
        { token: "emphasis", foreground: "475569", fontStyle: "italic" },
        // 引用
        { token: "markup.quote", foreground: "6e7781", fontStyle: "italic" },
        { token: "quote", foreground: "6e7781", fontStyle: "italic" },
        // 链接
        { token: "string.link", foreground: "0550ae", fontStyle: "underline" },
        { token: "string.target", foreground: "0a6c32" },
        { token: "markup.underline.link", foreground: "0550ae", fontStyle: "underline" },
        // 列表
        { token: "markup.list", foreground: "cf222e", fontStyle: "bold" },
        // 行内代码与代码块
        { token: "variable.md", foreground: "8250df" },
        { token: "markup.inline-code", foreground: "8250df" },
        { token: "string.code", foreground: "8250df" },
        // 分隔线与符号
        { token: "delimiter.separator", foreground: "57606a" },
    ],
    darkRules: [
        // 标题
        { token: "keyword.md", foreground: "61afef", fontStyle: "bold" },
        { token: "markup.heading", foreground: "61afef", fontStyle: "bold" },
        { token: "heading.1.markdown", foreground: "61afef", fontStyle: "bold" },
        { token: "heading.2.markdown", foreground: "4ec9b0", fontStyle: "bold" },
        { token: "heading.3.markdown", foreground: "e5c07b", fontStyle: "bold" },
        { token: "heading.4.markdown", foreground: "ff7b72", fontStyle: "bold" },
        // 粗体 / 斜体
        { token: "markup.bold", foreground: "f8fafc", fontStyle: "bold" },
        { token: "strong", foreground: "f8fafc", fontStyle: "bold" },
        { token: "markup.italic", foreground: "cbd5e1", fontStyle: "italic" },
        { token: "emphasis", foreground: "cbd5e1", fontStyle: "italic" },
        // 引用
        { token: "markup.quote", foreground: "8b9bb0", fontStyle: "italic" },
        { token: "quote", foreground: "8b9bb0", fontStyle: "italic" },
        // 链接
        { token: "string.link", foreground: "4fc1ff", fontStyle: "underline" },
        { token: "string.target", foreground: "98c379" },
        { token: "markup.underline.link", foreground: "4fc1ff", fontStyle: "underline" },
        // 列表
        { token: "markup.list", foreground: "e5c07b", fontStyle: "bold" },
        // 行内代码与代码块
        { token: "variable.md", foreground: "c678dd" },
        { token: "markup.inline-code", foreground: "c678dd" },
        { token: "string.code", foreground: "c678dd" },
        // 分隔线与符号
        { token: "delimiter.separator", foreground: "abb2bf" },
    ],
};
