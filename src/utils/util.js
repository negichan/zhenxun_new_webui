// 节流函数实现
export function throttle(fn, delay, onThrottle) {
    let lastExecTime = 0;
    let timer = null;

    return function (...args) {
        const context = this;
        const now = Date.now();
        const remaining = delay - (now - lastExecTime);

        clearTimeout(timer);

        return new Promise((resolve) => {
            if (remaining <= 0) {
                lastExecTime = now;
                const result = fn.apply(context, args);
                resolve(result); // 确保返回 fn 的返回值
            } else {
                onThrottle?.(remaining);
                timer = setTimeout(() => {
                    lastExecTime = Date.now();
                    const result = fn.apply(context, args);
                    resolve(result); // 确保返回 fn 的返回值
                }, remaining);
            }
        });
    };
}

// 防抖函数实现
export function debounce(fn, delay = 1000) {
    let timer = null

    return function(...args) {
        clearTimeout(timer)
        timer = setTimeout(() => {
            fn.apply(this, args)
        }, delay)
    }
}

