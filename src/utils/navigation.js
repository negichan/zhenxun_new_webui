let router = null

export function setRouter(r) {
    router = r
}

export async function navigateTo(path) {
    if (router) {
        await router.push(path)
    } else {
        window.location.href = path
    }
}