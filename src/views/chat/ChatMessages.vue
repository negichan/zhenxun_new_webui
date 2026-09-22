<script setup lang="ts">
import {
    AlertCircle,
    ArrowDown,
    ArrowLeft,
    Check,
    ChevronRight,
    CircleCheck,
    Clock,
    Copy,
    CornerUpRight,
    Download,
    FileText,
    FolderDown,
    ImageIcon,
    Link2,
    MapPin,
    MessageSquare,
    MessagesSquare,
    Mic,
    Music,
    PanelRight,
    Send,
    Smile,
    Video,
    X,
} from "lucide-vue-next";
import { storeToRefs } from "pinia";
import { onClickOutside } from "@vueuse/core";
import { useChatStore } from "@/store/chat.ts";
import { computed, nextTick, onMounted, reactive, ref, watch } from "vue";
import { ZXNotification } from "@/services/ui";
import {
    sendMessage as sendWsMessage,
    sendForwardMessage,
    sendSegmentsMessage,
} from "@/utils/api-next/websocket-chat";
import { manageApi } from "@/utils/api-next";
import type { GroupMember } from "@/types/manage.types";
import { useBotStore } from "@/store/bot.ts";
import ChatHistoryModal from "@/views/chat/ChatHistoryModal.vue";
import ForwardViewer from "@/views/chat/ForwardViewer.vue";
import ContactPickerModal, {
    type ForwardTarget,
    type ForwardMode,
} from "@/views/chat/ContactPickerModal.vue";
import {
    ZXContextMenu,
    menuSep,
    type ZXContextMenuItem,
} from "@/components/zxcomponent/ContextMenu";
import StickerPicker from "@/views/chat/StickerPicker.vue";
import FaceImg from "@/views/chat/FaceImg.vue";
import type { StickerItem } from "@/utils/stickers";
import { qqntLocalFallback } from "@/utils/stickers-qqnt";
import { faceCdnUrl } from "@/utils/qq-face";
import { useVoiceRecorder } from "@/composables/useVoiceRecorder";
import { useCustomCaret } from "@/composables/useCustomCaret";
import type {
    ChatMessage,
    ChatMessagePart,
    ForwardNode,
    StickerKind,
} from "@/types";

const props = defineProps<{
    /** 右侧详情面板是否展开（用于按钮高亮） */
    detailOpen?: boolean;
}>();

const emit = defineEmits<{
    "toggle-detail": [];
}>();

const chatStore = useChatStore();
const botStore = useBotStore();

const { selectedContact, friends, groups, selectedId, messages } =
    storeToRefs(chatStore);
const { appendMessage, appendCurrentMessage, removeCurrentMessage, createMessageId } =
    chatStore;

// 消息容器 ref
const messagesContainer = ref<HTMLElement | null>(null);

// 图片消息加载态（替代 el-image 的 placeholder/error 插槽）：
// undefined = 加载中，loaded / error 见名
const imageState = reactive<Record<string, "loaded" | "error">>({});

// ==================== Telegram 式消息窗口 ====================
// 大会话只渲染底部窗口内的气泡，往上翻按需扩窗并锚定滚动位置，
// 避免上千条消息全量渲染；贴近底部时新消息才自动滚底
const RENDER_STEP = 80;
const renderCount = ref(60);

const visibleMessages = computed(() =>
    messages.value.slice(
        Math.max(0, messages.value.length - renderCount.value),
    ),
);

const hiddenCount = computed(
    () => messages.value.length - visibleMessages.value.length,
);

const isNearBottom = () => {
    const el = messagesContainer.value;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 150;
};

const loadOlderMessages = async () => {
    const el = messagesContainer.value;
    const prevHeight = el?.scrollHeight ?? 0;
    const prevTop = el?.scrollTop ?? 0;
    renderCount.value += RENDER_STEP;
    await nextTick();
    // 锚定：扩窗后保持视口内的内容不动
    if (el) el.scrollTop = prevTop + (el.scrollHeight - prevHeight);
};

const showScrollBottom = ref(false);

// 历史记录弹窗
const historyOpen = ref(false);

// 合并转发查看器
const forwardOpen = ref(false);
const forwardId = ref("");
const forwardBotId = ref<string | undefined>(undefined);
// 本地合成的合并转发：按合成 id 缓存节点，点开直接渲染（后端无真实 forward id）
const localForwards = new Map<string, ForwardNode[]>();
const forwardLocalNodes = ref<ForwardNode[] | null>(null);
const openForward = (id: string) => {
    if (!id) return;
    forwardId.value = id;
    forwardBotId.value = getCurrentBot()?.self_id ?? undefined;
    forwardLocalNodes.value = localForwards.get(id) ?? null;
    forwardOpen.value = true;
};

// ==================== 消息多选 / 右键操作（复制·下载·另存为·转发） ====================
const notify = (
    title: string,
    message: string,
    type: "success" | "error" | "warning" | "info",
) => ZXNotification({ title, message, type, position: "top-right" });

// 多选态
const selectMode = ref(false);
const selectedIds = ref<Set<number>>(new Set());
const selectedCount = computed(() => selectedIds.value.size);

const isSelected = (id: number) => selectedIds.value.has(id);
const toggleSelect = (id: number) => {
    const s = selectedIds.value;
    if (s.has(id)) s.delete(id);
    else s.add(id);
};
const enterSelectMode = (id?: number) => {
    selectMode.value = true;
    if (id != null) selectedIds.value.add(id);
};
const exitSelectMode = () => {
    selectMode.value = false;
    selectedIds.value.clear();
};

// 转发目标选择器
const pickerOpen = ref(false);
const pendingForwardIds = ref<number[]>([]);
const startForward = (ids: number[]) => {
    if (!ids.length) return;
    pendingForwardIds.value = ids;
    pickerOpen.value = true;
};
const forwardSelected = () => {
    startForward([...selectedIds.value]);
};

// 提取消息里的文本与图片资源
const textOfMessage = (m: ChatMessage): string => {
    if (m.parts && m.parts.length) {
        return m.parts
            .filter((p) => p.type === "text")
            .map((p) => p.content)
            .join("")
            .trim();
    }
    return m.message_type === "text" ? m.message.trim() : "";
};
const imageUrlsOf = (m: ChatMessage): string[] => {
    if (m.parts && m.parts.length) {
        return m.parts.filter((p) => p.type === "image").map((p) => p.content);
    }
    return m.message_type === "image" ? [m.message] : [];
};

// 复制文本：优先剪贴板 API（需安全上下文），http 环境降级 execCommand
const copyTextSafe = async (text: string): Promise<boolean> => {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch {
        /* 降级 */
    }
    try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.cssText =
            "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        ta.remove();
        return ok;
    } catch {
        return false;
    }
};

const doCopyText = async (text: string) => {
    const ok = await copyTextSafe(text);
    notify(
        ok ? "已复制" : "复制失败",
        ok ? (text.length > 20 ? `${text.slice(0, 20)}…` : text) : "剪贴板不可用",
        ok ? "success" : "error",
    );
};

// 图片 url → PNG blob（经 canvas 转换，跨域缺 CORS 会失败）
const urlToPngBlob = async (url: string): Promise<Blob> => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";
    await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("图片加载失败"));
        img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width || 1;
    canvas.height = img.naturalHeight || img.height || 1;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("无法创建画布");
    ctx.drawImage(img, 0, 0);
    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error("导出失败"))),
            "image/png",
        );
    });
};

const doCopyImage = async (url: string) => {
    try {
        if (
            typeof ClipboardItem === "undefined" ||
            !navigator.clipboard ||
            !("write" in navigator.clipboard)
        ) {
            throw new Error("不支持");
        }
        const png = await urlToPngBlob(url);
        await navigator.clipboard.write([
            new ClipboardItem({ "image/png": png }),
        ]);
        notify("已复制", "图片已复制到剪贴板", "success");
    } catch {
        notify("无法复制图片", "当前环境不支持，请改用「下载」", "warning");
    }
};

const imageFilename = (url: string, idx: number): string => {
    let ext = "png";
    const dm = url.match(/^data:image\/(\w+)/);
    if (dm) ext = dm[1] === "jpeg" ? "jpg" : dm[1].toLowerCase();
    else {
        const em = url
            .split("?")[0]
            .match(/\.(png|jpe?g|gif|webp|apng|bmp)$/i);
        if (em) {
            const e = em[1].toLowerCase();
            ext = e === "jpeg" ? "jpg" : e === "apng" ? "png" : e;
        }
    }
    return `image-${Date.now()}${idx ? `-${idx}` : ""}.${ext}`;
};

