/**
 * 文件类型图标：扩展名 → 专属图标。
 * - 常见语言/格式用 Material Icon Theme 图标（materialIcons.ts，MIT 主题自带品牌色，
 *   固定色不随主题变化，是语义色规则的例外）；
 * - 其余类型用 lucide 图标 + 主题语义色（--zx-color-* 工具类，随深浅主题适配）。
 */
import type { Component } from "vue";
import {
    Cog,
    FileKey,
    FileTerminal,
    FileText,
} from "lucide-vue-next";
import {
    AngularIcon,
    AstroIcon,
    AudioIcon,
    BunIcon,
    CIcon,
    CmakeIcon,
    CppIcon,
    CsharpIcon,
    CssIcon,
    DartIcon,
    DatabaseIcon,
    DenoIcon,
    DockerIcon,
    EditorconfigIcon,
    EslintIcon,
    ExeIcon,
    FontIcon,
    GitIcon,
    GitlabIcon,
    GoIcon,
    GradleIcon,
    GraphqlIcon,
    HtmlIcon,
    ImageIcon,
    JavaIcon,
    JavaScriptIcon,
    JestIcon,
    JsonIcon,
    JarIcon,
    KotlinIcon,
    LessIcon,
    LockIcon,
    LogIcon,
    LuaIcon,
    MakefileIcon,
    MarkdownIcon,
    MavenIcon,
    NextIcon,
    NginxIcon,
    NodejsIcon,
    NpmIcon,
    NuxtIcon,
    PdfIcon,
    PerlIcon,
    PhpIcon,
    PlaywrightIcon,
    PnpmIcon,
    PoetryIcon,
    PowershellIcon,
    PrismaIcon,
    PrettierIcon,
    PythonIcon,
    RIcon,
    ReactIcon,
    RollupIcon,
    RubyIcon,
    RustIcon,
    SassIcon,
    ScalaIcon,
    SqlIcon,
    SvgIcon,
    StylelintIcon,
    SwiftIcon,
    SvelteIcon,
    TableIcon,
    TomlIcon,
    TsconfigIcon,
    TypeScriptIcon,
    VideoIcon,
    ViteIcon,
    VitestIcon,
    VueIcon,
    WebpackIcon,
    XmlIcon,
    YamlIcon,
    YarnIcon,
    ZipIcon,
} from "./materialIcons";

export interface FileIconDescriptor {
    icon: Component;
    /** 图标颜色 class（品牌图标留空，颜色烘焙在 SVG 里） */
    class: string;
}

/** 品牌图标：颜色内置于 SVG，无需语义色 class */
const brand = (icon: Component): FileIconDescriptor => ({ icon, class: "" });

const WARNING = "text-zx-warning";
const INFO = "text-zx-info";
const MUTED = "text-zx-text-muted";

/** .env 系文件图标：纯 .env 琥珀钥匙；.env.* 变体同图标换信息蓝作区分 */
const ENV_ICON: FileIconDescriptor = { icon: FileKey, class: WARNING };
const ENV_VARIANT_ICON: FileIconDescriptor = { icon: FileKey, class: INFO };

