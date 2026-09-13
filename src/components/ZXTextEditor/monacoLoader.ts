/**
 * Monaco 加载器：CDN 优先、本地兜底。
 *
 * 依次尝试公共 CDN（国内 npmmirror 优先，其次 jsdelivr 双节点）的 AMD 产物，
 * 全部失败才回退到随站部署的本地 ESM 打包（monacoLocal.ts，含 worker）。
 * 常规网络下编辑器资源走 CDN，源站只承担业务接口；内网/断网也能用。
 *
 * 注意：MONACO_VERSION 必须与 package.json 里 monaco-editor 的版本保持一致，
 * 否则 CDN 产物与本地类型/兜底产物会出现 API 错位。
 */
export const MONACO_VERSION = "0.56.0";

type MonacoNamespace = typeof import("monaco-editor/editor/editor.api");

const CDN_BASES = [
    `https://registry.npmmirror.com/monaco-editor/${MONACO_VERSION}/files/min`,
    `https://cdn.jsdelivr.net/npm/monaco-editor@${MONACO_VERSION}/min`,
    `https://fastly.jsdelivr.net/npm/monaco-editor@${MONACO_VERSION}/min`,
];

const SCRIPT_TIMEOUT_MS = 8000;
const MAIN_TIMEOUT_MS = 15000;

let monacoPromise: Promise<MonacoNamespace> | null = null;

/** 加载 monaco 命名空间（进程内缓存，失败后允许后续重试） */
export const loadMonaco = (): Promise<MonacoNamespace> => {
    if (!monacoPromise) {
        monacoPromise = (async () => {
            for (const base of CDN_BASES) {
                try {
                    return await loadFromAmd(base);
                } catch (e) {
                    console.warn(`Monaco CDN 加载失败（${base}），尝试下一来源`, e);
                }
            }
            console.warn("Monaco 全部 CDN 失败，回退本地打包产物");
            const { default: monaco } = await import("./monacoLocal");
            return monaco as MonacoNamespace;
        })();
        monacoPromise.catch(() => {
            monacoPromise = null;
        });
    }
    return monacoPromise;
};

/** 注入 <script>，超时/出错即 reject */
function loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>(
            `script[src="${src}"]`,
        );
        if (existing) {
            resolve();
            return;
        }

        const script = document.createElement("script");
        const timer = window.setTimeout(() => {
            script.remove();
            reject(new Error("script 超时"));
        }, SCRIPT_TIMEOUT_MS);

        script.src = src;
        script.onload = () => {
            window.clearTimeout(timer);
            resolve();
        };
        script.onerror = () => {
            window.clearTimeout(timer);
            script.remove();
            reject(new Error("script 加载失败"));
        };
        document.head.appendChild(script);
    });
}

/**
 * 从 CDN 的 AMD 产物加载。
 * worker 用官方的 data: URL 代理方案解决跨源限制：
 * worker 本体是 data: URL（同源），内部 importScripts CDN 的 workerMain.js。
 */
async function loadFromAmd(base: string): Promise<MonacoNamespace> {
    await loadScript(`${base}/vs/loader.js`);

    const amdRequire = (window as unknown as {
        require?: {
            config: (opts: { paths: Record<string, string> }) => void;
            (deps: string[], onLoad: (m: MonacoNamespace) => void, onErr?: (e: unknown) => void): void;
        };
    }).require;
    if (!amdRequire) throw new Error("AMD loader 未就绪");

    (window as unknown as Record<string, unknown>).MonacoEnvironment = {
        getWorkerUrl: () =>
            "data:text/javascript;charset=utf-8," +
            encodeURIComponent(
                `self.MonacoEnvironment={baseUrl:'${base}/'};` +
                    `importScripts('${base}/vs/base/worker/workerMain.js');`,
            ),
    };

    amdRequire.config({ paths: { vs: `${base}/vs` } });

    return new Promise<MonacoNamespace>((resolve, reject) => {
        const timer = window.setTimeout(() => {
            reject(new Error("editor.main 加载超时"));
        }, MAIN_TIMEOUT_MS);
        amdRequire(
            ["vs/editor/editor.main"],
            (monaco) => {
                window.clearTimeout(timer);
                resolve(monaco);
            },
            (err) => {
                window.clearTimeout(timer);
                reject(err);
            },
        );
    });
}
