/**
 * Monaco 本地兜底产物：核心 + 全部基础语言高亮 + 基础编辑 worker。
 * 不含 TS/JSON/CSS/HTML 语言服务 worker——CDN 可用时由 CDN 按需提供，
 * 本地兜底保持轻量（TS 那个 worker 有 6.9MB）。
 */
import * as monaco from "monaco-editor/editor/editor.api";
import "monaco-editor/basic-languages/monaco.contribution";
import { default as EditorWorker } from "monaco-editor/editor/editor.worker?worker";

self.MonacoEnvironment = {
    getWorker: () => new EditorWorker(),
};

export default monaco;
