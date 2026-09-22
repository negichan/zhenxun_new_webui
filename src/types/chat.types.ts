/**
 * 消息类型（覆盖 OneBot v11 常见消息段）
 */
export type MessageType =
    | 'text'
    | 'image'
    | 'face'
    | 'record'
    | 'video'
    | 'at'
    | 'reply'
    | 'json'
    | 'xml'
    | 'forward'
    | 'share'
    | 'music'
    | 'location'

/**
 * 表情显示档：emoji = QQ 默认小表情（随字号缩放到很小的脸）；
 * sticker = 表情包贴纸（对标 QQ 贴纸，随气泡宽度自适应）
 */
export type StickerKind = 'emoji' | 'sticker'

/**
 * 混合消息的内容段（文本/图片等按原始顺序）
 */
export interface ChatMessagePart {
    type: MessageType
    content: string
    /** 图片段若来自表情选择器，标注显示档用于自适应缩放 */
    sticker?: StickerKind
    /** at 段的真实目标 QQ（接收侧从后端 qq 字段带入，转发时还原为 at 段） */
    qq?: string
}

/**
 * 聊天消息类型
 */
export interface ChatMessage {
    id: number
    user_id: string
    user_name?: string
    avatar?: string
    message: string
    message_type: MessageType
    timestamp: string
    is_self: boolean
    group_id?: string
    group_name?: string
    /** 混合消息的内容段；单类型消息不设，仍走 message/message_type */
    parts?: ChatMessagePart[]
    /** 单段图片消息的表情显示档 */
    sticker?: StickerKind
}

/**
 * 发送消息参数
 */
export interface SendMessageParam {
    bot_id: string
    user_id?: string | null
    group_id?: string | null
    message: string
}

/**
 * 消息项类型（用于 WebSocket 实时消息）
 */
export interface MessageItem {
    type: string
    msg: string
    time: string
}

/**
 * WebSocket 聊天消息类型（用于接收后端推送的实时消息）
 */
export interface ChatWebSocketMessage {
    object_id: string
    user_id: string
    group_id?: string | null
    message: MessageItem[]
    name: string
    ava_url: string
}

/**
 * 合并转发查看器的段与节点（后端归一后的可展示结构）
 */
export interface ForwardSegment {
    type: string
    content: string
}
export interface ForwardNode {
    user_id: string
    nickname: string
    time?: number | string | null
    segments: ForwardSegment[]
}

/**
 * 好友类型
 */
export interface Friend {
    user_id: string
    nickname: string
    remark?: string
    ava_url: string
}
/**
 * 群组类型
 */
export interface Group {
    group_id: string
    group_name: string
    ava_url: string
}