const EXT_ICONS: Record<string, FileIconDescriptor> = {
    js: brand(JavaScriptIcon),
    mjs: brand(JavaScriptIcon),
    cjs: brand(JavaScriptIcon),
    jsx: brand(ReactIcon),
    ts: brand(TypeScriptIcon),
    tsx: brand(TypeScriptIcon),
    vue: brand(VueIcon),
    svelte: brand(SvelteIcon),
    astro: brand(AstroIcon),
    graphql: brand(GraphqlIcon),
    gql: brand(GraphqlIcon),
    prisma: brand(PrismaIcon),
    kt: brand(KotlinIcon),
    kts: brand(KotlinIcon),
    scala: brand(ScalaIcon),
    rb: brand(RubyIcon),
    swift: brand(SwiftIcon),
    dart: brand(DartIcon),
    lua: brand(LuaIcon),
    pl: brand(PerlIcon),
    pm: brand(PerlIcon),
    r: brand(RIcon),
    html: brand(HtmlIcon),
    htm: brand(HtmlIcon),
    xml: brand(XmlIcon),
    svg: brand(SvgIcon),
    css: brand(CssIcon),
    scss: brand(SassIcon),
    sass: brand(SassIcon),
    less: brand(LessIcon),
    json: brand(JsonIcon),
    jsonc: brand(JsonIcon),
    md: brand(MarkdownIcon),
    markdown: brand(MarkdownIcon),
    py: brand(PythonIcon),
    pyi: brand(PythonIcon),
    pyw: brand(PythonIcon),
    go: brand(GoIcon),
    rs: brand(RustIcon),
    java: brand(JavaIcon),
    cs: brand(CsharpIcon),
    c: brand(CIcon),
    h: brand(CIcon),
    cpp: brand(CppIcon),
    hpp: brand(CppIcon),
    php: brand(PhpIcon),
    sql: brand(SqlIcon),
    db: brand(DatabaseIcon),
    sqlite: brand(DatabaseIcon),
    sqlite3: brand(DatabaseIcon),
    yml: brand(YamlIcon),
    yaml: brand(YamlIcon),
    toml: brand(TomlIcon),
    ini: { icon: Cog, class: INFO },
    cfg: { icon: Cog, class: INFO },
    conf: { icon: Cog, class: INFO },
    env: ENV_ICON,
    sh: { icon: FileTerminal, class: MUTED },
    bash: { icon: FileTerminal, class: MUTED },
    zsh: { icon: FileTerminal, class: MUTED },
    bat: { icon: FileTerminal, class: MUTED },
    cmd: { icon: FileTerminal, class: MUTED },
    ps1: brand(PowershellIcon),
    lock: brand(LockIcon),
    png: brand(ImageIcon),
    jpg: brand(ImageIcon),
    jpeg: brand(ImageIcon),
    gif: brand(ImageIcon),
    webp: brand(ImageIcon),
    ico: brand(ImageIcon),
    bmp: brand(ImageIcon),
    tiff: brand(ImageIcon),
    tif: brand(ImageIcon),
    zip: brand(ZipIcon),
    jar: brand(JarIcon),
    apk: brand(ZipIcon),
    whl: brand(ZipIcon),
    epub: brand(ZipIcon),
    "tar.gz": brand(ZipIcon),
    tgz: brand(ZipIcon),
    gz: brand(ZipIcon),
    bz2: brand(ZipIcon),
    xz: brand(ZipIcon),
    rar: brand(ZipIcon),
    "7z": brand(ZipIcon),
    mp3: brand(AudioIcon),
    wav: brand(AudioIcon),
    flac: brand(AudioIcon),
    m4a: brand(AudioIcon),
    ogg: brand(AudioIcon),
    mp4: brand(VideoIcon),
    mkv: brand(VideoIcon),
    avi: brand(VideoIcon),
    webm: brand(VideoIcon),
    mov: brand(VideoIcon),
    woff: brand(FontIcon),
    woff2: brand(FontIcon),
    ttf: brand(FontIcon),
    otf: brand(FontIcon),
    eot: brand(FontIcon),
    pdf: brand(PdfIcon),
    exe: brand(ExeIcon),
    dll: brand(ExeIcon),
    so: brand(ExeIcon),
    dylib: brand(ExeIcon),
    bin: brand(ExeIcon),
    dat: brand(ExeIcon),
    pyc: brand(ExeIcon),
    pyd: brand(ExeIcon),
    txt: { icon: FileText, class: MUTED },
    log: brand(LogIcon),
};