const downloadImage = async (url: string, filename: string) => {
    try {
        const blob = await (await fetch(url)).blob();
        const objUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(objUrl), 1000);
    } catch {
        // CORS 拉不到 blob：退化为直接用原始 url 触发下载/新窗口
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.target = "_blank";
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        a.remove();
    }
};

const doDownloadImages = async (urls: string[]) => {
    for (let i = 0; i < urls.length; i++) {
        await downloadImage(urls[i], imageFilename(urls[i], i));
    }
};

const saveImageAs = async (url: string, filename: string) => {
    const picker = (window as any).showSaveFilePicker;
    if (typeof picker === "function") {
        try {
            const blob = await (await fetch(url)).blob();
            const handle = await picker({ suggestedName: filename });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            return;
        } catch (err: any) {
            if (err?.name === "AbortError") return; // 用户取消
        }
    }
    // http/非安全上下文或取消后降级为直接下载
    await downloadImage(url, filename);
};

const doSaveAsImages = async (urls: string[]) => {
    for (let i = 0; i < urls.length; i++) {
        await saveImageAs(urls[i], imageFilename(urls[i], i));
    }
};

// 右键菜单：按消息类型给出可用操作
const openMessageMenu = (e: MouseEvent, m: ChatMessage) => {
    const items: ZXContextMenuItem[] = [];
    const text = textOfMessage(m);
    const imgs = imageUrlsOf(m);
    if (text) {
        items.push({ label: "复制", icon: Copy, action: () => doCopyText(text) });
    }
    if (imgs.length) {
        items.push({
            label: "复制图片",
            icon: Copy,
            action: () => doCopyImage(imgs[0]),
        });
        items.push({
            label: imgs.length > 1 ? `下载全部图片（${imgs.length}）` : "下载",
            icon: Download,
            action: () => doDownloadImages(imgs),
        });
        if (imgs.length === 1) {
            items.push({
                label: "另存为",
                icon: FolderDown,
                action: () => doSaveAsImages(imgs),
            });
        }
    }
    items.push(menuSep());
    items.push({
        label: "转发",
        icon: CornerUpRight,
        action: () => startForward([m.id]),
    });
    items.push({
        label: "多选",
        icon: CircleCheck,
        action: () => enterSelectMode(m.id),
    });
    ZXContextMenu.show({ x: e.clientX, y: e.clientY, items });
};

