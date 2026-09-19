/**
 * 文件类型图标：Material Icon Theme v5.38.1（MIT，material-extensions/material-icon-theme）。
 * 按需加载：SVG 原文件放在 public/file-icons/ 下，组件只渲染 <img>，
 * 对应类型第一次出现在界面里才发起请求，之后走 HTTP 缓存，完全不进 JS bundle。
 * src 用 import.meta.env.BASE_URL 适配构建的 /next/ 前缀。
 * 尺寸由使用处的 class 控制（h-3 w-3 等透传到 img 上）。
 */
import { h } from "vue";
import type { Component } from "vue";

const icon = (name: string): Component => () =>
    h("img", {
        src: `${import.meta.env.BASE_URL}file-icons/${name}.svg`,
        alt: "",
        draggable: false,
        loading: "lazy",
        decoding: "async",
        class: "object-contain",
    });

export const PythonIcon = icon("python");
export const JavaScriptIcon = icon("javascript");
export const TypeScriptIcon = icon("typescript");
export const VueIcon = icon("vue");
export const ReactIcon = icon("react");
export const SvelteIcon = icon("svelte");
export const AstroIcon = icon("astro");
export const HtmlIcon = icon("html");
export const CssIcon = icon("css");
export const SassIcon = icon("sass");
export const LessIcon = icon("less");
export const JsonIcon = icon("json");
export const XmlIcon = icon("xml");
export const SvgIcon = icon("svg");
export const MarkdownIcon = icon("markdown");
export const YamlIcon = icon("yaml");
export const TomlIcon = icon("toml");
export const DockerIcon = icon("docker");
export const GitIcon = icon("git");
export const GitlabIcon = icon("gitlab");
export const LockIcon = icon("lock");
export const ImageIcon = icon("image");
export const ZipIcon = icon("zip");
export const JarIcon = icon("jar");
export const AudioIcon = icon("audio");
export const VideoIcon = icon("video");
export const FontIcon = icon("font");
export const PdfIcon = icon("pdf");
export const DatabaseIcon = icon("database");
/** Google Material Symbols Outlined：sql / 数据表 */
export const SqlIcon = icon("sql");
export const TableIcon = icon("table");
export const PowershellIcon = icon("powershell");
export const MakefileIcon = icon("makefile");
export const CIcon = icon("c");
export const CppIcon = icon("cpp");
export const CsharpIcon = icon("csharp");
export const GoIcon = icon("go");
export const RustIcon = icon("rust");
export const JavaIcon = icon("java");
export const PhpIcon = icon("php");
export const ExeIcon = icon("exe");
export const LogIcon = icon("log");
export const ViteIcon = icon("vite");
export const PnpmIcon = icon("pnpm");
export const NpmIcon = icon("npm");
export const YarnIcon = icon("yarn");
export const WebpackIcon = icon("webpack");
export const RollupIcon = icon("rollup");
export const VitestIcon = icon("vitest");
export const JestIcon = icon("jest");
export const PlaywrightIcon = icon("playwright");
export const EslintIcon = icon("eslint");
export const PrettierIcon = icon("prettier");
export const StylelintIcon = icon("stylelint");
export const EditorconfigIcon = icon("editorconfig");
export const TsconfigIcon = icon("tsconfig");
export const KotlinIcon = icon("kotlin");
export const ScalaIcon = icon("scala");
export const RubyIcon = icon("ruby");
export const SwiftIcon = icon("swift");
export const DartIcon = icon("dart");
export const LuaIcon = icon("lua");
export const PerlIcon = icon("perl");
export const RIcon = icon("r");
export const DenoIcon = icon("deno");
export const BunIcon = icon("bun");
export const NodejsIcon = icon("nodejs");
export const GradleIcon = icon("gradle");
export const MavenIcon = icon("maven");
export const PoetryIcon = icon("poetry");
export const PrismaIcon = icon("prisma");
export const GraphqlIcon = icon("graphql");
export const NginxIcon = icon("nginx");
export const CmakeIcon = icon("cmake");
export const NextIcon = icon("next");
export const NuxtIcon = icon("nuxt");
export const AngularIcon = icon("angular");
