/**
 * 鉴权 Token 数据类型
 */
export interface AccessTokenResponse {
    access_token: string;
    token_type: string;
}

/**
 * 基本响应类型（支持泛型 data，更加灵活和类型安全）
 */
export interface BaseResponse<T = any> {
    suc: boolean;
    info: string;
    data: T;
    code: number;
    warning: string;
}