// 资源 url → base64 payload（data/base64 直接抽取，远程 fetch 后转码）
const toBase64Payload = async (url: string): Promise<string | null> => {
    try {
        if (!url) return null;
        if (url.startsWith("base64://")) return url.slice("base64://".length);
        if (url.startsWith("data:")) {
            const comma = url.indexOf(",");
            return comma >= 0 ? url.slice(comma + 1) : null;
        }
        const blob = await (await fetch(url)).blob();
        return await new Promise<string>((resolve, reject) => {
            const fr = new FileReader();
            fr.onload = () => {
                const r = String(fr.result);
                const comma = r.indexOf(",");
                resolve(comma >= 0 ? r.slice(comma + 1) : "");
            };
            fr.onerror = () => reject(new Error("读取失败"));
            fr.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
};

// 取一条消息的原始段（单类型消息合成单段）
const messageSegments = (m: ChatMessage): ChatMessagePart[] =>
    m.parts && m.parts.length > 1
        ? m.parts
        : [{ type: m.message_type, content: m.message }];

const isNumericId = (s: string) => /^\d{4,}$/.test((s || "").trim());

// 段 → 可直接发送的 {type, content}，尽量还原成对应 OneBot 段：
// 图片/语音转 base64；视频按 url；json/xml 原样；at 用真实 qq；forward 用 node id；其余降级文本
const toSendSegments = async (
    m: ChatMessage,
): Promise<{ type: string; content: string }[]> => {
    const out: { type: string; content: string }[] = [];
    for (const p of messageSegments(m)) {
        if (p.type === "text") {
            const t = p.content.trim();
            if (t) out.push({ type: "text", content: t });
        } else if (p.type === "face") {
            if (p.content.trim())
                out.push({ type: "face", content: p.content.trim() });
        } else if (p.type === "image" || p.type === "record") {
            const b64 = await toBase64Payload(p.content);
            if (b64) out.push({ type: p.type, content: `base64://${b64}` });
        } else if (p.type === "video") {
            const u = (p.content || "").trim();
            if (u && !u.startsWith("[")) out.push({ type: "video", content: u });
            else out.push({ type: "text", content: u || "[视频]" });
        } else if (p.type === "json" || p.type === "xml") {
            const raw = (p.content || "").trim();
            if (raw && !raw.startsWith("["))
                out.push({ type: p.type, content: raw });
            else out.push({ type: "text", content: raw || "[卡片]" });
        } else if (p.type === "at") {
            const qq =
                (p.qq || "").trim() ||
                (isNumericId(p.content) ? p.content.trim() : "");
            if (qq) out.push({ type: "at", content: qq });
            else if (p.content?.trim())
                out.push({ type: "text", content: p.content.trim() });
        } else if (p.type === "forward") {
            const id = (p.content || "").trim();
            if (isNumericId(id)) out.push({ type: "node", content: id });
            else out.push({ type: "text", content: id || "[合并转发]" });
        } else {
            const t = p.content?.trim();
            if (t) out.push({ type: "text", content: t });
        }
    }
    return out;
};

// 转发后写入目标会话的本地回显（后端不回广播已发消息，需前端自行落库/上屏）
const buildEcho = (
    m: ChatMessage,
    botId: string,
    avatar: string,
    target: ForwardTarget,
): ChatMessage => ({
    id: createMessageId(),
    user_id: botId,
    user_name: "小真寻",
    avatar,
    message: m.message,
    message_type: m.message_type,
    timestamp: new Date().toISOString(),
    is_self: true,
    sticker: m.sticker,
    group_id: target.type === "group" ? target.id : undefined,
    parts: m.parts,
});

const doForward = async (target: ForwardTarget, mode: ForwardMode) => {
    pickerOpen.value = false;
    const wasSelect = selectMode.value;
    const bot = getCurrentBot();
    if (!bot?.self_id) {
        notify("转发失败", "没有找到可用的 Bot", "error");
        return;
    }
    const ids = pendingForwardIds.value;
    const msgs = messages.value.filter((m) => ids.includes(m.id));
    if (wasSelect) exitSelectMode();
    pendingForwardIds.value = [];
    if (!msgs.length) return;

    const gid = target.type === "group" ? target.id : null;
    const uid = target.type === "friend" ? target.id : null;
    const botId = bot.self_id;
    const botAvatar =
        bot.ava_url || `http://q1.qlogo.cn/g?b=qq&nk=${bot.self_id}&s=160`;
    const botArg = { self_id: botId, name: String(bot.nickname ?? "") };

    try {
        if (mode === "merged") {
            const sendNodes: {
                name: string;
                uin: string;
                segments: { type: string; content: string }[];
            }[] = [];
            const viewNodes: ForwardNode[] = [];
            for (const m of msgs) {
                const segs = await toSendSegments(m);
                if (!segs.length) continue;
                sendNodes.push({
                    name: m.user_name || "小真寻",
                    uin: m.user_id,
                    segments: segs,
                });
                viewNodes.push({
                    user_id: m.user_id,
                    nickname: m.user_name || "未知",
                    time: Math.floor(
                        new Date(m.timestamp).getTime() / 1000,
                    ),
                    // 本地查看用原始可展示内容（图片保留 data/远程 url）
                    segments: messageSegments(m).map((p) => ({
                        type: p.type,
                        content: p.content,
                    })),
                });
            }
            if (!sendNodes.length) {
                notify("转发失败", "没有可转发的内容", "error");
                return;
            }
            await sendForwardMessage(botArg, gid, uid, sendNodes);
            const fid = `local-${Date.now()}`;
            localForwards.set(fid, viewNodes);
            await appendMessage(target.type, target.id, {
                id: createMessageId(),
                user_id: botId,
                user_name: "小真寻",
                avatar: botAvatar,
                message: fid,
                message_type: "forward",
                timestamp: new Date().toISOString(),
                is_self: true,
                group_id: gid || undefined,
            });
            notify(
                "已转发",
                `已合并转发 ${sendNodes.length} 条给 ${target.name}`,
                "success",
            );
        } else {
            let ok = 0;
            for (const m of msgs) {
                try {
                    const segs = await toSendSegments(m);
                    if (!segs.length) continue;
                    await sendSegmentsMessage(botArg, gid, uid, segs);
                    await appendMessage(
                        target.type,
                        target.id,
                        buildEcho(m, botId, botAvatar, target),
                    );
                    ok++;
                } catch (err) {
                    console.error("转发失败:", err);
                }
            }
            if (ok > 0) {
                notify("已转发", `已逐条转发 ${ok} 条给 ${target.name}`, "success");
            } else {
                notify("转发失败", "没有消息发送成功", "error");
            }
        }
    } catch (err: any) {
        console.error("转发失败:", err);
        notify("转发失败", String(err?.message || err), "error");
    }
};

const onMessagesScroll = () => {
    showScrollBottom.value = !isNearBottom();
};

// 文件输入 ref
const imageInput = ref<HTMLInputElement | null>(null);

// 获取当前选中联系人的详细信息
const currentContactInfo = computed(() => {
    if (!selectedContact.value || !selectedId.value) {
        return null;
    }
    if (selectedContact.value === "friend") {
        const friend = friends.value.find(
            (f) => f.user_id === selectedId.value,
        );
        if (friend) {
            return {
                name: friend.nickname || friend.remark || "未知好友",
                id: friend.user_id,
                avatar: friend.ava_url,
            };
        }
    } else if (selectedContact.value === "group") {
        const group = groups.value.find((g) => g.group_id === selectedId.value);
        if (group) {
            return {
                name: group.group_name,
                id: group.group_id,
                avatar: group.ava_url,
            };
        }
    }
    return null;
});

// 将文件转换为 base64
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

// ==================== 富文本输入框（图片内联）+ 语音附件 ====================

// 富文本编辑器（contenteditable），图片以 <img> 内联在文字之间
const editorRef = ref<HTMLElement | null>(null);
/** 编辑器里内联图片的 dataUrl -> 纯 base64 缓存 */
const imageBase64Map = new Map<string, string>();

// 自绘光标：行内图片撑高行框时原生光标会变高，改画恒定字高的光标
useCustomCaret(editorRef);

/** 待发送语音（录音后挂在输入框上方） */
interface VoiceItem {
    id: number;
    dataUrl: string;
    base64: string;
    duration: number;
}

const voiceItems = ref<VoiceItem[]>([]);
let voiceSeq = 0;

const removeVoiceItem = (id: number) => {
    voiceItems.value = voiceItems.value.filter((item) => item.id !== id);
};

/** 在光标处插入内联图片 */
// 编辑器内联表情的相对尺寸（动态插入的 img 拿不到 scoped 类，用内联样式；随字号自适应）
const EDITOR_STICKER_STYLE: Record<StickerKind, string> = {
    emoji: "width:1.3em;height:1.3em;vertical-align:middle;object-fit:contain;",
    sticker:
        "max-height:6em;max-width:100%;width:auto;height:auto;object-fit:contain;",
};

const insertInlineImage = (dataUrl: string, kind?: StickerKind) => {
    const editor = editorRef.value;
    if (!editor) return;
    editor.focus();
    imageBase64Map.set(dataUrl, dataUrl.split(",")[1] ?? "");
    if (!kind) {
        let inserted = false;
        try {
            inserted = document.execCommand("insertImage", false, dataUrl);
        } catch {
            inserted = false;
        }
        if (!inserted) {
            const img = document.createElement("img");
            img.src = dataUrl;
            editor.appendChild(img);
        }
        return;
    }
    // 表情：手动插入以便打 data-sticker 标记与相对尺寸预览
    const img = document.createElement("img");
    img.src = dataUrl;
    img.setAttribute("data-sticker", kind);
    img.style.cssText = EDITOR_STICKER_STYLE[kind];
    const sel = window.getSelection();
    if (sel && sel.rangeCount && editor.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(img);
        range.setStartAfter(img);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
    } else {
        editor.appendChild(img);
    }
};

// 默认小表情：作为 face token 插入编辑器（data-face 记录 id，发送时转 face 段）
const insertFaceToken = (id: string) => {
    const editor = editorRef.value;
    if (!editor) return;
    editor.focus();
    const img = document.createElement("img");
    img.src = faceCdnUrl(id);
    img.setAttribute("data-face", id);
    img.style.cssText =
        "width:1.3em;height:1.3em;vertical-align:middle;object-fit:contain;";
    img.addEventListener("error", () => {
        img.src = `/zhenxun/api/v1/sticker/qq/${id}.png`;
    });
    const sel = window.getSelection();
    if (sel && sel.rangeCount && editor.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(img);
        range.setStartAfter(img);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
    } else {
        editor.appendChild(img);
    }
};

// ==================== @ 群成员（仅群聊） ====================
const atOpen = ref(false);
const atRef = ref<HTMLElement | null>(null);
const atKeyword = ref("");
const mentionActive = ref(false); // 由“输入 @”触发的就地提及模式
const mentionIndex = ref(0); // 键盘高亮项
const mentionPos = ref({ x: 0, y: 0 }); // 弹层锚点（光标处）
const mentionListRef = ref<HTMLElement | null>(null);

// 键盘切换高亮时，把该项滚进可视区
watch(mentionIndex, () => {
    nextTick(() => {
        mentionListRef.value
            ?.querySelectorAll("button")[mentionIndex.value]
            ?.scrollIntoView({ block: "nearest" });
    });
});
const groupMembers = ref<GroupMember[]>([]);
const membersLoading = ref(false);
const membersLoadedGroupId = ref<string>("");

onClickOutside(atRef, () => {
    atOpen.value = false;
});

const loadGroupMembers = async () => {
    const gid = selectedId.value;
    if (selectedContact.value !== "group" || !gid) return;
    if (membersLoadedGroupId.value === gid) return;
    membersLoading.value = true;
    try {
        const bot = getCurrentBot();
        const res = await manageApi.getGroupMembers(gid, bot?.self_id ?? undefined);
        if (res?.success && res.data) {
            groupMembers.value = res.data;
            membersLoadedGroupId.value = gid;
        }
    } catch (e) {
        console.error("加载群成员失败:", e);
    } finally {
        membersLoading.value = false;
    }
};

// 读取光标前是否正处于 “@query” 输入态（QQ 式就地提及）
const getTrailingMentionQuery = (): string | null => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    const range = sel.getRangeAt(0);
    if (!range.collapsed) return null;
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return null;
    const before = (node.textContent ?? "").slice(0, range.startOffset);
    const m = /@([^\s@]*)$/.exec(before);
    return m ? m[1] : null;
};

// 把弹层锚到光标处（取当前 range 的矩形）
const updateMentionPos = () => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    if (rect && (rect.left || rect.top)) {
        mentionPos.value = { x: rect.left, y: rect.top };
    } else {
        const box = editorRef.value?.getBoundingClientRect();
        if (box) mentionPos.value = { x: box.left + 12, y: box.top };
    }
};

// 弹层左边（贴光标、且不超出视口右侧）
const mentionLeft = computed(() => {
    const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
    return Math.max(8, Math.min(mentionPos.value.x, vw - 248));
});

// 删除光标前的 “@query” 文本（选成员时用 @片 替换）
const deleteTrailingMention = () => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return;
    const offset = range.startOffset;
    const before = (node.textContent ?? "").slice(0, offset);
    const m = /@[^\s@]*$/.exec(before);
    if (!m) return;
    const del = document.createRange();
    del.setStart(node, offset - m[0].length);
    del.setEnd(node, offset);
    del.deleteContents();
    del.collapse(true);
    sel.removeAllRanges();
    sel.addRange(del);
};

const onEditorInput = async () => {
    const q = getTrailingMentionQuery();
    if (q !== null && selectedContact.value === "group") {
        atKeyword.value = q;
        mentionActive.value = true;
        mentionIndex.value = 0;
        updateMentionPos();
        if (!atOpen.value) {
            atOpen.value = true;
            await loadGroupMembers();
        }
    } else if (mentionActive.value) {
        mentionActive.value = false;
        atOpen.value = false;
    }
};

