/**
 * 通用 IndexedDB KV 缓存
 * 用于体量较大的本地缓存（连接日志、联系人等），localStorage 只放小状态。
 * 单库多 store，store 不存在时自动创建。
 */

const DB_NAME = "zhenxun-webui-cache";
const DB_VERSION = 1;

const isIndexedDBAvailable = () =>
    typeof window !== "undefined" && typeof window.indexedDB !== "undefined";

let dbPromise: Promise<IDBDatabase> | null = null;

const openDatabase = (): Promise<IDBDatabase> => {
    if (!isIndexedDBAvailable()) {
        return Promise.reject(new Error("IndexedDB is not available"));
    }

    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains("kv")) {
                db.createObjectStore("kv");
            }
        };

        request.onsuccess = () => {
            const db = request.result;
            db.onversionchange = () => db.close();
            resolve(db);
        };

        request.onerror = () => reject(request.error);
    });

    return dbPromise;
};

const runTransaction = async <T>(
    callback: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> => {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("kv", "readwrite");
        const result = callback(tx.objectStore("kv"));
        if (result) {
            result.onsuccess = () => resolve(result.result);
            result.onerror = () => reject(result.error);
        }
        tx.oncomplete = () => resolve(undefined);
        tx.onerror = () => reject(tx.error);
    });
};

export const idbGet = async <T>(key: string): Promise<T | undefined> => {
    try {
        return (await runTransaction<T>((store) =>
            store.get(key),
        )) as T | undefined;
    } catch {
        return undefined;
    }
};

export const idbSet = async (key: string, value: unknown): Promise<void> => {
    try {
        await runTransaction((store) => store.put(value, key));
    } catch {
        // 缓存写失败不影响功能
    }
};
