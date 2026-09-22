/**
 * WebUI Next API - AI / LLM 服务接口
 */

import { api } from "./client";
import type { APIResponse } from "@/types/api-next.types";
import type {
    AiConfigData,
    AvailableModelItem,
    ImportModelsDevRequest,
    ModelTestResponse,
    ModelsDevCatalogResponse,
    ProtocolHijackStatusResponse,
    TelemetryItem,
} from "@/types/ai.types";

export const aiApi = {
    /**
     * 获取完整 AI 配置
     */
    getConfig(): Promise<APIResponse<AiConfigData>> {
        return api.get<AiConfigData>("/ai/config");
    },

    /**
     * 保存 AI 配置并持久化
     */
    saveConfig(data: AiConfigData): Promise<APIResponse<boolean>> {
        return api.post<boolean>("/ai/config", data);
    },

    /**
     * 测试指定模型连通性
     */
    testModel(model: string): Promise<APIResponse<ModelTestResponse>> {
        return api.post<ModelTestResponse>("/ai/test", { model });
    },

    /**
     * 获取所有已配置的可用模型列表
     */
    getAvailableModels(): Promise<APIResponse<AvailableModelItem[]>> {
        return api.get<AvailableModelItem[]>("/ai/models");
    },

    /**
     * 获取 models.dev 在线模型库目录
     */
    getModelsDevCatalog(search?: string): Promise<APIResponse<ModelsDevCatalogResponse>> {
        return api.get<ModelsDevCatalogResponse>("/ai/models-dev/catalog", {
            params: search ? { search } : undefined,
        });
    },

    /**
     * 强制从远程拉取并刷新 models.dev 缓存
     */
    refreshModelsDevCatalog(): Promise<APIResponse<ModelsDevCatalogResponse>> {
        return api.post<ModelsDevCatalogResponse>("/ai/models-dev/refresh");
    },

    /**
     * 从 models.dev 导入服务商和模型
     */
    importModelsDevProvider(data: ImportModelsDevRequest): Promise<APIResponse<boolean>> {
        return api.post<boolean>("/ai/models-dev/import", data);
    },

    /**
     * 获取实验性协议劫持全局状态与支持协议
     */
    getProtocolHijackStatus(): Promise<APIResponse<ProtocolHijackStatusResponse>> {
        return api.get<ProtocolHijackStatusResponse>("/ai/experimental/protocol-hijack");
    },

    /**
     * 切换实验性协议劫持开关
     */
    updateProtocolHijackStatus(enabled: boolean): Promise<APIResponse<boolean>> {
        return api.post<boolean>("/ai/experimental/protocol-hijack", { enabled });
    },

    /**
     * 获取近期抓包遥测记录
     */
    getProtocolTelemetry(limit: number = 50): Promise<APIResponse<TelemetryItem[]>> {
        return api.get<TelemetryItem[]>("/ai/experimental/telemetry", {
            params: { limit },
        });
    },

    /**
     * 清空抓包遥测记录
     */
    clearProtocolTelemetry(): Promise<APIResponse<boolean>> {
        return api.delete<boolean>("/ai/experimental/telemetry");
    },
};

