/**
 * 大模型与渠道接口调用协议元数据配置与工具函数
 */

export interface ProtocolMeta {
    value: string;
    label: string;
    fullName: string;
    badgeClass: string;
    dotClass: string;
}

export const COMMON_PROTOCOLS: ProtocolMeta[] = [
    {
        value: "openai",
        label: "OpenAI 兼容",
        fullName: "OpenAI 兼容协议 (/v1/chat/completions)",
        badgeClass: "bg-blue-50 text-blue-700 border-blue-200/80",
        dotClass: "bg-blue-500",
    },
    {
        value: "gemini",
        label: "Gemini",
        fullName: "Google Gemini 原生协议",
        badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
        dotClass: "bg-indigo-500",
    },
    {
        value: "deepseek",
        label: "DeepSeek",
        fullName: "DeepSeek 原生协议",
        badgeClass: "bg-sky-50 text-sky-700 border-sky-200/80",
        dotClass: "bg-sky-500",
    },
    {
        value: "doubao",
        label: "火山方舟",
        fullName: "字节跳动火山方舟 (Doubao/Ark) 协议",
        badgeClass: "bg-cyan-50 text-cyan-700 border-cyan-200/80",
        dotClass: "bg-cyan-500",
    },
    {
        value: "glm",
        label: "智谱 GLM",
        fullName: "智谱 GLM 开放平台协议",
        badgeClass: "bg-purple-50 text-purple-700 border-purple-200/80",
        dotClass: "bg-purple-500",
    },
    {
        value: "openrouter",
        label: "OpenRouter",
        fullName: "OpenRouter 聚合平台协议",
        badgeClass: "bg-violet-50 text-violet-700 border-violet-200/80",
        dotClass: "bg-violet-500",
    },
    {
        value: "minimax",
        label: "MiniMax",
        fullName: "MiniMax 原生协议",
        badgeClass: "bg-rose-50 text-rose-700 border-rose-200/80",
        dotClass: "bg-rose-500",
    },
    {
        value: "mimo",
        label: "小米 MiMo",
        fullName: "小米 MiMo 原生协议",
        badgeClass: "bg-orange-50 text-orange-700 border-orange-200/80",
        dotClass: "bg-orange-500",
    },
    {
        value: "jina",
        label: "Jina AI",
        fullName: "Jina AI 嵌入重排协议",
        badgeClass: "bg-teal-50 text-teal-700 border-teal-200/80",
        dotClass: "bg-teal-500",
    },
    {
        value: "smart",
        label: "智能路由",
        fullName: "Smart 智能模型路由分发协议",
        badgeClass: "bg-amber-50 text-amber-700 border-amber-200/80",
        dotClass: "bg-amber-500",
    },
    {
        value: "openai_responses",
        label: "Response 协议",
        fullName: "OpenAI Responses 协议 (/v1/responses)",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
        dotClass: "bg-emerald-500",
    },
    {
        value: "claude",
        label: "Claude",
        fullName: "Anthropic Claude 原生协议 (/v1/messages)",
        badgeClass: "bg-amber-50 text-amber-800 border-amber-300/80",
        dotClass: "bg-amber-600",
    },
    {
        value: "chat",
        label: "Chat 兼容",
        fullName: "标准 Chat Completions 协议 (/v1/chat/completions)",
        badgeClass: "bg-blue-50 text-blue-700 border-blue-200/80",
        dotClass: "bg-blue-500",
    },
    {
        value: "response",
        label: "Response",
        fullName: "OpenAI Responses 协议 (/v1/responses)",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
        dotClass: "bg-emerald-500",
    },
];

/**
 * 根据 api_type 字符串解析对应的协议展示信息
 */
export function getProtocolMeta(apiType?: string): ProtocolMeta {
    const raw = (apiType || "openai").toLowerCase().trim();

    // 针对 Anthropic Claude 协议别名识别
    if (raw === "claude" || raw === "anthropic") {
        const foundClaude = COMMON_PROTOCOLS.find((p) => p.value === "claude");
        if (foundClaude) return foundClaude;
    }

    // 针对新版 Response / Responses 协议别名识别
    if (
        raw === "openai_responses" ||
        raw === "openai-responses" ||
        raw === "responses" ||
        raw === "response"
    ) {
        return COMMON_PROTOCOLS.find((p) => p.value === "response") || COMMON_PROTOCOLS[10];
    }

    // 针对标准 OpenAI 兼容别名识别
    if (
        raw === "openai" ||
        raw === "openai-chat" ||
        raw === "chat" ||
        raw === "completions" ||
        raw === "chat_completions"
    ) {
        return COMMON_PROTOCOLS.find((p) => p.value === "chat") || COMMON_PROTOCOLS[0];
    }

    // 智谱别名
    if (raw === "zhipu" || raw === "chatglm") {
        return COMMON_PROTOCOLS[4];
    }

    // 火山方舟 / 豆包别名
    if (raw === "ark" || raw === "volces" || raw === "volcengine") {
        return COMMON_PROTOCOLS[3];
    }

    // 直接匹配已知协议列表
    const found = COMMON_PROTOCOLS.find((p) => p.value === raw);
    if (found) {
        return found;
    }

    // 未知自定义协议兜底
    return {
        value: raw,
        label: `${raw} 协议`,
        fullName: `${raw} 自定义协议`,
        badgeClass: "bg-slate-100 text-zx-text-muted border-slate-200/80",
        dotClass: "bg-slate-400",
    };
}
