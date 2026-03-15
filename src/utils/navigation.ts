import type { RouteLocationRaw, Router } from "vue-router";



export async function navigateTo(path:RouteLocationRaw) {
    try {
        // 使用更可靠的导入方式
        // 动态导入路由模块，假设它导出的是 Vue Router 实例（通常是 default export）
        const routerModule = await import('@/router/index.js')

        // 尝试从导入结果中获取 router 实例
        // 假设你的 /router/index.js 默认导出了一个 Vue Router 实例
        const router = routerModule?.router as Router | undefined

        // 检查 router 对象及其 push 方法是否存在
        if (router && typeof router.push === 'function') {
            await router.push(path);
        } else {
            // 更优雅的备选方案
            window.location.hash = `#${path}`;
        }
    } catch (error) {
        console.error('路由导航失败:', error);
        // 提供更友好的备选方案
        window.location.hash = `#${path}`;
    }
}