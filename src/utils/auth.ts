/**
 * 认证工具函数
 *
 * 登录态存 localStorage：同域下主站与独立调试客户端窗口天然共享，
 * 代价是关闭标签页不再自动登出（token 过期后重新登录即可）。
 */

const AUTH_KEY = 'isAuthenticated'
const TOKEN_KEY = 'token'
// 红屏"强制访问"标记：存 sessionStorage——本标签页内刷新不丢，
// 关闭标签页或登出后失效，下次无协议端进入仍会被红屏拦下
const FORCE_ENTER_KEY = 'zxForceEnter'
// 红屏拦截态标记：红屏期间路由退回登录页（token 保留），
// 守卫对"已登录去登录页"的拦截要靠它放行，协议端接入进入主站时清除
const WHITE_GATE_KEY = 'zxWhiteGate'
// 会话 cookie：打包部署在后端 dist 时，伺服层靠它判断页面导航是否放行
// （浏览器首次导航带不上 localStorage 的 token，只能靠 cookie 携带登录态）
const SESSION_COOKIE = 'zx_auth'
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 7

function setSessionCookie(token: string) {
    const raw = token.replace(/^Bearer\s+/i, '')
    if (!raw) return
    document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(raw)}; path=/; SameSite=Lax; max-age=${SESSION_COOKIE_MAX_AGE}`
}

function clearSessionCookie() {
    document.cookie = `${SESSION_COOKIE}=; path=/; Max-Age=0`
}

// 一次性迁移：老会话的 token 还留在 sessionStorage 里，搬过来
if (!localStorage.getItem(TOKEN_KEY)) {
    const legacy = sessionStorage.getItem(TOKEN_KEY)
    if (legacy) {
        localStorage.setItem(TOKEN_KEY, legacy)
        sessionStorage.removeItem(TOKEN_KEY)
    }
}

export const auth = {
    setAuthState(state: boolean) {
        localStorage.setItem(AUTH_KEY, String(state))
    },

    getAuthState(): boolean {
        return localStorage.getItem(AUTH_KEY) === 'true'
    },

    setAuthToken(type: string, token: string) {
        const formattedToken = token.startsWith('Bearer ') || token.startsWith('bearer ')
            ? token
            : `${type.charAt(0).toUpperCase() + type.slice(1)} ${token}`
        localStorage.setItem(TOKEN_KEY, formattedToken)
        setSessionCookie(formattedToken)
    },

    getAuthToken(): string | null {
        return localStorage.getItem(TOKEN_KEY)
    },

    deleteAuthToken() {
        localStorage.removeItem(TOKEN_KEY)
    },

    /** 记住本会话选择过"强制访问"：刷新页面不再重复弹红屏 */
    setForceEnter() {
        sessionStorage.setItem(FORCE_ENTER_KEY, '1')
    },

    hasForceEnter(): boolean {
        return sessionStorage.getItem(FORCE_ENTER_KEY) === '1'
    },

    setWhiteGate() {
        sessionStorage.setItem(WHITE_GATE_KEY, '1')
    },

    clearWhiteGate() {
        sessionStorage.removeItem(WHITE_GATE_KEY)
    },

    hasWhiteGate(): boolean {
        return sessionStorage.getItem(WHITE_GATE_KEY) === '1'
    },

    /**
     * 把 localStorage 里的 token 同步进会话 cookie（缺失或不一致才写）。
     * 已登录但 cookie 被单独清掉的极端情况下，靠路由守卫在首次导航时
     * 调用补写，避免伺服层闸门把已登录用户挡在登录页外
     */
    syncSessionCookie() {
        const token = this.getAuthToken()
        if (!token) return
        const raw = token.replace(/^Bearer\s+/i, '')
        if (raw && !document.cookie.includes(`${SESSION_COOKIE}=${encodeURIComponent(raw)}`)) {
            setSessionCookie(raw)
        }
    },

    logout() {
        this.deleteAuthToken()
        this.setAuthState(false)
        sessionStorage.removeItem(FORCE_ENTER_KEY)
        sessionStorage.removeItem(WHITE_GATE_KEY)
        clearSessionCookie()
    }
}
