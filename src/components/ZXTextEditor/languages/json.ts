import type { LanguageModule } from "./types";

export const jsonModule: LanguageModule = {
    id: "json",
    lightRules: [
        { token: "string.key.json", foreground: "0969da", fontStyle: "bold" },
        { token: "string.value.json", foreground: "0a6c32" },
        { token: "number.json", foreground: "098658" },
        { token: "delimiter.colon.json", foreground: "0550ae" },
        { token: "delimiter.comma.json", foreground: "57606a" },
    ],
    darkRules: [
        { token: "string.key.json", foreground: "e06c75", fontStyle: "bold" },
        { token: "string.value.json", foreground: "98c379" },
        { token: "number.json", foreground: "d19a66" },
        { token: "delimiter.colon.json", foreground: "56b6c2" },
        { token: "delimiter.comma.json", foreground: "abb2bf" },
    ],
};
