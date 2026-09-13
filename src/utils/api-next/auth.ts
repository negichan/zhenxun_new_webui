/**
 * WebUI Next API - 认证接口
 */

import { api } from './client'
import type { LoginRequest, LoginResponse, APIResponse } from '@/types/api-next.types'

export const authApi = {
    login(request: LoginRequest, options?: Record<string, any>): Promise<APIResponse<LoginResponse>> {
        return api.post<LoginResponse>('/auth/login', request, {
            headers: { 'Content-Type': 'application/json' },
            ...options
        })
    },

    verifyToken(token: string): Promise<APIResponse<{ valid: boolean; username?: string; error?: string }>> {
        // token 经 Authorization 头传递（拦截器自动附带），不拼 query，
        // 避免 JWT 落进服务器访问日志
        return api.get('/auth/verify')
    },

    refreshToken(token: string): Promise<APIResponse<LoginResponse>> {
        return api.post('/auth/refresh')
    },
}