/** 整文件名精确匹配（无后缀的特殊文件）优先于后缀匹配 */
const NAME_ICONS: Record<string, FileIconDescriptor> = {
    dockerfile: brand(DockerIcon),
    "docker-compose.yml": brand(DockerIcon),
    "docker-compose.yaml": brand(DockerIcon),
    "docker-compose-dev.yml": brand(DockerIcon),
    "docker-compose-prod.yml": brand(DockerIcon),
    makefile: brand(MakefileIcon),
    license: { icon: FileText, class: MUTED },
    ".gitignore": brand(GitIcon),
    ".gitattributes": brand(GitIcon),
    "requirements.txt": { icon: FileText, class: WARNING },
    "pyproject.toml": brand(TomlIcon),
    "package.json": brand(JsonIcon),
    "package-lock.json": brand(NpmIcon),
    "vite.config.ts": brand(ViteIcon),
    "vite.config.js": brand(ViteIcon),
    "next.config.ts": brand(NextIcon),
    "next.config.js": brand(NextIcon),
    "next.config.mjs": brand(NextIcon),
    "nuxt.config.ts": brand(NuxtIcon),
    "nuxt.config.js": brand(NuxtIcon),
    "angular.json": brand(AngularIcon),
    "webpack.config.js": brand(WebpackIcon),
    "webpack.config.ts": brand(WebpackIcon),
    "rollup.config.js": brand(RollupIcon),
    "rollup.config.ts": brand(RollupIcon),
    "rollup.config.mjs": brand(RollupIcon),
    "vitest.config.ts": brand(VitestIcon),
    "vitest.config.js": brand(VitestIcon),
    "jest.config.js": brand(JestIcon),
    "jest.config.ts": brand(JestIcon),
    "playwright.config.ts": brand(PlaywrightIcon),
    "playwright.config.js": brand(PlaywrightIcon),
    "eslint.config.js": brand(EslintIcon),
    "eslint.config.mjs": brand(EslintIcon),
    "eslint.config.ts": brand(EslintIcon),
    ".eslintrc": brand(EslintIcon),
    ".eslintrc.js": brand(EslintIcon),
    ".eslintrc.json": brand(EslintIcon),
    ".eslintrc.yml": brand(EslintIcon),
    ".eslintrc.yaml": brand(EslintIcon),
    ".prettierrc": brand(PrettierIcon),
    ".prettierrc.json": brand(PrettierIcon),
    ".prettierrc.yml": brand(PrettierIcon),
    ".stylelintrc": brand(StylelintIcon),
    ".stylelintrc.json": brand(StylelintIcon),
    ".editorconfig": brand(EditorconfigIcon),
    "tsconfig.json": brand(TsconfigIcon),
    ".gitlab-ci.yml": brand(GitlabIcon),
    ".nvmrc": brand(NodejsIcon),
    "deno.json": brand(DenoIcon),
    "deno.lock": brand(DenoIcon),
    "bun.lock": brand(BunIcon),
    "bun.lockb": brand(BunIcon),
    "go.mod": brand(GoIcon),
    "go.sum": brand(GoIcon),
    "cargo.toml": brand(RustIcon),
    "composer.json": brand(PhpIcon),
    "composer.lock": brand(PhpIcon),
    "gemfile": brand(RubyIcon),
    "gemfile.lock": brand(RubyIcon),
    "poetry.lock": brand(PoetryIcon),
    "build.gradle": brand(GradleIcon),
    "build.gradle.kts": brand(GradleIcon),
    "settings.gradle": brand(GradleIcon),
    "settings.gradle.kts": brand(GradleIcon),
    "pom.xml": brand(MavenIcon),
    "nginx.conf": brand(NginxIcon),
    "cmakelists.txt": brand(CmakeIcon),
    "pnpm-lock.yaml": brand(PnpmIcon),
    "pnpm-workspace.yaml": brand(PnpmIcon),
    "yarn.lock": brand(YarnIcon),
};

const DEFAULT_ICON: FileIconDescriptor = {
    icon: FileText,
    class: "text-zx-text-subtle",
};

const getExt = (name: string) => {
    const lower = name.toLowerCase();
    // 先试双后缀（.tar.gz 这类），再取普通后缀
    const parts = lower.split(".");
    if (parts.length > 2) {
        const two = parts.slice(-2).join(".");
        if (EXT_ICONS[two]) return two;
    }
    return parts.length > 1 ? parts[parts.length - 1] : "";
};

export const getFileIcon = (name: string): FileIconDescriptor => {
    const lower = name.toLowerCase();
    if (lower === ".env") return ENV_ICON;
    if (lower.startsWith(".env")) return ENV_VARIANT_ICON;
    if (NAME_ICONS[lower]) return NAME_ICONS[lower];
    return EXT_ICONS[getExt(name)] || DEFAULT_ICON;
};

/** 工作台标签图标：表 = Material table_chart；SQL = Material sql */
export const getWorkbenchTabIcon = (tab: {
    kind?: string;
    viewMode?: string;
    name: string;
}): FileIconDescriptor => {
    const kind = tab.kind || tab.viewMode;
    if (kind === "table") return brand(TableIcon);
    if (kind === "sql") return brand(SqlIcon);
    return getFileIcon(tab.name);
};

