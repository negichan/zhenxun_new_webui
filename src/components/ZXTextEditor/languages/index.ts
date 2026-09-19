import type * as MonacoNamespace from "monaco-editor/editor/editor.api";
import type { LanguageModule } from "./types";
import { baseModule } from "./base";
import { pythonModule } from "./python";
import { yamlModule } from "./yaml";
import { jsonModule } from "./json";
import { envModule } from "./env";
import { markdownModule } from "./markdown";

export * from "./types";
export { baseModule } from "./base";
export { pythonModule } from "./python";
export { yamlModule } from "./yaml";
export { jsonModule } from "./json";
export { envModule } from "./env";
export { markdownModule } from "./markdown";

/** 注册的所有语言模块列表（可任意添加新语言） */
export const LANGUAGE_MODULES: LanguageModule[] = [
    baseModule,
    pythonModule,
    yamlModule,
    jsonModule,
    envModule,
    markdownModule,
];

/** 汇聚所有语言的浅色主题高亮规则 */
export const getAllLightRules = (): MonacoNamespace.editor.ITokenThemeRule[] => {
    const rules: MonacoNamespace.editor.ITokenThemeRule[] = [];
    for (const mod of LANGUAGE_MODULES) {
        if (mod.lightRules) {
            rules.push(...mod.lightRules);
        }
    }
    return rules;
};

/** 汇聚所有语言的深色主题高亮规则 */
export const getAllDarkRules = (): MonacoNamespace.editor.ITokenThemeRule[] => {
    const rules: MonacoNamespace.editor.ITokenThemeRule[] = [];
    for (const mod of LANGUAGE_MODULES) {
        if (mod.darkRules) {
            rules.push(...mod.darkRules);
        }
    }
    return rules;
};

let languageEnhancementsRegistered = false;

/** 执行所有语言模块的注册与扩展配置（幂等） */
export const registerAllLanguages = (monaco: typeof MonacoNamespace) => {
    if (languageEnhancementsRegistered) return;
    languageEnhancementsRegistered = true;

    for (const mod of LANGUAGE_MODULES) {
        if (mod.register) {
            mod.register(monaco);
        }
    }
};
