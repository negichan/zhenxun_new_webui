/**
 * 文件粘贴：同名冲突询问（覆盖 / 跳过 / 创建副本 / 取消）
 * 文件页与资源管理器文件树共用
 */
import { createApp, h } from "vue";
import { fileApi } from "@/utils/api-next";
import PasteConflictDialog from "@/components/zxcomponent/PasteConflictDialog.vue";

export type PasteClipItem = {
    path: string;
    name: string;
    isFile: boolean;
};

export type PasteMode = "copy" | "cut";
export type PasteConflictAction = "overwrite" | "skip" | "copy" | "cancel";

const normalizePath = (p: string) =>
    String(p || "")
        .replace(/\\/g, "/")
        .replace(/\/{2,}/g, "/");

/** 目标目录现有名称集合 */
export async function listDestNames(destDir: string): Promise<Set<string>> {
    try {
        const res = await fileApi.getFileList(destDir || undefined);
        if (res?.success && res.data?.files) {
            return new Set(
                res.data.files.map((f) => f.name).filter((n) => !!n),
            );
        }
    } catch {
        /* 目录读取失败时按无同名处理，由后续 API 报错 */
    }
    return new Set();
}

/** 在目标目录生成不冲突的新文件名 */
export function uniqueNameInDest(
    base: string,
    isFile: boolean,
    taken: Set<string>,
): string {
    if (!taken.has(base)) return base;
    const dot = isFile ? base.lastIndexOf(".") : -1;
    const stem = dot > 0 ? base.slice(0, dot) : base;
    const ext = dot > 0 ? base.slice(dot) : "";
    let n = 1;
    let name = `${stem}_copy${ext}`;
    while (taken.has(name)) {
        n += 1;
        name = `${stem}_copy${n}${ext}`;
    }
    return name;
}

/** 弹出四选一对话框 */
export function askPasteConflict(
    names: string[],
): Promise<PasteConflictAction> {
    return new Promise((resolve) => {
        const container = document.createElement("div");
        document.body.appendChild(container);
        let settled = false;
        const finish = (action: PasteConflictAction) => {
            if (settled) return;
            settled = true;
            resolve(action);
            app.unmount();
            container.remove();
        };
        const app = createApp({
            render: () =>
                h(PasteConflictDialog as any, {
                    names,
                    onAction: (action: PasteConflictAction) => finish(action),
                }),
        });
        app.mount(container);
    });
}

export type PasteResult = {
    ok: number;
    failed: number;
    cancelled: boolean;
    createdNames: string[];
};

/**
 * 执行粘贴：先扫同名，有冲突则询问；非冲突项始终粘贴。
 * overwrite：先删目标再 copy/move
 * skip：跳过冲突项
 * copy：冲突项生成 _copy 新名
 * cancel：整批取消
 */
export async function pasteWithConflict(options: {
    items: PasteClipItem[];
    mode: PasteMode;
    destDir: string;
}): Promise<PasteResult> {
    const { items, mode } = options;
    const destDir = normalizePath(options.destDir);
    const result: PasteResult = {
        ok: 0,
        failed: 0,
        cancelled: false,
        createdNames: [],
    };
    if (!items.length) return result;

    const taken = await listDestNames(destDir);

    const pending: PasteClipItem[] = [];
    for (const item of items) {
        const src = normalizePath(item.path);
        const target = destDir
            ? `${destDir}/${item.name}`
            : item.name;
        // 不能粘贴到自身 / 源目录内
        if (src === destDir) {
            result.failed++;
            continue;
        }
        if (
            !item.isFile &&
            (destDir === src || destDir.startsWith(`${src}/`))
        ) {
            result.failed++;
            continue;
        }
        void target;
        pending.push(item);
    }

    const conflicts = pending.filter((i) => taken.has(i.name));
    let action: PasteConflictAction = "overwrite";
    if (conflicts.length) {
        action = await askPasteConflict(conflicts.map((i) => i.name));
        if (action === "cancel") {
            result.cancelled = true;
            return result;
        }
    }

    for (const item of pending) {
        const isConflict = taken.has(item.name);
        if (isConflict && action === "skip") continue;

        try {
            if (isConflict && action === "copy") {
                const newName = uniqueNameInDest(
                    item.name,
                    item.isFile,
                    taken,
                );
                taken.add(newName);
                const res =
                    mode === "copy"
                        ? await fileApi.copyPath(item.path, destDir, newName)
                        : await fileApi.movePath(item.path, destDir, newName);
                if (res?.success && res.data) {
                    result.ok++;
                    result.createdNames.push(
                        String(res.data).split(/[\\/]/).pop() || newName,
                    );
                } else {
                    result.failed++;
                }
                continue;
            }

            if (isConflict && action === "overwrite") {
                const destPath = destDir
                    ? `${destDir}/${item.name}`
                    : item.name;
                try {
                    if (item.isFile) await fileApi.deleteFile(destPath);
                    else await fileApi.deleteFolder(destPath);
                } catch {
                    /* 目标可能不存在，忽略 */
                }
            }

            const res =
                mode === "copy"
                    ? await fileApi.copyPath(item.path, destDir)
                    : await fileApi.movePath(item.path, destDir);
            if (res?.success && res.data) {
                result.ok++;
                result.createdNames.push(
                    String(res.data).split(/[\\/]/).pop() || item.name,
                );
                taken.add(
                    String(res.data).split(/[\\/]/).pop() || item.name,
                );
            } else {
                result.failed++;
            }
        } catch {
            result.failed++;
        }
    }

    return result;
}
