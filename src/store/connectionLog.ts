import { defineStore } from "pinia";
import { ref } from "vue";
import { mainApi } from "@/utils/api-next";
import { idbGet, idbSet } from "@/utils/idb-cache";

/** 一条 bot 连接记录（上线/下线） */
export interface ConnectionLogEntry {
    /** 后端记录 ID，作列表 key 与去重 */
    id: number;
    botId: string;
    /** online = 上线，offline = 下线 */
    type: "online" | "offline";
    /** 记录时间（毫秒时间戳） */
    time: number;
}

const CACHE_KEY = "connection-log";
const FETCH_LIMIT = 500;

const normalize = (raw: {
    id: number;
    bot_id: string;
    type: number;
    connect_time: string;
}): ConnectionLogEntry => ({
    id: raw.id,
    botId: raw.bot_id,
    type: raw.type === 0 ? "offline" : "online",
    time: new Date(raw.connect_time).getTime() || 0,
});

/**
 * bot 连接日志：真寻核心在协议端连接/断开时落库（bot_connect_log 表），
 * 这里从后端拉取展示，本地 IndexedDB 存一份缓存保证秒开。
 */
export const useConnectionLogStore = defineStore("connectionLog", () => {
    const entries = ref<ConnectionLogEntry[]>([]);
    const loading = ref(false);

    // 先用缓存立即渲染，再拉后端覆盖
    idbGet<ConnectionLogEntry[]>(CACHE_KEY).then((cached) => {
        if (cached?.length && entries.value.length === 0) {
            entries.value = cached;
        }
    });

    async function load() {
        if (loading.value) return;
        loading.value = true;
        try {
            const res = await mainApi.getConnectionLogs(FETCH_LIMIT);
            if (res?.success && res?.data) {
                entries.value = res.data.map(normalize);
                idbSet(CACHE_KEY, entries.value);
            }
        } catch (error) {
            console.error("加载连接日志失败:", error);
        } finally {
            loading.value = false;
        }
    }

    return { entries, loading, load };
});
