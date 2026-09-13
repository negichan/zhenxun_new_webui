// 白屏开关关闭时 vite alias 指向本文件，WHITE_SCREEN_ENABLED 为编译期常量 false，
// 白幕/红屏相关分支会被摇树移除
export const WHITE_SCREEN_ENABLED = false as const
