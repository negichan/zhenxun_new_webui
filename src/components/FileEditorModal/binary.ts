/**
 * base64 ↔ 字节工具：hex / utf-8 视图共用。
 */

export const b64ToBytes = (b64: string): Uint8Array => {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
};

/** 按 UTF-8 解码（非法序列替换为 U+FFFD，二进制文件也能"文本视图"看个大概） */
export const b64ToUtf8 = (b64: string): string => {
    try {
        return new TextDecoder("utf-8", { fatal: false }).decode(b64ToBytes(b64));
    } catch {
        return "";
    }
};
