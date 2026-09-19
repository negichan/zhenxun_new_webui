import type * as MonacoNamespace from "monaco-editor/editor/editor.api";
import type { LanguageModule } from "./types";

const getEnhancedEnvTokens = () => ({
    defaultToken: "",
    tokenPostfix: ".env",
    tokenizer: {
        root: [
            { include: "@whitespace" },
            // 注释行
            [/^\s*#.*$/, "comment"],
            // 带 export 的 KEY= 赋值
            [
                /^(\s*export\s+)([A-Za-z_][A-Za-z0-9_.-]*)(\s*)(=)/,
                [
                    { token: "keyword" },
                    { token: "key" },
                    { token: "white" },
                    { token: "operator", next: "@value" },
                ],
            ],
            // 标准 KEY= 赋值
            [
                /^(\s*)([A-Za-z_][A-Za-z0-9_.-]*)(\s*)(=)/,
                [
                    { token: "white" },
                    { token: "key" },
                    { token: "white" },
                    { token: "operator", next: "@value" },
                ],
            ],
            // 兜底单独的 key 定义
            [/^\s*[A-Za-z_][A-Za-z0-9_.-]*/, "key"],
        ],
        whitespace: [
            [/\s+/, "white"],
            [/#.*$/, "comment"],
        ],
        value: [
            [/\s+/, "white"],
            // 行尾注释（如 KEY=value # 注释）
            [/#.*$/, "comment", "@root"],
            // 行尾换行结束，回到 root 准备下一行
            [/$/, "", "@root"],

            // 单引号完整字面量字符串（单行内闭合，如 '[{"token": "..."}]'，包含的 JSON、符号等全部作为纯字面量字符串解析）
            [/'(?:[^'\\]|\\.)*'/, "string"],
            // 跨行未闭合的单引号字符串开始
            [/'/, "string", "@string_single"],

            // 双引号完整字符串（不含插值变量的普通字符串一次性消费）
            [/"(?:[^"\\\$]|\\.)*"/, "string"],
            // 双引号进入详细状态（支持内部 ${VAR} 或 $VAR 变量插值）
            [/"/, "string", "@string_double"],

            // 未加引号的值中的环境变量插值 ${VAR} 或 $VAR
            [/\$\{[a-zA-Z_][a-zA-Z0-9_]*\}/, "variable.parameter"],
            [/\$[a-zA-Z_][a-zA-Z0-9_]*/, "variable.parameter"],

            // 常量布尔值与空值
            [/\b(true|false|null|yes|no|on|off|none|True|False|None)\b/i, "constant.language"],

            // 数值
            [/\b\d+(\.\d+)?\b/, "number"],

            // 普通无引号字符串（消费到空格、# 注释或行尾）
            [/[^#\s"']+/, "string"],
        ],
        string_double: [
            [/[^\\"\$]+/, "string"],
            [/\\./, "string.escape"],
            [/\$\{[a-zA-Z_][a-zA-Z0-9_]*\}/, "variable.parameter"],
            [/\$[a-zA-Z_][a-zA-Z0-9_]*/, "variable.parameter"],
            [/"/, "string", "@pop"],
            [/$/, "", "@root"],
        ],
        string_single: [
            [/[^\\']+/, "string"],
            [/\\./, "string.escape"],
            [/'/, "string", "@pop"],
            [/$/, "", "@root"],
        ],
    },
});

export const envModule: LanguageModule = {
    id: "env",
    register: (monaco) => {
        try {
            const hasEnv = monaco.languages.getLanguages().some((l) => l.id === "env");
            if (!hasEnv) {
                monaco.languages.register({
                    id: "env",
                    extensions: [
                        ".env",
                        ".env.local",
                        ".env.production",
                        ".env.development",
                        ".env.test",
                        ".env.example",
                    ],
                    aliases: ["Dotenv", "env"],
                    mimetypes: ["text/x-dotenv"],
                });
            }
            monaco.languages.setLanguageConfiguration("env", {
                comments: { lineComment: "#" },
                brackets: [
                    ["{", "}"],
                    ["[", "]"],
                    ["(", ")"],
                ],
                autoClosingPairs: [
                    { open: "{", close: "}" },
                    { open: "[", close: "]" },
                    { open: "(", close: ")" },
                    { open: '"', close: '"', notIn: ["string"] },
                    { open: "'", close: "'", notIn: ["string", "comment"] },
                ],
                surroundingPairs: [
                    { open: "{", close: "}" },
                    { open: "[", close: "]" },
                    { open: "(", close: ")" },
                    { open: '"', close: '"' },
                    { open: "'", close: "'" },
                ],
            });
            monaco.languages.setMonarchTokensProvider(
                "env",
                getEnhancedEnvTokens() as unknown as MonacoNamespace.languages.IMonarchLanguage,
            );
        } catch (e) {
            console.warn("Failed to register env language", e);
        }
    },
};
