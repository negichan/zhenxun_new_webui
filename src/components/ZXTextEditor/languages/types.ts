import type * as MonacoNamespace from "monaco-editor/editor/editor.api";

export interface LanguageModule {
    /** 语言唯一标识（如 "python", "yaml", "json", "env"） */
    id: string;
    /** 浅色主题语法高亮规则 */
    lightRules?: MonacoNamespace.editor.ITokenThemeRule[];
    /** 深色主题语法高亮规则 */
    darkRules?: MonacoNamespace.editor.ITokenThemeRule[];
    /** 语言分词器 / 补全 / 语法配置注册钩子 */
    register?: (monaco: typeof MonacoNamespace) => void;
}
