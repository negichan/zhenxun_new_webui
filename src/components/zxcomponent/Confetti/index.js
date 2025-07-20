import { createVNode, render } from 'vue'


// 记录最近鼠标坐标
let mouseX = window.innerWidth / 2
let mouseY = window.innerHeight / 2

window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX
    mouseY = e.clientY
})

let vm = null

let loadingPromise = null

function ensureMounted() {
    if (vm) return vm
    if (loadingPromise) return vm  // 正在加载，先返回null或旧实例

    loadingPromise = import('./Confetti.vue').then(({ default: ConfettiVue }) => {
        const container = document.createElement('div')
        document.body.appendChild(container)

        const vnode = createVNode(ConfettiVue)
        render(vnode, container)
        vm = vnode.component

        return vm
    })

    return vm  // 第一次调用时返回 null，后续调用有实例
}

function baseConfetti(options = {}) {
    const { x = window.innerWidth / 2, y = window.innerHeight / 2 } = options
    ensureMounted()?.exposed.launch(x, y, options)
}

// 主函数
const ZXConfetti = baseConfetti

// 在鼠标位置爆炸（不需要传参）
ZXConfetti.atMouse = function (options = {}) {
    ZXConfetti({ x: mouseX, y: mouseY, ...options })
}

// 在元素中心爆炸
ZXConfetti.atElement = function (el, options = {}) {
    const rect = el.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    ZXConfetti({ x, y, ...options })
}

// ✅ 风格预设
ZXConfetti.success = () =>
    ZXConfetti.atMouse({
        total: 40,
        colors: ['#34d399', '#10b981', '#6ee7b7'],
        emojiList: ['✅', '🎉', '👍'],
        useEmoji: true,
    })

ZXConfetti.error = () =>
    ZXConfetti.atMouse({
        total: 40,
        colors: ['#f87171', '#ef4444', '#dc2626'],
        emojiList: ['❌', '💥', '😵'],
        useEmoji: true,
    })

ZXConfetti.fireworks = () =>
    ZXConfetti.atMouse({
        total: 80,
        useEmoji: true,
        emojiList: ['🎆', '✨', '🎇', '💫'],
        colors: ['#60a5fa', '#fbbf24', '#a78bfa', '#34d399'],
    })

export { ZXConfetti }
