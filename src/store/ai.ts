import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { aiApi } from "@/utils/api-next";
import { ZXNotification } from "@/services/ui";
import type { AiConfigData } from "@/types/ai.types";

export const useAiStore = defineStore("ai", () => {
    const loading = ref(false);
    const saving = ref(false);

    const aiConfig = ref<AiConfigData>({
        providers: [],
        default_models: {
            chat: "Gemini/gemini-3.5-flash",
            embedding: "Gemini/gemini-embedding-2",
            tts: "Gemini/gemini-3.1-flash-tts-preview",
            image: "Gemini/gemini-2.5-flash-image",
            rerank: "siliconflow/BAAI/bge-reranker-v2-m3",
        },
        model_groups: {},
        context_settings: {
            llm_summary: {
                enable: true,
                trigger_threshold: 0.8,
                max_history_turns: 0,
                summarization_model: "DeepSeek/deepseek-v4-flash",
                summarization_prompt:
                    "请以客观、精炼的语言概括以下对话内容。重点保留核心讨论话题、用户个性特征与生活背景偏好。",
                keep_recent_turns: 3,
            },
            vision_window_size: 3,
            tool_pruning: {
                enable: false,
                trigger_threshold: 0.6,
                max_history_turns: 15,
                keep_recent_turns: 3,
            },
        },
        agent_settings: {
            max_cycles: 10,
            global_max_cycles: 30,
            enable_parallel_calls: true,
            reflexion_retries: 1,
            enable_fallback_summary: true,
            enable_hitl: false,
            mcp_cleanup_timeout: 900,
        },
        client_settings: {
            timeout: 300,
            max_retries: 3,
            retry_delay: 2,
            structured_retries: 2,
        },
        debug_log: {
            show_tools: true,
            show_schema: true,
            show_safety: true,
        },
        sandbox: {
            enable_sandbox: false,
            sandbox_type: "docker",
            docker_image: "zhenxun-sandbox:latest",
            cleanup_timeout: 1800,
            enable_vfs_helper: true,
        },
        provider_settings: {
            gemini: {
                safety_threshold: "BLOCK_NONE",
                allow_mixed_tools: false,
            },
        },
    });

    // 计算属性：所有可用模型扁平列表
    const availableModels = computed(() => {
        const list: string[] = [];
        for (const p of aiConfig.value.providers) {
            for (const m of p.models) {
                list.push(`${p.name}/${m.model_name}`);
            }
        }
        return list;
    });

    const providerCount = computed(() => aiConfig.value.providers.length);
    const modelCount = computed(() => availableModels.value.length);

    // 加载配置
    const fetchConfig = async () => {
        loading.value = true;
        try {
            const res = await aiApi.getConfig();
            if (res.success && res.data) {
                aiConfig.value = res.data;
            }
        } catch (e: any) {
            ZXNotification({
                title: "加载配置失败",
                message: e?.message || "未能连接后端服务",
                type: "error",
                position: "top-right",
            });
        } finally {
            loading.value = false;
        }
    };

    // 保存配置
    const saveConfig = async (): Promise<boolean> => {
        saving.value = true;
        try {
            const res = await aiApi.saveConfig(aiConfig.value);
            if (res.success) {
                ZXNotification({
                    title: "保存成功",
                    message: "配置已更新并同步持久化至 models.json 与主配置文件！",
                    type: "success",
                    position: "top-right",
                });
                await fetchConfig();
                return true;
            }
            return false;
        } catch (e: any) {
            ZXNotification({
                title: "保存失败",
                message: e?.message || "网络请求异常",
                type: "error",
                position: "top-right",
            });
            return false;
        } finally {
            saving.value = false;
        }
    };

    return {
        loading,
        saving,
        aiConfig,
        availableModels,
        providerCount,
        modelCount,
        fetchConfig,
        saveConfig,
    };
});