const closeMention = () => {
    if (atOpen.value || mentionActive.value) {
        atOpen.value = false;
        mentionActive.value = false;
    }
};

// rAF 合并连按：原生方向键重复可能快过渲染，这里每帧只推进一次，避免高亮错位/闪烁
let mentionNavDelta = 0;
let mentionNavScheduled = false;
const stepMention = (delta: number) => {
    mentionNavDelta += delta;
    if (mentionNavScheduled) return;
    mentionNavScheduled = true;
    requestAnimationFrame(() => {
        mentionNavScheduled = false;
        const d = mentionNavDelta;
        mentionNavDelta = 0;
        const len = atList.value.length;
        if (len > 0) {
            mentionIndex.value = Math.min(
                Math.max(mentionIndex.value + d, 0),
                len - 1,
            );
        }
    });
};

// 提及弹层打开时接管方向键/回车/Esc；否则回车发送
const onEditorKeydown = (e: KeyboardEvent) => {
    const len = atList.value.length;
    if (atOpen.value && len > 0) {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            stepMention(1);
            return;
        }
        if (e.key === "ArrowUp") {
            e.preventDefault();
            stepMention(-1);
            return;
        }
        if (e.key === "Enter" && !e.isComposing) {
            e.preventDefault();
            pickAt(atList.value[mentionIndex.value]);
            return;
        }
        if (e.key === "Escape") {
            e.preventDefault();
            closeMention();
            return;
        }
    }
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        handleSendMessage();
    }
};

const displayName = (m: GroupMember) => m.remark || m.nickname || m.user_id;

const atList = computed(() => {
    const kw = atKeyword.value.trim().toLowerCase();
    return groupMembers.value
        .filter(
            (m) =>
                !kw ||
                displayName(m).toLowerCase().includes(kw) ||
                m.user_id.includes(kw),
        )
        .slice(0, 60);
});

// 插入不可编辑的 @ token（contenteditable=false），发送时转 at 段
const insertAtToken = (id: string, name: string) => {
    const editor = editorRef.value;
    if (!editor) return;
    editor.focus();
    const chip = document.createElement("span");
    chip.setAttribute("data-at", id);
    chip.setAttribute("data-at-name", name);
    chip.setAttribute("contenteditable", "false");
    chip.className =
        "mx-0.5 inline-block select-none rounded bg-zx-primary-soft px-1 font-medium text-zx-primary";
    chip.textContent = `@${name}`;
    const space = document.createTextNode(" ");
    const sel = window.getSelection();
    if (sel && sel.rangeCount && editor.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(space);
        range.insertNode(chip);
        range.setStartAfter(space);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
    } else {
        editor.appendChild(chip);
        editor.appendChild(space);
    }
    atOpen.value = false;
};

const pickAt = (m: GroupMember) => {
    if (mentionActive.value) deleteTrailingMention();
    insertAtToken(m.user_id, displayName(m));
    mentionActive.value = false;
};

const stickerBoxClass = (k?: StickerKind) =>
    k === "emoji"
        ? "inline-flex items-center text-xs sm:text-sm"
        : k === "sticker"
        ? "inline-block"
        : "image-message max-w-[min(70%,20rem)]";
const stickerImgClass = (k?: StickerKind) =>
    k === "emoji"
        ? "h-[1.3em] w-[1.3em] object-contain align-middle"
        : k === "sticker"
        ? "max-h-[12em] max-w-full object-contain"
        : "max-w-full align-top";
const stickerPhClass = (k?: StickerKind) =>
    k === "emoji"
        ? "h-[1.3em] w-[1.3em]"
        : k === "sticker"
        ? "h-[8em] w-[8em]"
        : "h-32 w-48";

/** 选择/粘贴/拖拽来的图片统一从这里进编辑器（类型/大小校验） */
const enqueueImages = async (files: File[]) => {
    for (const file of files) {
        if (!file.type.startsWith("image/")) {
            ZXNotification({
                title: "提示",
                message: "只能选择图片文件哦～",
                type: "info",
                position: "top-right",
            });
            continue;
        }
        if (file.size > 10 * 1024 * 1024) {
            ZXNotification({
                title: "提示",
                message: "图片大小不能超过 10MB 哦～",
                type: "info",
                position: "top-right",
            });
            continue;
        }
        insertInlineImage(await fileToBase64(file));
    }
};

// 处理图片选择（文件选择器，支持多选）
const handleImageSelect = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    await enqueueImages(files);
    input.value = "";
};

// 表情与表情包选择
const stickerOpen = ref(false);

const insertText = (text: string) => {
    const editor = editorRef.value;
    if (!editor) return;
    editor.focus();
    let inserted = false;
    try {
        inserted = document.execCommand("insertText", false, text);
    } catch {
        inserted = false;
    }
    if (!inserted) {
        editor.appendChild(document.createTextNode(text));
    }
};

const handleSelectSticker = async (
    sticker: StickerItem,
    kind: StickerKind = "sticker",
) => {
    if (sticker.type === "emoji") {
        insertText(sticker.name || sticker.path);
        return;
    }
    // 默认小表情：有经典 face id 就作为 face 段发送（对端 QQ 显示内联表情而非图片）
    if (kind === "emoji" && sticker.faceId) {
        insertFaceToken(sticker.faceId);
        return;
    }
    // 先试 CDN，失败回退后端本地路由
    const sources = [sticker.path];
    const fb = sticker.fallback || qqntLocalFallback(sticker.path);
    if (fb) sources.push(fb);
    for (let i = 0; i < sources.length; i++) {
        try {
            const res = await fetch(sources[i]);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === "string") {
                    insertInlineImage(reader.result, kind);
                }
            };
            reader.readAsDataURL(blob);
            return;
        } catch (e) {
            if (i === sources.length - 1) {
                console.error("加载表情包失败:", e);
            }
        }
    }
};

// 粘贴：图片插入编辑器，纯文本按原样插入
const handlePaste = async (event: ClipboardEvent) => {
    const clipboard = event.clipboardData;
    const files = Array.from(clipboard?.files ?? []).filter((file) =>
        file.type.startsWith("image/"),
    );
    if (files.length) {
        event.preventDefault();
        await enqueueImages(files);
        return;
    }
    const text = clipboard?.getData("text/plain");
    if (text) {
        // 只按纯文本插入，避免外部富文本样式混进来
        event.preventDefault();
        document.execCommand("insertText", false, text);
    }
};

let dragDepth = 0;
const dragOver = ref(false);

const handleDragEnter = () => {
    dragDepth += 1;
    dragOver.value = true;
};

const handleDragLeave = () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) dragOver.value = false;
};

// 拖拽图片到输入区插入编辑器
const handleDrop = async (event: DragEvent) => {
    dragDepth = 0;
    dragOver.value = false;
    event.preventDefault();
    const files = Array.from(event.dataTransfer?.files ?? []).filter((file) =>
        file.type.startsWith("image/"),
    );
    if (!files.length) return;
    await enqueueImages(files);
};

/** 编辑器内容切面：按顺序抽出文字与内联图片 */
interface EditorPiece {
    type: "text" | "image" | "at";
    text?: string;
    dataUrl?: string;
    sticker?: StickerKind;
    /** face 段的表情 id（默认小表情） */
    face?: string;
    /** at 段：目标 qq（all 表示全体）与显示名 */
    atId?: string;
    atName?: string;
}

const extractEditor = (): EditorPiece[] => {
    const pieces: EditorPiece[] = [];
    const walk = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            pieces.push({ type: "text", text: node.textContent ?? "" });
            return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const el = node as HTMLElement;
        const atId = el.getAttribute?.("data-at");
        if (atId != null) {
            pieces.push({
                type: "at",
                atId,
                atName: el.getAttribute("data-at-name") || atId,
            });
            return;
        }
        if (el.tagName === "IMG") {
            const face = el.getAttribute("data-face");
            if (face) {
                pieces.push({ type: "image", dataUrl: "", face });
                return;
            }
            const sticker = el.getAttribute("data-sticker");
            pieces.push({
                type: "image",
                dataUrl: el.getAttribute("src") ?? "",
                sticker:
                    sticker === "emoji" || sticker === "sticker"
                        ? sticker
                        : undefined,
            });
            return;
        }
        if (el.tagName === "BR") {
            pieces.push({ type: "text", text: "\n" });
            return;
        }
        // contenteditable 的换行是 <div>/<p> 块，抽成换行符
        if (el.tagName === "DIV" || el.tagName === "P") {
            pieces.push({ type: "text", text: "\n" });
        }
        Array.from(el.childNodes).forEach(walk);
    };
    Array.from(editorRef.value?.childNodes ?? []).forEach(walk);
    return pieces;
};

