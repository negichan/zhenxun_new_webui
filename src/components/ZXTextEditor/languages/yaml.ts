import type * as MonacoNamespace from "monaco-editor/editor/editor.api";
import type { LanguageModule } from "./types";

const getEnhancedYamlTokens = () => ({
    defaultToken: "",
    tokenPostfix: ".yaml",
    brackets: [
        { open: "{", close: "}", token: "delimiter.curly" },
        { open: "[", close: "]", token: "delimiter.bracket" },
        { open: "(", close: ")", token: "delimiter.parenthesis" },
    ],
    tokenizer: {
        root: [
            // 注释行
            [/^\s*#.*$/, "comment"],

            // 文档边界符 --- 或 ...
            [/^(?:---|\.\.\.)(?=\s|$)/, "keyword.operator"],

            // 列表项带 key，按行首缩进深度区分 4/3/2/1 级
            [
                /^( {6,}|\t{3,})(-)(\s+)([a-zA-Z0-9_.-]+|"[^"\\]*"|'[^'\\]*')(\s*)(:)(?=\s|$)/,
                ["white", "operator.list", "white", "key.level4", "white", "delimiter.colon"],
            ],
            [
                /^( {4,5}|\t{2})(-)(\s+)([a-zA-Z0-9_.-]+|"[^"\\]*"|'[^'\\]*')(\s*)(:)(?=\s|$)/,
                ["white", "operator.list", "white", "key.level3", "white", "delimiter.colon"],
            ],
            [
                /^( {1,3}|\t)(-)(\s+)([a-zA-Z0-9_.-]+|"[^"\\]*"|'[^'\\]*')(\s*)(:)(?=\s|$)/,
                ["white", "operator.list", "white", "key.level2", "white", "delimiter.colon"],
            ],
            [
                /^(-)(\s+)([a-zA-Z0-9_.-]+|"[^"\\]*"|'[^'\\]*')(\s*)(:)(?=\s|$)/,
                ["operator.list", "white", "key.level1", "white", "delimiter.colon"],
            ],

            // 独立列表项横杠 -
            [/^(\s+)(-)(?=\s|$)/, ["white", "operator.list"]],
            [/^(-)(?=\s|$)/, "operator.list"],

            // 普通 Key，按行首缩进深度区分 4/3/2/1 级
            [
                /^( {6,}|\t{3,})([a-zA-Z0-9_.-]+|"[^"\\]*"|'[^'\\]*')(\s*)(:)(?=\s|$)/,
                ["white", "key.level4", "white", "delimiter.colon"],
            ],
            [
                /^( {4,5}|\t{2})([a-zA-Z0-9_.-]+|"[^"\\]*"|'[^'\\]*')(\s*)(:)(?=\s|$)/,
                ["white", "key.level3", "white", "delimiter.colon"],
            ],
            [
                /^( {1,3}|\t)([a-zA-Z0-9_.-]+|"[^"\\]*"|'[^'\\]*')(\s*)(:)(?=\s|$)/,
                ["white", "key.level2", "white", "delimiter.colon"],
            ],
            [
                /^([a-zA-Z0-9_.-]+|"[^"\\]*"|'[^'\\]*')(\s*)(:)(?=\s|$)/,
                ["key.level1", "white", "delimiter.colon"],
            ],

            { include: "@whitespace" },

            // 锚点与别名 &anchor / *anchor
            [/&[a-zA-Z0-9_.-]+/, "variable.parameter"],
            [/\*[a-zA-Z0-9_.-]+/, "variable.parameter"],

            // 自定义类型标签 !tag, !!str
            [/!{1,2}[a-zA-Z0-9_./-]+/, "tag"],

            // 多行文本符号 | 或 >
            [/[|>][+-]?/, "keyword.operator"],

            // 括号与分隔
            [/[{}\[\]()]/, "@brackets"],
            [/[,:]/, "delimiter"],

            // 数字：十六进制、八进制、浮点数、整数
            [/0x[0-9a-fA-F]+/, "number.hex"],
            [/0o[0-7]+/, "number"],
            [/[-+]?\d+(\.\d+)?([eE][-+]?\d+)?/, "number"],

            // 常量布尔值与 null
            [
                /\b(true|false|yes|no|on|off|null|~|True|False|Yes|No|On|Off|None|NULL|TRUE|FALSE)\b/,
                "constant.language",
            ],

            // 字符串
            [/"/, "string", "@string_double"],
            [/'/, "string", "@string_single"],

            // 普通未加引号标量值
            [/[^#\s,:\[\]{}][^#,:\[\]{}]*/, "string.value"],
        ],
        whitespace: [
            [/\s+/, "white"],
            [/#.*$/, "comment"],
        ],
        string_double: [
            [/[^\\"]+/, "string"],
            [/\\./, "string.escape"],
            [/"/, "string", "@pop"],
        ],
        string_single: [
            [/[^\\']+/, "string"],
            [/\\./, "string.escape"],
            [/'/, "string", "@pop"],
        ],
    },
});

export const yamlModule: LanguageModule = {
    id: "yaml",
    lightRules: [
        { token: "key.level1", foreground: "0969da", fontStyle: "bold" }, // 1级顶级键（深海蓝）
        { token: "key.level2", foreground: "0e7490", fontStyle: "bold" }, // 2级键（青碧绿）
        { token: "key.level3", foreground: "953800" }, // 3级键（暖棕金）
        { token: "key.level4", foreground: "8250df" }, // 4级及深层键（优雅紫）
        { token: "key", foreground: "0969da", fontStyle: "bold" },
        { token: "operator.list", foreground: "cf222e", fontStyle: "bold" }, // 列表横杠 -（醒目红）
        { token: "string.value", foreground: "0a6c32" },
        { token: "delimiter.colon", foreground: "0550ae" },
    ],
    darkRules: [
        { token: "key.level1", foreground: "e06c75", fontStyle: "bold" }, // 1级顶级键（珊瑚红）
        { token: "key.level2", foreground: "4ec9b0", fontStyle: "bold" }, // 2级键（薄荷青绿）
        { token: "key.level3", foreground: "e5c07b" }, // 3级键（温暖金黄）
        { token: "key.level4", foreground: "61afef" }, // 4级及深层键（天蓝色）
        { token: "key", foreground: "e06c75", fontStyle: "bold" },
        { token: "operator.list", foreground: "e5c07b", fontStyle: "bold" }, // 列表横杠 -（金色）
        { token: "string.value", foreground: "98c379" },
        { token: "delimiter.colon", foreground: "56b6c2" },
    ],
    register: (monaco) => {
        const applyYaml = () => {
            try {
                monaco.languages.setLanguageConfiguration("yaml", {
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
                    "yaml",
                    getEnhancedYamlTokens() as unknown as MonacoNamespace.languages.IMonarchLanguage,
                );
            } catch (e) {
                console.warn("Failed to register yaml enhancements", e);
            }
        };
        monaco.languages.onLanguage("yaml", applyYaml);
        applyYaml();
    },
};
