/**
 * QQ 默认表情（face）id ↔ 资源解析
 *
 * `[CQ:face,id=N]` 的 N 与 koishijs/QFace 的经典数字 emojiId 同一套（0=惊讶、14=微笑…）。
 * 收/发都用这个 id 空间；如日后换适配器导致 id 对不上，只需在此处加一张映射表。
 */

const CDN_BASE =
    "https://cdn.jsdelivr.net/gh/koishijs/QFace@master/public/assets/qq_emoji";
const LOCAL_BASE = "/zhenxun/api/v1/sticker/qq";

/** 是否为合法的 QQ 经典表情数字 id */
export function isFaceId(id?: string | number | null): boolean {
    return id !== undefined && id !== null && /^\d{1,4}$/.test(String(id));
}

/** 首选 CDN（apng，缺则 png 由兜底路由处理） */
export function faceCdnUrl(id: string | number): string {
    return `${CDN_BASE}/${id}/apng/${id}.png`;
}

/** 后端本地兜底路由（apng 优先，退回静态 png） */
export function faceLocalUrl(id: string | number): string {
    return `${LOCAL_BASE}/${id}.png`;
}