/**
 * 不允许在工作台里当文本打开的扩展名（图片/压缩包/数据库/可执行等，
 * 后端 read 会产生乱码或超大响应）。svg 是文本可编辑，不在名单内。
 */
export const BINARY_EXTS = new Set([
    "png", "jpg", "jpeg", "gif", "webp", "ico", "bmp", "tiff", "tif",
    "zip", "jar", "apk", "whl", "epub", "tar", "gz", "tgz", "rar", "7z", "bz2", "xz",
    "exe", "dll", "so", "dylib", "bin", "dat", "pyc", "pyd", "class", "o", "obj",
    "db", "sqlite", "sqlite3", "mdb", "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
    "woff", "woff2", "ttf", "otf", "eot", "mp3", "mp4", "avi", "mkv", "wav", "flac",
]);

export const isBinaryFile = (name: string) => BINARY_EXTS.has(getExt(name));

/** 压缩包后缀族（与后端 ZIP_SUFFIXES / TAR_SUFFIXES 对齐） */
const ARCHIVE_EXTS = new Set([
    "zip", "jar", "apk", "whl", "epub",
    "tar", "gz", "tgz", "bz2", "tbz2", "xz", "txz",
]);

export const isArchiveFile = (name: string) => {
    const lower = name.toLowerCase();
    return (
        [...ARCHIVE_EXTS].some((ext) => lower.endsWith(`.${ext}`)) ||
        lower.endsWith(".tar.gz") ||
        lower.endsWith(".tar.bz2") ||
        lower.endsWith(".tar.xz")
    );
};

/** 可预览的图片扩展名（工作台里默认图片视图，仍可切 hex/utf-8） */
export const IMAGE_EXTS = new Set([
    "png", "jpg", "jpeg", "gif", "webp", "ico", "bmp", "tiff", "tif", "svg",
]);

const MIME_BY_EXT: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    ico: "image/x-icon",
    bmp: "image/bmp",
    tiff: "image/tiff",
    tif: "image/tiff",
    svg: "image/svg+xml",
};

export const isImageFile = (name: string) => IMAGE_EXTS.has(getExt(name));

export const imageMime = (name: string): string =>
    MIME_BY_EXT[getExt(name)] || "application/octet-stream";

/** Monaco 语言 ID → 对应品牌/类型图标 */
const LANG_ICONS: Record<string, FileIconDescriptor> = {
    plaintext: { icon: FileText, class: INFO },
    env: ENV_ICON,
    javascript: brand(JavaScriptIcon),
    typescript: brand(TypeScriptIcon),
    python: brand(PythonIcon),
    json: brand(JsonIcon),
    yaml: brand(YamlIcon),
    ini: brand(TomlIcon),
    toml: brand(TomlIcon),
    html: brand(HtmlIcon),
    xml: brand(XmlIcon),
    css: brand(CssIcon),
    scss: brand(SassIcon),
    less: brand(LessIcon),
    markdown: brand(MarkdownIcon),
    sql: brand(SqlIcon),
    shell: { icon: FileTerminal, class: "text-emerald-500" },
    bat: { icon: FileTerminal, class: "text-amber-500" },
    dockerfile: brand(DockerIcon),
    go: brand(GoIcon),
    rust: brand(RustIcon),
    java: brand(JavaIcon),
    cpp: brand(CppIcon),
    c: brand(CIcon),
};

export const getLanguageIcon = (lang?: string): FileIconDescriptor => {
    if (!lang) return { icon: FileText, class: MUTED };
    const lower = lang.toLowerCase();
    return LANG_ICONS[lower] || { icon: FileText, class: MUTED };
};

export const getLanguageBadge = (lang?: string): string => {
    if (!lang) return "";
    const map: Record<string, string> = {
        plaintext: ".txt",
        env: ".env",
        javascript: ".js",
        typescript: ".ts",
        python: ".py",
        json: ".json",
        yaml: ".yaml",
        ini: ".ini",
        toml: ".toml",
        html: ".html",
        xml: ".xml",
        css: ".css",
        scss: ".scss",
        less: ".less",
        markdown: ".md",
        sql: ".sql",
        shell: ".sh",
        bat: ".bat",
        dockerfile: "docker",
        go: ".go",
        rust: ".rs",
        java: ".java",
        cpp: ".cpp",
        c: ".c",
    };
    return map[lang.toLowerCase()] || "";
};

