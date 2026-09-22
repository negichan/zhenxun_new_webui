/**
 * WebUI Next API - 主页接口
 */

import { api } from "./client";
import type {
    APIResponse,
    BotInfo,
    BotStatus,
    ConnectionLogInfo,
} from "@/types/api-next.types";

export const mainApi = {
    /**
     * 获取 Bot 状态
     */
    getBotStatus(botId?: string): Promise<APIResponse<BotStatus>> {
        return api.get<BotStatus>("/main/bot-status", { bot_id: botId });
    },

    getBotList(): Promise<APIResponse<[BotInfo]>> {
        return api.get<[BotInfo]>("/main/bot-list");
    },

    /**
     * 获取 Bot 连接日志（按时间倒序）
     */
    getConnectionLogs(
        limit = 500,
    ): Promise<APIResponse<ConnectionLogInfo[]>> {
        return api.get<ConnectionLogInfo[]>("/main/connection-log", {
            limit,
        });
    },

    /**
     * 获取聊天统计
     */
    getChatStatistics(
        botId?: string,
    ): Promise<APIResponse<Record<string, number>>> {
        return api.get("/main/chat-statistics", { bot_id: botId });
    },

    /**
     * 获取插件调用统计
     */
    getPluginStatistics(
        botId?: string,
    ): Promise<APIResponse<Record<string, number>>> {
        return api.get("/main/plugin-statistics", { bot_id: botId });
    },

    /**
     * 获取活跃群组
     */
    getActiveGroups(
        dateType?: string,
        botId?: string,
        startTime?: string,
        endTime?: string,
    ): Promise<
        APIResponse<
            Array<{
                group_id: string;
                name: string;
                chat_num: number;
                ava_img: string;
            }>
        >
    > {
        return api.get("/main/active-groups", {
            date_type: dateType,
            bot_id: botId,
            start_time: startTime,
            end_time: endTime,
        });
    },

    /**
     * 获取活跃群组（别名，兼容旧代码）
     */
    getActiveGroup(
        dateType?: string,
        botId?: string,
        startTime?: string,
        endTime?: string,
    ): Promise<
        APIResponse<
            Array<{
                group_id: string;
                name: string;
                chat_num: number;
                ava_img: string;
            }>
        >
    > {
        return this.getActiveGroups(dateType, botId, startTime, endTime);
    },

    /**
     * 获取热门插件
     */
    getHotPlugins(
        dateType?: string,
        botId?: string,
        startTime?: string,
        endTime?: string,
    ): Promise<
        APIResponse<Array<{ plugin_name: string; call_count: number }>>
    > {
        return api.get("/main/hot-plugins", {
            date_type: dateType,
            bot_id: botId,
            start_time: startTime,
            end_time: endTime,
        });
    },

    /**
     * 获取合并转发消息的逐条节点
     */
    getForward(
        forwardId: string,
        botId?: string,
    ): Promise<
        APIResponse<
            Array<{
                user_id: string;
                nickname: string;
                time?: number | string | null;
                segments: Array<{ type: string; content: string }>;
            }>
        >
    > {
        return api.get(`/main/forward/${encodeURIComponent(forwardId)}`, {
            bot_id: botId,
        });
    },

    /**
     * 查询前端本地版本与最新 Release 版本
     */
    getWebuiVersion(): Promise<
        APIResponse<{ local: string | null; latest: string | null; has_update: boolean }>
    > {
        return api.get("/main/webui/version");
    },

    /**
     * 更新前端到最新 Release（后端强制重拉并热替换 dist）
     */
    updateWebui(): Promise<APIResponse<null>> {
        return api.post("/main/webui/update");
    },
};