const clearEditor = () => {
    if (editorRef.value) editorRef.value.innerHTML = "";
    imageBase64Map.clear();
};

// ==================== 语音输入 ====================

const {
    recording: voiceRecording,
    duration: voiceDuration,
    start: startRecording,
    stop: stopRecording,
} = useVoiceRecorder();

const toggleRecord = async () => {
    if (voiceRecording.value) {
        const result = await stopRecording();
        if (result?.base64) {
            voiceItems.value.push({
                id: ++voiceSeq,
                dataUrl: result.dataUrl,
                base64: result.base64,
                duration: result.duration,
            });
        } else if (!result) {
            ZXNotification({
                title: "录音失败",
                message: "这段语音没能录下来，再试一次吧 (´；ω；`)",
                type: "error",
                position: "top-right",
            });
        }
        return;
    }
    const ok = await startRecording();
    if (!ok) {
        ZXNotification({
            title: "无法录音",
            message: "没有拿到麦克风权限哦 (｡•ˇ‸ˇ•｡)",
            type: "error",
            position: "top-right",
        });
    }
};

// 发送侧内容段（content 为线上协议格式：文本原文 / base64:// 图片 / base64://voice/ 语音）
interface OutgoingPart {
    type: "text" | "image" | "record" | "face" | "at";
    content: string;
    sticker?: StickerKind;
    /** at 段的显示名（仅本地回显用，发给后端只保留 content=目标qq） */
    name?: string;
}

/** 编辑器内容 + 语音附件 → 有序发送段 */
const buildOutgoingParts = (): OutgoingPart[] => {
    const parts: OutgoingPart[] = [];
    for (const piece of extractEditor()) {
        if (piece.type === "text") {
            const text = piece.text ?? "";
            if (!text) continue;
            const last = parts[parts.length - 1];
            if (last && last.type === "text") {
                last.content += text;
            } else {
                parts.push({ type: "text", content: text });
            }
        } else if (piece.type === "at" && piece.atId) {
            parts.push({
                type: "at",
                content: piece.atId,
                name: piece.atName,
            });
        } else if (piece.face) {
            parts.push({ type: "face", content: piece.face });
        } else if (piece.dataUrl) {
            parts.push({
                type: "image",
                content: `base64://${
                    imageBase64Map.get(piece.dataUrl) ??
                    piece.dataUrl.split(",")[1] ??
                    ""
                }`,
                sticker: piece.sticker,
            });
        }
    }
    for (const voice of voiceItems.value) {
        parts.push({
            type: "record",
            content: `base64://voice/${voice.base64}`,
        });
    }
    return parts;
};

// 发送消息（编辑器文字 + 内联图片 + 语音合为一条消息）
// 移动端软键盘/触摸可能把同一次发送重复触发（连着两条一样的消息），
// 600ms 内的重入直接忽略；正常手动连发的间隔远大于这个值
let lastSendAt = 0;

const handleSendMessage = async () => {
    if (Date.now() - lastSendAt < 600) return;
    const parts = buildOutgoingParts();
    const hasContent = parts.some(
        (part) => part.type !== "text" || part.content.trim(),
    );
    if (!hasContent) {
        ZXNotification({
            title: "提示",
            message: "消息不能为空哦～",
            type: "info",
            position: "top-right",
        });
        return;
    }

    if (!selectedContact.value || !selectedId.value) {
        ZXNotification({
            title: "呜呼～",
            message: "请先选择一个聊天对象哦 (っ °Д °;) っ",
            type: "error",
            position: "top-right",
        });
        return;
    }

    const bot = getCurrentBot();
    if (!bot || !bot.self_id) {
        ZXNotification({
            title: "呜呼～",
            message: "没有找到可用的 Bot (っ °Д °;) っ",
            type: "error",
            position: "top-right",
        });
        return;
    }
    lastSendAt = Date.now();

    // 纯文本单段走原始文本；其余（图片/语音/face/at，含单段）统一走 zxmsg:// JSON
    // 发给后端的段只保留 {type, content}，sticker 仅用于本地回显与渲染
    const single = parts.length === 1 ? parts[0] : null;
    const wireMessage =
        single && single.type === "text"
            ? single.content.trim()
            : `zxmsg://${JSON.stringify(
                  parts.map(({ type, content }) => ({ type, content })),
              )}`;

    // 本地回显：媒体段换成 data URL 直接可显示；face/at 段原样保留
    const echoParts: ChatMessagePart[] = parts.map((part) => {
        if (part.type === "text") {
            return { type: "text", content: part.content };
        }
        if (part.type === "face") {
            return { type: "face", content: part.content };
        }
        if (part.type === "at") {
            // 回显用显示名；发往后端仍是 content=目标qq
            return {
                type: "at",
                content: `@${part.name || part.content}`,
            };
        }
        let payload = part.content;
        if (payload.startsWith("base64://voice/")) {
            payload = payload.slice("base64://voice/".length);
        } else if (payload.startsWith("base64://")) {
            payload = payload.slice("base64://".length);
        }
        const mime = part.type === "record" ? "audio/webm" : "image/png";
        return {
            type: part.type,
            content: payload ? `data:${mime};base64,${payload}` : part.content,
            sticker: part.sticker,
        };
    });
    const textSummary = parts
        .filter((part) => part.type === "text")
        .map((part) => part.content)
        .join("")
        .trim();

    const botAvatar =
        bot.ava_url || `http://q1.qlogo.cn/g?b=qq&nk=${bot.self_id}&s=160`;
    const newMessage: ChatMessage = {
        id: createMessageId(),
        user_id: bot.self_id,
        user_name: "小真寻",
        avatar: botAvatar,
        message:
            textSummary ||
            echoParts.find((part) => part.type !== "text")?.content ||
            "",
        message_type: parts[0].type,
        timestamp: new Date().toISOString(),
        is_self: true,
        sticker: parts.length === 1 ? parts[0].sticker : undefined,
        group_id:
            selectedContact.value === "group" ? selectedId.value : undefined,
        parts: parts.length > 1 ? echoParts : undefined,
    };
    await appendCurrentMessage(newMessage);

    try {
        // 使用 WebSocket 模块发送消息（调用 /manage/send_message 接口）
        await sendWsMessage(
            { self_id: bot.self_id, name: <string>bot.nickname },
            selectedContact.value === "group" ? selectedId.value : null,
            selectedContact.value === "friend" ? selectedId.value : null,
            wireMessage,
        );
    } catch (error: any) {
        console.error("发送消息失败:", error);
        // 发送失败，移除刚添加的消息
        await removeCurrentMessage(newMessage.id);
        ZXNotification({
            title: "发送失败",
            message: "消息发送失败了，可能已断开连接……(´；ω；`)",
            type: "error",
            sticker: "33",
            position: "top-right",
        });
        return;
    }

    clearEditor();
    voiceItems.value = [];
    scrollToBottom();
};

// 获取当前可用的 bot（使用全局选中的 Bot）
const getCurrentBot = () => {
    return botStore.selectedBot || null;
};


// 触发图片上传
const triggerImageUpload = () => {
    imageInput.value?.click();
};

// 滚动到底部：瞬时定位，进入/切换会话直接钉在底部，不做平滑滚动
const scrollToBottom = () => {
    setTimeout(() => {
        messagesContainer.value?.scrollTo({
            top: messagesContainer.value.scrollHeight,
        });
    }, 0);
};

// JSON 字符串尽量格式化展示，失败原样返回
const formatStructured = (raw: string) => {
    try {
        return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
        return raw;
    }
};

// 监听消息变化，贴近底部时自动滚底（翻历史时不打断阅读）
watch(
    () => messages.value.length,
    () => {
        if (isNearBottom()) scrollToBottom();
    },
);

// 切换会话/联系人：重置窗口并直接钉在底部
watch([selectedContact, selectedId], () => {
    renderCount.value = 60;
    atOpen.value = false;
    groupMembers.value = [];
    membersLoadedGroupId.value = "";
    nextTick(() => scrollToBottom());
});

onMounted(async () => {
    scrollToBottom();
});
</script>

