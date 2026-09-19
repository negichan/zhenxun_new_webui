import type * as MonacoNamespace from "monaco-editor/editor/editor.api";
import type { LanguageModule } from "./types";

const getEnhancedPythonTokens = () => ({
    defaultToken: "",
    tokenPostfix: ".python",
    keywords: [
        "False", "None", "True", "_", "and", "as", "assert", "async", "await",
        "break", "case", "class", "continue", "def", "del", "elif", "else",
        "except", "exec", "finally", "for", "from", "global", "if", "import",
        "in", "is", "lambda", "match", "nonlocal", "not", "or", "pass", "print",
        "raise", "return", "try", "type", "while", "with", "yield",
    ],
    builtins: [
        "int", "float", "complex", "hex", "abs", "all", "any", "bin", "bool",
        "bytearray", "bytes", "callable", "chr", "classmethod", "compile",
        "delattr", "dict", "dir", "divmod", "enumerate", "eval", "exec",
        "filter", "format", "frozenset", "getattr", "globals", "hasattr",
        "hash", "help", "id", "input", "isinstance", "issubclass", "iter",
        "len", "list", "locals", "map", "max", "memoryview", "min", "next",
        "object", "oct", "open", "ord", "pow", "property", "range", "repr",
        "reversed", "round", "set", "setattr", "slice", "sorted", "staticmethod",
        "str", "sum", "super", "tuple", "vars", "zip", "__import__",
    ],
    brackets: [
        { open: "{", close: "}", token: "delimiter.curly" },
        { open: "[", close: "]", token: "delimiter.bracket" },
        { open: "(", close: ")", token: "delimiter.parenthesis" },
    ],
    tokenizer: {
        root: [
            // 行首语法结构（必须置于 @whitespace 之前，以精准识别缩进深度）
            // 嵌套闭包（2级及以上缩进：>=8 空格或 >=2 制表符）
            [
                /^( {8,}|\t{2,})(async\s+def|def)(\s+)([a-zA-Z_]\w*)/,
                ["white", "keyword", "white", "entity.name.function.inner"],
            ],
            // 类方法（1级缩进且首参为 self 或 cls）
            [
                /^( {1,7}|\t)(async\s+def|def)(\s+)([a-zA-Z_]\w*)(?=\s*\(\s*(?:self|cls)\b)/,
                ["white", "keyword", "white", "entity.name.function.member"],
            ],
            // 1级缩进普通函数 / 内部函数
            [
                /^( {1,7}|\t)(async\s+def|def)(\s+)([a-zA-Z_]\w*)/,
                ["white", "keyword", "white", "entity.name.function.inner"],
            ],
            // 顶层函数（0 缩进）
            [
                /^(async\s+def|def)(\s+)([a-zA-Z_]\w*)/,
                ["keyword", "white", "entity.name.function"],
            ],

            { include: "@whitespace" },
            { include: "@numbers" },
            { include: "@strings" },
            [/[,:;]/, "delimiter"],
            [/[{}\[\]()]/, "@brackets"],
            [/@[a-zA-Z_]\w*/, "tag"],
            // 类定义：class MyClass
            [/\b(class)(\s+)([a-zA-Z_]\w*)/, ["keyword", "white", "entity.name.type"]],
            // 兜底函数定义（如行内语句）
            [/\b(def)(\s+)([a-zA-Z_]\w*)/, ["keyword", "white", "entity.name.function"]],
            // self / cls 关键字
            [/\b(self|cls)\b/, "variable.predefined"],
            // 函数/方法调用：标识符后紧跟左括号
            [
                /[a-zA-Z_]\w*(?=\s*\()/,
                {
                    cases: {
                        "@keywords": "keyword",
                        "@builtins": "support.function",
                        "[A-Z].*": "entity.name.type",
                        "@default": "entity.name.function",
                    },
                },
            ],
            // 大写开头的类型 / 类名引用
            [/[A-Z][a-zA-Z0-9_]*/, "entity.name.type"],
            // 普通标识符与关键字
            [
                /[a-zA-Z_]\w*/,
                {
                    cases: {
                        "@keywords": "keyword",
                        "@builtins": "support.function",
                        "@default": "identifier",
                    },
                },
            ],
        ],
        whitespace: [
            [/\s+/, "white"],
            [/(^#.*$)/, "comment"],
            [/'''/, "string", "@endDocString"],
            [/"""/, "string", "@endDblDocString"],
        ],
        endDocString: [
            [/[^']+/, "string"],
            [/\\'/, "string"],
            [/'''/, "string", "@popall"],
            [/'/, "string"],
        ],
        endDblDocString: [
            [/[^"]+/, "string"],
            [/\\"/, "string"],
            [/"""/, "string", "@popall"],
            [/"/, "string"],
        ],
        numbers: [
            [/-?0x([abcdef]|[ABCDEF]|\d)+[lL]?/, "number.hex"],
            [/-?(\d*\.)?\d+([eE][+\-]?\d+)?[jJ]?[lL]?/, "number"],
        ],
        strings: [
            [/'$/, "string.escape", "@popall"],
            [/f'{1,3}/, "string.escape", "@fStringBody"],
            [/'/, "string.escape", "@stringBody"],
            [/"$/, "string.escape", "@popall"],
            [/f"{1,3}/, "string.escape", "@fDblStringBody"],
            [/"/, "string.escape", "@dblStringBody"],
        ],
        fStringBody: [
            [/[^\\'\{\}]+$/, "string", "@popall"],
            [/[^\\'\{\}]+/, "string"],
            [/\{[^\}':!=]+/, "identifier", "@fStringDetail"],
            [/\\./, "string"],
            [/'/, "string.escape", "@popall"],
            [/\\$/, "string"],
        ],
        stringBody: [
            [/[^\\']+$/, "string", "@popall"],
            [/[^\\']+/, "string"],
            [/\\./, "string"],
            [/'/, "string.escape", "@popall"],
            [/\\$/, "string"],
        ],
        fDblStringBody: [
            [/[^\\"\{\}]+$/, "string", "@popall"],
            [/[^\\"\{\}]+/, "string"],
            [/\{[^\}':!=]+/, "identifier", "@fStringDetail"],
            [/\\./, "string"],
            [/"/, "string.escape", "@popall"],
            [/\\$/, "string"],
        ],
        dblStringBody: [
            [/[^\\"]+$/, "string", "@popall"],
            [/[^\\"]+/, "string"],
            [/\\./, "string"],
            [/"/, "string.escape", "@popall"],
            [/\\$/, "string"],
        ],
        fStringDetail: [
            [/[:][^}]+/, "string"],
            [/[!][ars]/, "string"],
            [/=/, "string"],
            [/\}/, "identifier", "@pop"],
        ],
    },
});

export const pythonModule: LanguageModule = {
    id: "python",
    lightRules: [
        { token: "entity.name.function", foreground: "795e26" },
        { token: "entity.name.function.inner", foreground: "0e7490", fontStyle: "italic" },
        { token: "entity.name.function.member", foreground: "8250df" },
    ],
    darkRules: [
        { token: "entity.name.function", foreground: "61afef" },
        { token: "entity.name.function.inner", foreground: "4ec9b0", fontStyle: "italic" },
        { token: "entity.name.function.member", foreground: "c678dd" },
    ],
    register: (monaco) => {
        const applyPython = () => {
            try {
                monaco.languages.setMonarchTokensProvider(
                    "python",
                    getEnhancedPythonTokens() as unknown as MonacoNamespace.languages.IMonarchLanguage,
                );
            } catch {}
        };
        monaco.languages.onLanguage("python", applyPython);
        applyPython();
    },
};
