/**
 * Shiki 代码高亮（按需拆包）
 * 主包只拉 core + JS 正则引擎（无 wasm），语言/主题 grammar 各自独立 chunk，
 * 编辑器首次用到某种语言时才动态 import 对应模块
 */
import type { HighlighterCore } from "shiki/core";
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

// 超过该体积的文件不做高亮（shiki 全文高亮大文件会卡）
export const MAX_HIGHLIGHT_SIZE = 200 * 1024;

type LangLoader = () => Promise<{ default: any }>;

/** 扩展名 → shiki 语言（含各语言独立 chunk 的动态加载器） */
const LANG_LOADERS: Record<string, { lang: string; loader: LangLoader }> = {
    js: { lang: "javascript", loader: () => import("shiki/langs/javascript.mjs") },
    jsx: { lang: "javascript", loader: () => import("shiki/langs/javascript.mjs") },
    mjs: { lang: "javascript", loader: () => import("shiki/langs/javascript.mjs") },
    cjs: { lang: "javascript", loader: () => import("shiki/langs/javascript.mjs") },
    ts: { lang: "typescript", loader: () => import("shiki/langs/typescript.mjs") },
    tsx: { lang: "typescript", loader: () => import("shiki/langs/typescript.mjs") },
    vue: { lang: "vue", loader: () => import("shiki/langs/vue.mjs") },
    py: { lang: "python", loader: () => import("shiki/langs/python.mjs") },
    json: { lang: "json", loader: () => import("shiki/langs/json.mjs") },
    jsonc: { lang: "json", loader: () => import("shiki/langs/json.mjs") },
    yaml: { lang: "yaml", loader: () => import("shiki/langs/yaml.mjs") },
    yml: { lang: "yaml", loader: () => import("shiki/langs/yaml.mjs") },
    html: { lang: "html", loader: () => import("shiki/langs/html.mjs") },
    htm: { lang: "html", loader: () => import("shiki/langs/html.mjs") },
    xml: { lang: "xml", loader: () => import("shiki/langs/xml.mjs") },
    svg: { lang: "xml", loader: () => import("shiki/langs/xml.mjs") },
    css: { lang: "css", loader: () => import("shiki/langs/css.mjs") },
    scss: { lang: "scss", loader: () => import("shiki/langs/scss.mjs") },
    less: { lang: "less", loader: () => import("shiki/langs/less.mjs") },
    md: { lang: "markdown", loader: () => import("shiki/langs/markdown.mjs") },
    markdown: { lang: "markdown", loader: () => import("shiki/langs/markdown.mjs") },
    sql: { lang: "sql", loader: () => import("shiki/langs/sql.mjs") },
    sh: { lang: "shellscript", loader: () => import("shiki/langs/shellscript.mjs") },
    bash: { lang: "shellscript", loader: () => import("shiki/langs/shellscript.mjs") },
    bat: { lang: "bat", loader: () => import("shiki/langs/bat.mjs") },
    toml: { lang: "toml", loader: () => import("shiki/langs/toml.mjs") },
    ini: { lang: "ini", loader: () => import("shiki/langs/ini.mjs") },
    go: { lang: "go", loader: () => import("shiki/langs/go.mjs") },
    rs: { lang: "rust", loader: () => import("shiki/langs/rust.mjs") },
    java: { lang: "java", loader: () => import("shiki/langs/java.mjs") },
    c: { lang: "c", loader: () => import("shiki/langs/c.mjs") },
    h: { lang: "c", loader: () => import("shiki/langs/c.mjs") },
    cpp: { lang: "cpp", loader: () => import("shiki/langs/cpp.mjs") },
    hpp: { lang: "cpp", loader: () => import("shiki/langs/cpp.mjs") },
    dockerfile: { lang: "docker", loader: () => import("shiki/langs/docker.mjs") },
};

/** 编辑器语言下拉里的值 → shiki 语言名 */
const SELECT_LANG_TO_SHIKI: Record<string, string> = {
    javascript: "javascript",
    typescript: "typescript",
    vue: "vue",
    python: "python",
    json: "json",
    yaml: "yaml",
    html: "html",
    xml: "xml",
    css: "css",
    scss: "scss",
    less: "less",
    markdown: "markdown",
    sql: "sql",
    shell: "shellscript",
    toml: "toml",
    ini: "ini",
    go: "go",
    rust: "rust",
    java: "java",
    c: "c",
    cpp: "cpp",
    dockerfile: "docker",
};

/** 根据文件扩展名解析 shiki 语言，无法识别时返回空 */
export const resolveShikiLang = (ext: string | undefined): string => {
    if (!ext) return "";
    return LANG_LOADERS[ext.toLowerCase()]?.lang || "";
};

/** 编辑器语言选择值 → shiki 语言名 */
export const selectLangToShiki = (lang: string): string =>
    SELECT_LANG_TO_SHIKI[lang] || (LANG_LOADERS[lang]?.lang ?? "");

let highlighterPromise: Promise<HighlighterCore> | null = null;
const loadedLangs = new Set<string>();

const getHighlighter = (): Promise<HighlighterCore> => {
    if (!highlighterPromise) {
        highlighterPromise = createHighlighterCore({
            themes: [
                import("shiki/themes/one-dark-pro.mjs"),
                import("shiki/themes/github-light.mjs"),
            ],
            langs: [],
            // forgiving: 个别 grammar 用到 JS 正则不支持的特性时降级而非报错
            engine: createJavaScriptRegexEngine({ forgiving: true }),
        });
    }
    return highlighterPromise;
};

const ensureLanguage = async (hl: HighlighterCore, lang: string) => {
    if (loadedLangs.has(lang)) return true;
    const entry = Object.values(LANG_LOADERS).find((e) => e.lang === lang);
    if (!entry) return false;
    await hl.loadLanguage((await entry.loader()).default);
    loadedLangs.add(lang);
    return true;
};

/**
 * 高亮代码为 HTML。
 * 返回空串表示不适合高亮（纯文本/超限/语言未知），调用方回落到无高亮渲染。
 * theme: 编辑器主题键（dark/light/contrast）
 */
export const highlightCode = async (
    code: string,
    lang: string,
    theme: string,
): Promise<string> => {
    if (!lang || lang === "plaintext") return "";
    if (code.length > MAX_HIGHLIGHT_SIZE || code.length === 0) return "";

    const hl = await getHighlighter();
    if (!(await ensureLanguage(hl, lang))) return "";

    return hl.codeToHtml(code, {
        lang,
        theme: theme === "dark" ? "one-dark-pro" : "github-light",
    });
};