<template>
    <div
        :class="[
            'relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm',
            selectedContact ? 'flex' : 'hidden sm:flex',
        ]"
    >
        <!-- 当前聊天信息 -->
        <div
            v-if="currentContactInfo"
            class="flex items-center gap-3 border-b border-gray-200 px-4 pl-6 py-3 pt-4"
        >
            <!-- 移动端返回按钮 -->
            <button
                @click="
                    selectedContact = null;
                    selectedId = '';
                "
                class="flex-shrink-0 rounded-2xl p-1.5 text-gray-500 transition-colors hover:bg-gray-100 sm:hidden"
            >
                <ArrowLeft class="h-5 w-5" />
            </button>
            <div
                class="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-zx-primary-soft text-xs font-bold text-zx-primary"
            >
                <img
                    v-if="currentContactInfo.avatar"
                    :src="currentContactInfo.avatar"
                    referrerpolicy="no-referrer"
                    class="h-full w-full object-cover"
                    @error="
                        (e) =>
                            ((e.target as HTMLImageElement).style.display =
                                'none')
                    "
                />
                <span v-if="!currentContactInfo.avatar">{{
                    currentContactInfo.name.charAt(0)
                }}</span>
            </div>
            <div class="flex min-w-0 flex-1 items-baseline gap-2">
                <p class="truncate font-bold text-gray-700">
                    {{ currentContactInfo.name }}
                </p>
                <p class="truncate text-xs text-gray-500">
                    {{ currentContactInfo.id }}
                </p>
            </div>
            <!-- 右侧详情面板开关 -->
            <button
                :class="
                    props.detailOpen
                        ? 'bg-zx-primary-soft text-zx-primary'
                        : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                "
                class="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors"
                :title="props.detailOpen ? '收起详情' : '查看详情'"
                @click="emit('toggle-detail')"
            >
                <PanelRight class="h-4 w-4" />
            </button>
        </div>

        <!-- 消息列表 -->
        <div
            ref="messagesContainer"
            class="relative flex-1 space-y-3 overflow-y-auto p-3 sm:space-y-4 sm:p-4"
            @scroll.passive="onMessagesScroll"
        >
            <button
                v-if="hiddenCount > 0"
                class="mx-auto mb-2 block cursor-pointer rounded-full px-4 py-1.5 text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-zx-primary"
                type="button"
                @click="loadOlderMessages"
            >
                查看更早的消息（还有 {{ hiddenCount }} 条）
            </button>
            <div
                v-if="messages.length === 0"
                class="flex h-full items-center justify-center text-gray-400"
            >
                <div class="px-4 text-center">
                    <MessageSquare
                        class="mx-auto mb-4 h-12 w-12 opacity-50 sm:h-16 sm:w-16"
                    />
                    <p class="text-sm sm:text-base">暂无消息</p>
                    <p class="mt-2 text-xs sm:text-sm">
                        选择一个联系人开始聊天吧～
                    </p>
                </div>
            </div>

            <div
                v-for="message in visibleMessages"
                :key="message.id"
                class="flex items-start gap-1.5 rounded-xl sm:gap-2"
                :class="[
                    selectMode && isSelected(message.id)
                        ? 'bg-zx-primary-soft/70'
                        : '',
                    selectMode ? 'cursor-pointer' : '',
                ]"
                @contextmenu.prevent.stop="openMessageMenu($event, message)"
                @click="selectMode ? toggleSelect(message.id) : undefined"
            >
                <!-- 多选勾选框：QQNT 式常驻左侧列 -->
                <button
                    v-if="selectMode"
                    type="button"
                    class="mt-3 flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center self-start rounded-md border transition-colors sm:mt-4"
                    :class="
                        isSelected(message.id)
                            ? 'border-zx-primary bg-zx-primary text-white'
                            : 'border-slate-300 bg-white'
                    "
                    @click.stop="toggleSelect(message.id)"
                >
                    <Check v-if="isSelected(message.id)" class="h-3.5 w-3.5" />
                </button>
                <!-- 头像 -->
                <div
                    v-if="!message.is_self"
                    class="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-zx-primary-soft text-xs font-bold text-zx-primary sm:h-10 sm:w-10 sm:text-sm"
                >
                    <img
                        v-if="message.avatar"
                        :src="message.avatar"
                        referrerpolicy="no-referrer"
                        class="h-full w-full object-cover"
                        @error="message.avatar = ''"
                    />
                    <span v-else>{{
                        (message.user_name || message.user_id).charAt(0)
                    }}</span>
                </div>

                <!-- 消息内容列：flex-1 占满行内剩余宽度，气泡的百分比
                     max-width 才有确定基准（宽度随内容收缩的包裹层会让
                     70% 这类百分比陷入循环解析，塌陷成最小内容宽） -->
                <div
                    class="flex min-w-0 flex-1 flex-col"
                    :class="message.is_self ? 'items-end' : 'items-start'"
                >
                    <p
                        class="mb-1 text-xs text-gray-600"
                        v-if="!message.is_self && message.group_id"
                    >
                        {{ message.user_name || "未知用户" }}
                    </p>

                    <!-- 混合内容消息：文字与图片/语音按原始顺序混排 -->
                    <div
                        v-if="message.parts && message.parts.length > 1"
                        :class="
                            message.is_self
                                ? 'bg-zx-primary text-[color:var(--zx-color-on-primary)] rounded-br-xs'
                                : 'bg-gray-200 text-gray-800 rounded-bl-xs'
                        "
                        class="max-w-[min(70%,28rem)] overflow-hidden rounded-2xl"
                    >
                        <div class="px-3 py-2 text-xs sm:text-sm leading-relaxed">
                            <template
                                v-for="(part, partIndex) in message.parts"
                                :key="partIndex"
                            >
                                <img
                                    v-if="part.type === 'image'"
                                    v-image-viewer:chat
                                    :src="part.content"
                                    :class="
                                        part.sticker === 'emoji'
                                            ? 'inline-block h-[1.3em] w-[1.3em] object-contain align-middle'
                                            : part.sticker === 'sticker'
                                            ? 'inline-block max-h-[12em] max-w-full rounded-lg object-contain align-middle'
                                            : 'inline-block max-h-48 max-w-full rounded-lg object-contain align-middle'
                                    "
                                    referrerpolicy="no-referrer"
                                />
                                <audio
                                    v-else-if="part.type === 'record'"
                                    controls
                                    :src="part.content"
                                    class="inline-block h-8 max-w-56 align-middle"
                                ></audio>
                                <FaceImg
                                    v-else-if="part.type === 'face'"
                                    :id="part.content"
                                />
                                <span
                                    v-else-if="part.type === 'at'"
                                    class="mx-0.5 inline-block rounded bg-zx-primary-soft px-1 align-middle font-medium text-zx-primary"
                                >{{ part.content }}</span>
                                <span
                                    v-else
                                    class="whitespace-pre-wrap break-words align-middle"
                                >{{ part.content }}</span>
                            </template>
                        </div>
                    </div>

                    <!-- 默认表情：与文字同地位，走文字气泡里的行内小脸 -->
                    <div
                        v-else-if="
                            message.message_type === 'image' &&
                            message.sticker === 'emoji'
                        "
                        :class="
                            message.is_self
                                ? 'bg-zx-primary text-[color:var(--zx-color-on-primary)] rounded-br-xs'
                                : 'bg-gray-200 text-gray-800 rounded-bl-xs'
                        "
                        class="max-w-[min(70%,28rem)] overflow-hidden rounded-2xl text-xs sm:text-sm"
                        v-image-viewer:chat
                    >
                        <span class="inline-block px-3 py-2 leading-none">
                            <img
                                :src="message.message"
                                class="inline-block h-[1.3em] w-[1.3em] align-middle object-contain"
                                referrerpolicy="no-referrer"
                            />
                        </span>
                    </div>

                    <!-- 图片消息 -->
                    <div
                        v-else-if="message.message_type === 'image'"
                        :class="[
                            'overflow-hidden rounded-xl',
                            stickerBoxClass(message.sticker),
                        ]"
                        v-image-viewer:chat
                    >
                        <img
                            v-show="imageState[message.id] === 'loaded'"
                            :src="message.message"
                            :class="stickerImgClass(message.sticker)"
                            referrerpolicy="no-referrer"
                            @load="imageState[message.id] = 'loaded'"
                            @error="imageState[message.id] = 'error'"
                        />
                        <div
                            v-if="imageState[message.id] === 'error'"
                            :class="[
                                'flex items-center justify-center rounded-xl bg-gray-100',
                                stickerPhClass(message.sticker),
                            ]"
                        >
                            <div
                                v-if="message.sticker !== 'emoji'"
                                class="text-center text-gray-400"
                            >
                                <AlertCircle class="mx-auto mb-1 h-6 w-6 text-zx-warning" />
                                <span class="text-xs">图片加载失败</span>
                            </div>
                        </div>
                        <div
                            v-else-if="imageState[message.id] !== 'loaded'"
                            :class="[
                                'flex items-center justify-center rounded-xl bg-gray-100',
                                stickerPhClass(message.sticker),
                            ]"
                        >
                            <div
                                v-if="message.sticker !== 'emoji'"
                                class="text-xs text-gray-400"
                            >
                                加载中...
                            </div>
                        </div>
                    </div>

                    <!-- 语音消息 -->
                    <div
                        v-else-if="message.message_type === 'record'"
                        :class="message.is_self ? 'bg-zx-primary text-[color:var(--zx-color-on-primary)]' : 'bg-gray-200 text-gray-800'"
                        class="max-w-[min(70%,28rem)] overflow-hidden rounded-2xl"
                    >
                        <div class="flex items-center gap-2 px-3 py-2 text-xs sm:text-sm">
                            <Mic class="h-4 w-4 shrink-0" />
                            <audio
                                v-if="message.message"
                                controls
                                :src="message.message"
                                class="h-8 max-w-56"
                            ></audio>
                            <span v-else>语音消息</span>
                        </div>
                    </div>

                    <!-- 视频消息 -->
                    <div
                        v-else-if="message.message_type === 'video'"
                        class="max-w-[min(70%,28rem)] overflow-hidden rounded-xl"
                    >
                        <video
                            v-if="message.message"
                            controls
                            :src="message.message"
                            class="max-h-72 max-w-full rounded-xl"
                        ></video>
                        <div
                            v-else
                            :class="message.is_self ? 'bg-zx-primary text-[color:var(--zx-color-on-primary)]' : 'bg-gray-200 text-gray-800'"
                            class="flex items-center gap-2 rounded-2xl px-3 py-2 text-xs sm:text-sm"
                        >
                            <Video class="h-4 w-4 shrink-0" />
                            视频消息
                        </div>
                    </div>

                    <!-- JSON / XML 卡片数据 -->
                    <div
                        v-else-if="
                            message.message_type === 'json' ||
                            message.message_type === 'xml'
                        "
                        class="max-w-[min(70%,28rem)] overflow-hidden rounded-2xl"
                    >
                        <div class="flex items-center gap-2 px-3 pt-2 text-xs text-gray-500">
                            <FileText class="h-3.5 w-3.5 shrink-0" />
                            {{ message.message_type === "json" ? "JSON 卡片" : "XML 卡片" }}
                        </div>
                        <pre
                            class="max-h-48 overflow-auto px-3 pb-2 pt-1 text-left font-mono text-[10px] leading-4 whitespace-pre-wrap text-gray-600"
                        >{{
                            formatStructured(message.message)
                        }}</pre>
                    </div>

                    <!-- 合并转发卡片：点击打开聊天记录查看器 -->
                    <div
                        v-else-if="message.message_type === 'forward'"
                        class="max-w-[min(70%,28rem)] overflow-hidden rounded-2xl bg-gray-200 text-gray-800"
                    >
                        <button
                            type="button"
                            class="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-black/5"
                            @click.stop="
                                selectMode
                                    ? toggleSelect(message.id)
                                    : openForward(message.message)
                            "
                        >
                            <MessagesSquare
                                class="h-8 w-8 shrink-0 rounded-lg bg-zx-primary-soft p-1.5 text-zx-primary"
                            />
                            <div class="min-w-0 flex-1">
                                <p class="text-xs sm:text-sm">聊天记录</p>
                                <p class="text-[10px] text-gray-500">
                                    点击查看转发的消息
                                </p>
                            </div>
                            <ChevronRight class="h-4 w-4 shrink-0 text-gray-400" />
                        </button>
                    </div>

                    <!-- 链接 / 音乐 / 位置 卡片 -->
                    <div
                        v-else-if="
                            message.message_type === 'share' ||
                            message.message_type === 'music' ||
                            message.message_type === 'location'
                        "
                        class="max-w-[min(70%,28rem)] overflow-hidden rounded-2xl bg-gray-200 text-gray-800"
                    >
                        <div class="flex items-start gap-2 px-3 py-2">
                            <Link2
                                v-if="message.message_type === 'share'"
                                class="mt-0.5 h-4 w-4 shrink-0 text-gray-500"
                            />
                            <Music
                                v-else-if="message.message_type === 'music'"
                                class="mt-0.5 h-4 w-4 shrink-0 text-gray-500"
                            />
                            <MapPin
                                v-else-if="message.message_type === 'location'"
                                class="mt-0.5 h-4 w-4 shrink-0 text-gray-500"
                            />
                            <MessageSquare
                                v-else
                                class="mt-0.5 h-4 w-4 shrink-0 text-gray-500"
                            />
                            <div class="min-w-0">
                                <p class="break-words text-xs sm:text-sm">
                                    {{
                                        message.message ||
                                        message.message_type.replace(/^\w/, (c) =>
                                            c.toUpperCase(),
                                        )
                                    }}
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- 表情消息（QQ 默认表情 face 段）：气泡内行内小脸 -->
                    <div
                        v-else-if="message.message_type === 'face'"
                        :class="
                            message.is_self
                                ? 'bg-zx-primary text-[color:var(--zx-color-on-primary)] rounded-br-xs'
                                : 'bg-gray-200 text-gray-800 rounded-bl-xs'
                        "
                        class="max-w-[min(70%,28rem)] overflow-hidden rounded-2xl text-xs sm:text-sm"
                    >
                        <span class="inline-block px-3 py-2 leading-none">
                            <FaceImg :id="message.message" />
                        </span>
                    </div>

                    <!-- 文本等其它消息 -->
                    <div
                        v-else
                        :class="[
                            message.is_self
                                ? 'bg-zx-primary text-[color:var(--zx-color-on-primary)] rounded-br-xs'
                                : 'bg-gray-200 text-gray-800 rounded-bl-xs',
                        ]"
                        class="max-w-[min(70%,28rem)] overflow-hidden rounded-2xl"
                    >
                        <p class="px-3 py-2 text-xs break-words sm:text-sm">
                            {{ message.message }}
                        </p>
                    </div>

                    <p
                        :class="
                            message.is_self ? 'text-right' : 'text-left'
                        "
                        class="mt-1 text-[10px] text-gray-500"
                    >
                        {{ new Date(message.timestamp).toLocaleTimeString() }}
                    </p>
                </div>

                <!-- 自己的头像 -->
                <div
                    v-if="message.is_self"
                    class="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-zx-primary-soft text-xs font-bold text-zx-primary sm:h-10 sm:w-10 sm:text-sm"
                >
                    <img
                        v-if="message.avatar"
                        :src="message.avatar"
                        referrerpolicy="no-referrer"
                        class="h-full w-full object-cover"
                        @error="message.avatar = ''"
                    />
                    <span v-else>{{ "自" }}</span>
                </div>
            </div>
        </div>

        <!-- 回到底部：翻历史时出现 -->
        <button
            v-if="showScrollBottom"
            class="btn-touch absolute right-5 bottom-24 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-500 shadow-md backdrop-blur-sm transition-colors hover:text-zx-primary"
            type="button"
            title="回到底部"
            @click="scrollToBottom()"
        >
            <ArrowDown class="h-4 w-4" />
        </button>

        <!-- 多选底部操作条：仿 QQNT，覆盖输入区 -->
        <div
            v-if="selectMode"
            class="absolute inset-x-0 bottom-0 z-20 flex items-center gap-3 border-t border-slate-200 bg-white px-4 py-3"
        >
            <button
                type="button"
                class="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                title="退出多选"
                @click="exitSelectMode"
            >
                <X class="h-4 w-4" />
            </button>
            <p class="min-w-0 flex-1 truncate text-sm text-zx-text">
                已选 <span class="font-semibold text-zx-primary">{{ selectedCount }}</span> 条
            </p>
            <ZxButton
                size="sm"
                :disabled="selectedCount === 0"
                @click="forwardSelected"
            >
                <CornerUpRight class="h-4 w-4" />
                转发
            </ZxButton>
        </div>

        <!-- 输入框区域 -->
        <div
            class="relative bg-white p-3"
            v-if="selectedContact && !selectMode"
            @dragenter.prevent="handleDragEnter"
            @dragover.prevent
            @dragleave="handleDragLeave"
            @drop.prevent="handleDrop"
        >
            <!-- 语音附件（录音后挂在输入框上方） -->
            <div
                v-if="voiceItems.length || voiceRecording"
                class="mb-2 flex items-center gap-2 overflow-x-auto"
            >
                <div
                    v-for="item in voiceItems"
                    :key="item.id"
                    class="flex shrink-0 items-center gap-2 rounded-xl bg-slate-100 px-2.5 py-1.5"
                >
                    <Mic class="h-4 w-4 shrink-0 text-zx-primary" />
                    <audio controls :src="item.dataUrl" class="h-8 max-w-44"></audio>
                    <span class="shrink-0 text-xs text-slate-400">
                        {{ item.duration }}s
                    </span>
                    <button
                        class="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                        title="移除"
                        type="button"
                        @click="removeVoiceItem(item.id)"
                    >
                        <X class="h-3 w-3" />
                    </button>
                </div>
                <!-- 录音中提示 -->
                <div
                    v-if="voiceRecording"
                    class="flex shrink-0 items-center gap-2 rounded-xl bg-red-50 px-3 py-1.5"
                >
                    <span
                        class="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500"
                    ></span>
                    <span class="text-xs font-semibold text-red-500">
                        录音中 {{ voiceDuration }}s
                    </span>
                </div>
            </div>

            <!-- 工具栏（输入框上方） -->
            <div class="mb-1.5 flex items-center gap-0.5 px-0.5">
                <ZxButton
                    variant="ghost"
                    circle
                    size="sm"
                    title="插入图片"
                    @click="triggerImageUpload"
                >
                    <ImageIcon class="h-4 w-4" />
                </ZxButton>
                <!-- 隐藏的图片输入（可多选） -->
                <input
                    ref="imageInput"
                    type="file"
                    accept="image/*"
                    multiple
                    class="hidden"
                    @change="handleImageSelect"
                />

                <!-- 表情与表情包 -->
                <div class="relative">
                    <button
                        type="button"
                        :class="
                            stickerOpen
                                ? 'bg-pink-100 text-pink-600 dark:bg-pink-950/50 dark:text-pink-300'
                                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                        "
                        class="btn-touch flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors"
                        title="表情与表情包"
                        @click="stickerOpen = !stickerOpen"
                    >
                        <Smile class="h-4 w-4" />
                    </button>

                    <StickerPicker
                        v-model="stickerOpen"
                        @select="handleSelectSticker"
                    />
                </div>

                <!-- 语音按钮 -->
                <button
                    type="button"
                    :class="
                        voiceRecording
                            ? 'bg-red-100 text-red-500'
                            : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                    "
                    class="btn-touch flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors"
                    :title="
                        voiceRecording
                            ? `停止录音（${voiceDuration}s）`
                            : '录制语音'
                    "
                    @click="toggleRecord"
                >
                    <Mic
                        :class="voiceRecording ? 'animate-pulse' : ''"
                        class="h-4 w-4"
                    />
                </button>

                <!-- 历史记录 -->
                <ZxButton
                    variant="ghost"
                    circle
                    size="sm"
                    class="ml-auto"
                    title="历史记录"
                    @click="historyOpen = true"
                >
                    <Clock class="h-4 w-4" />
                </ZxButton>
            </div>

            <!-- 拖拽提示遮罩 -->
            <div
                v-if="dragOver"
                class="pointer-events-none absolute inset-x-0 bottom-0 z-10 m-3 rounded-2xl border-2 border-dashed border-zx-primary bg-white/80 py-6 text-center text-xs font-semibold text-zx-primary"
            >
                松开把图片插入输入框
            </div>

            <!-- 富文本输入框：文字与内联图片混排，发送按钮在框内右下角 -->
            <div class="relative">
                <div
                    ref="editorRef"
                    contenteditable="true"
                    data-placeholder="输入消息，按 Enter 发送"
                    class="rich-editor max-h-32 min-h-12 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 pr-14 text-sm leading-5 text-slate-700 focus:outline-none"
                    @input="onEditorInput"
                    @keydown="onEditorKeydown"
                    @paste="handlePaste"
                ></div>
                <ZxButton
                    circle
                    size="sm"
                    class="absolute bottom-1.5 right-1.5 shadow-sm"
                    title="发送"
                    @click="handleSendMessage"
                >
                    <Send class="h-4 w-4" />
                </ZxButton>
            </div>
        </div>

        <!-- 历史记录弹窗 -->
        <ChatHistoryModal
            :visible="historyOpen"
            :contact-type="selectedContact"
            :contact-id="selectedId"
            :contact-name="currentContactInfo?.name ?? ''"
            @close="historyOpen = false"
        />

        <!-- 合并转发查看器 -->
        <ForwardViewer
            :visible="forwardOpen"
            :forward-id="forwardId"
            :bot-id="forwardBotId"
            :local-nodes="forwardLocalNodes"
            @close="forwardOpen = false"
        />

        <!-- 转发目标选择器 -->
        <ContactPickerModal
            :visible="pickerOpen"
            @close="pickerOpen = false"
            @pick="doForward"
        />

        <!-- @ 提及成员浮层：贴光标、随主题、↑↓/Enter 选择 -->
        <Teleport to="body">
            <div
                v-if="atOpen && selectedContact === 'group'"
                ref="atRef"
                class="fixed z-[9999] w-60 select-none overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                :style="{
                    left: mentionLeft + 'px',
                    top: mentionPos.y - 8 + 'px',
                    transform: 'translateY(-100%)',
                }"
                @contextmenu.prevent.stop
                @selectstart.prevent
            >
                <div
                    ref="mentionListRef"
                    class="flex max-h-60 flex-col gap-1 overflow-y-auto p-1.5"
                >
                    <div
                        v-if="membersLoading"
                        class="px-3 py-4 text-center text-xs text-zx-text-muted"
                    >
                        加载成员中…
                    </div>
                    <div
                        v-else-if="atList.length === 0"
                        class="px-3 py-4 text-center text-xs text-zx-text-muted"
                    >
                        没有匹配的成员
                    </div>
                    <button
                        v-for="(m, i) in atList"
                        :key="m.user_id"
                        type="button"
                        class="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 text-left"
                        :class="
                            i === mentionIndex
                                ? 'bg-zx-primary-soft'
                                : 'hover:bg-zx-primary-soft/60'
                        "
                        @mousedown.prevent
                        @click="pickAt(m)"
                    >
                        <img
                            v-if="m.ava_url"
                            :src="m.ava_url"
                            class="h-7 w-7 shrink-0 rounded-full bg-slate-100 object-cover"
                            referrerpolicy="no-referrer"
                        />
                        <span
                            v-else
                            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zx-primary-soft text-xs text-zx-primary"
                        >
                            {{ displayName(m).charAt(0) || "?" }}
                        </span>
                        <span class="min-w-0 flex-1">
                            <span class="block truncate text-sm text-zx-text">{{
                                displayName(m)
                            }}</span>
                        </span>
                    </button>
                </div>
            </div>
        </Teleport>
    </div>
</template>

<style scoped>
/* 富文本输入框：内联图片与占位提示（运行时插入的节点拿不到 scoped 属性，需 :deep）
   图片与文字行内混排，同行文字与图片底部对齐（text-bottom），行框随图片撑高 */
.rich-editor :deep(img) {
    display: inline-block;
    max-height: 6rem;
    max-width: 12rem;
    margin: 0 2px;
    border-radius: 0.5rem;
    vertical-align: text-bottom;
}

/* 原生光标由 useCustomCaret 自绘替代 */
.rich-editor {
    caret-color: transparent;
}

.rich-editor:empty::before {
    content: attr(data-placeholder);
    color: var(--zx-color-text-muted, #94a3b8);
    pointer-events: none;
}

/* 图片按原始比例完整显示，只限制最大尺寸 */
.image-message img {
    width: auto;
    height: auto;
    max-width: 100%;
    max-height: 20rem;
}
</style>
