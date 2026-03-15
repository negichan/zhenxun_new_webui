/**
 * 节流函数（带 Promise 支持，返回原函数结果）
 * @param fn 需要节流的函数
 * @param delay 节流时间间隔（毫秒）
 * @param onThrottle 可选，节流触发时回调，传入剩余等待时间
 * @returns 返回一个新函数，调用它会被节流控制，并返回 Promise<原函数返回值>
 */
export function throttle<T extends (...args: any[]) => any>(
    fn: T,
    delay: number,
    onThrottle?: (remainingTime: number) => void
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
    let lastExecTime = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    return function (this: any, ...args: Parameters<T>): Promise<ReturnType<T>> {
        const context = this;
        const now = Date.now();
        const remaining = delay - (now - lastExecTime);

        if (timer) clearTimeout(timer);

        return new Promise((resolve) => {
            if (remaining <= 0) {
                lastExecTime = now;
                const result = fn.apply(context, args);
                resolve(result);
            } else {
                onThrottle?.(remaining);
                timer = setTimeout(() => {
                    lastExecTime = Date.now();
                    const result = fn.apply(context, args);
                    resolve(result);
                }, remaining);
            }
        });
    };
}

/**
 * 防抖函数
 * @param fn 需要防抖的函数
 * @param delay 延迟毫秒数，默认 1000ms
 * @returns 返回一个新函数，多次快速调用时，只在延迟结束后执行一次
 */
export function debounce<T extends (...args: any[]) => any>(
    fn: T,
    delay: number = 1000
): (...args: Parameters<T>) => void {
    let timer: ReturnType<typeof setTimeout> | null = null;

    return function (this: any, ...args: Parameters<T>): void {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            fn.apply(this, args);
        }, delay);
    };
}