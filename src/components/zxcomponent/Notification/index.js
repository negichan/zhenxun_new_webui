import { createVNode, render } from 'vue'
// import CenterNotification from './Notification.vue'


// 🔧 默认设置
const defaultOptions = {
    duration: 3000,
    position: 'top-center',
    type: 'info',
    customClass: '',
    confetti: false,
}

let vm = null
let loadingPromise = null

function ensureMounted() {
    if (vm) return Promise.resolve(vm)
    if (loadingPromise) return loadingPromise

    loadingPromise = import('./Notification.vue').then(({ default: CenterNotification }) => {
        return new Promise((resolve) => {
            const container = document.createElement('div')
            document.body.appendChild(container)

            const vnode = createVNode(CenterNotification)
            render(vnode, container)

            const checkReady = () => {
                const instance = vnode.component
                if (instance && instance.exposed && instance.exposed.addNotification) {
                    vm = instance
                    resolve(vm)
                } else {
                    requestAnimationFrame(checkReady) // 等待下个 tick
                }
            }

            checkReady()
        })
    })

    return loadingPromise
}

/**
 * 显示一个通知
 * @param {Object} options - 通知配置，可以是字符串或对象
 *   如果是字符串，将被用作通知消息内容
 *   如果是对象，支持以下属性：
 * @param {string} [options.message] - 通知消息内容（必填）
 * @param {string} [options.title] - 通知标题
 * @param {'info'|'success'|'warning'|'error'} [options.type] - 通知类型
 * @param {number} [options.duration] - 自动关闭延时(毫秒)，0表示不自动关闭
 * @param {function} [options.onClose] - 关闭回调
 * @param {string} [options.position] - 通知位置，如 'top-right', 'bottom-left' 等
 * @param {string} [options.customClass] - 自定义类名
 * @param {string} [options.contentClass] - 自定义内容类名
 * @param {boolean} [options.confetti = false,] - 显示成功烟花
 *
 * @example
 * // 对象形式
 * ZXNotification({
 *   title: '提示',
 *   message: '操作成功',
 *   type: 'success',
 *   duration: 3000
 * })
 */

function ZXNotification(options) {
    const finalOptions = {
        ...defaultOptions,
        ...(typeof options === 'string' ? {message: options} : options),
    }

    ensureMounted().then((comp) => {
        comp.exposed?.addNotification(finalOptions)
    })
}


// 快捷函数
['success', 'error', 'info', 'warning'].forEach((type) => {
    ZXNotification[type] = (opts) => {
        const config = typeof opts === 'string' ? {message: opts} : opts
        ZXNotification({...defaultOptions, ...config, type})
    }
})

// 🌐 设置默认值
ZXNotification.setDefaultOptions = (opts) => {
    Object.assign(defaultOptions, opts)
}

// ✅ 重置默认值
ZXNotification.resetDefaultOptions = () => {
    Object.assign(defaultOptions, {
        duration: 3000,
        position: 'top-center',
        type: 'info',
        customClass: '',
        confetti: false,
    })
}

export default ZXNotification
