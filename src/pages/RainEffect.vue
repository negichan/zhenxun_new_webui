<template>
    <canvas ref="canvasRef" class="fixed top-0 left-0 w-screen h-screen z-50 pointer-events-none" />
</template>

<script setup>
import { onMounted, ref, toRefs, onBeforeUnmount } from 'vue'

const props = defineProps({
    rainAmount: { type: Number, default: 100 },
    accelerationMin: { type: Number, default: 0.10 },
    accelerationMax: { type: Number, default: 0.15 },
    airResistance: { type: Number, default: 0.99 },
    windX: { type: Number, default: 0 },
    maxWindX: { type: Number, default: 2 },
    realisticWind: { type: Boolean, default: false },
    useNoiseWind: { type: Boolean, default: true },
    dropWidth: { type: Number, default: 1.5 },
    dropHeight: { type: Number, default: 12 },
})

const { rainAmount, accelerationMin, accelerationMax, airResistance, windX, maxWindX, realisticWind, useNoiseWind, dropWidth, dropHeight } = toRefs(props)

const canvasRef = ref(null)
const drops = []
const splashes = []

const droplets = []

let ctx
let width, height
const targets = []
let windTime = 0
let currentWindX = 0
let spawnIntervalId = null
let animationFrameId = null

// 辅助函数
function lerp(a, b, t) {
    return a + (b - a) * t
}
function pseudoRandom(x) {
    let n = (x << 13) ^ x
    return 1.0 - ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824.0
}
function noise1D(x) {
    const x0 = Math.floor(x)
    const x1 = x0 + 1
    const t = x - x0
    const v0 = pseudoRandom(x0)
    const v1 = pseudoRandom(x1)
    return lerp(v0, v1, t)
}

// 创建雨滴
function spawnDrop() {
    const x = Math.random() * width
    const vy = 0
    const ay = accelerationMin.value + Math.random() * (accelerationMax.value - accelerationMin.value)
    const hue = Math.random() * 360
    const color = `hsla(${hue}, 80%, 70%, 0.8)`
    drops.push({ x, y: -10, vy, ay, color, hue, size: dropWidth.value, height: dropHeight.value })
}

function spawnSplash(x, y, hue, direction = 0) {
    const count = 6
    for (let i = 0; i < count; i++) {
        // 主方向是垂直向上 270°，轻微左右偏移
        const base = Math.PI * 1.5
        const offset = (Math.random() - 0.5) * Math.PI / 6  // ±15°
        const sideBias = direction * Math.PI / 8           // -22.5° or +22.5°
        const angle = base + sideBias + offset

        const speed = 1 + Math.random() * 2
        const splashColor = `hsla(${hue + Math.random() * 40}, 100%, 80%, 1)`
        splashes.push({
            x,
            y,
            vx: Math.cos(angle) * speed + currentWindX * 0.3,
            vy: Math.sin(angle) * speed,
            alpha: 1,
            radius: 2,
            color: splashColor,
        })
    }

    spawnDroplets(x, y, hue, direction)
}

function spawnDroplets(x, y, hue, direction = 0) {
    const count = 8
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI + (direction === -1 ? -Math.PI / 6 : direction === 1 ? Math.PI + Math.PI / 6 : 0)
        const speed = 2 + Math.random() * 2.5
        droplets.push({
            x,
            y,
            vx: Math.cos(angle) * speed + currentWindX * 0.2,
            vy: Math.sin(angle) * speed,
            alpha: 1,
            radius: 1 + Math.random() * 1,
            color: `hsla(${hue}, 100%, 95%, 1)`
        })
    }
}

function resize() {
    width = window.innerWidth
    height = window.innerHeight
    canvasRef.value.width = width
    canvasRef.value.height = height
}

function startRain() {
    clearInterval(spawnIntervalId)
    spawnIntervalId = setInterval(() => spawnDrop(), 1000 / rainAmount.value)
    if (!animationFrameId) update()
}

function stopRain() {
    clearInterval(spawnIntervalId)
    spawnIntervalId = null
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
}

function update() {
    ctx.clearRect(0, 0, width, height)

    // 风速计算
    windTime += 0.002
    if (useNoiseWind.value) {
        currentWindX = noise1D(windTime * 0.1) * maxWindX.value
    } else if (realisticWind.value) {
        currentWindX = maxWindX.value * Math.sin(windTime * (2 * Math.PI / 10))
    } else {
        currentWindX = windX.value
    }

    // 更新雨滴
    for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i]
        d.vy += d.ay
        d.vy *= airResistance.value
        d.y += d.vy
        d.x += currentWindX

        // 根据风速计算倾斜角度
        const angle = Math.atan2(d.vy, currentWindX)

        ctx.save()
        ctx.translate(d.x, d.y)
        ctx.rotate(angle)
        ctx.fillStyle = d.color
        ctx.fillRect(-d.size / 2, -d.height, d.height, d.size)
        ctx.restore()

        // 碰撞检测
        for (const el of targets) {
            const style = getComputedStyle(el)
            const outlineWidth = parseFloat(style.outlineWidth) || 0
            const outlineOffset = parseFloat(style.outlineOffset) || 0
            const padding = (outlineWidth + Math.abs(outlineOffset)) * 2
            const r = el.getBoundingClientRect()

            if (
                d.y >= r.top - padding &&
                d.y <= r.bottom + padding &&
                d.x >= r.left - padding &&
                d.x <= r.right + padding
            ) {
                const centerX = r.left + r.width / 2
                const direction = d.x < centerX ? -1 : 1
                spawnSplash(d.x, d.y, d.hue, direction)
                spawnDroplets(d.x, d.y, d.hue, direction)
                drops.splice(i, 1)
                break
            }
        }

        if (d.y > height) drops.splice(i, 1)
    }



    // 更新水花
    for (let i = splashes.length - 1; i >= 0; i--) {
        const p = splashes[i]
        p.x += p.vx
        p.y += p.vy
        p.alpha -= 0.03
        p.radius *= 0.98
        ctx.fillStyle = p.color.replace(/[^,]+(?=\))/, p.alpha.toFixed(2))
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fill()
        if (p.alpha <= 0) splashes.splice(i, 1)
    }

    for (let i = droplets.length - 1; i >= 0; i--) {
        const p = droplets[i]
        p.x += p.vx
        p.y += p.vy
        p.alpha -= 0.025
        p.radius *= 0.98

        ctx.fillStyle = p.color.replace(/[^,]+(?=\))/, p.alpha.toFixed(2))
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fill()

        if (p.alpha <= 0) droplets.splice(i, 1)
    }


    animationFrameId = requestAnimationFrame(update)
}

onMounted(() => {
    ctx = canvasRef.value.getContext('2d')
    resize()
    window.addEventListener('resize', resize)
    targets.push(...document.querySelectorAll('.z-1'))
    canvasRef.value.addEventListener('click', e => spawnSplash(e.clientX, e.clientY, 200))
    startRain()

    document.addEventListener('visibilitychange', () => {
        document.hidden ? stopRain() : startRain()
    })
})

onBeforeUnmount(() => {
    stopRain()
    window.removeEventListener('resize', resize)
})
</script>

<style scoped>
canvas {
    touch-action: none;
}
</style>
