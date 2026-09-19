import { defineStore } from "pinia";
import { computed, ref } from "vue";
import {
    applyTheme,
    applyThemePreset,
    defaultTheme,
    generateThemeFromColors,
    getThemePresets,
    type AppTheme,
    type ThemePresetName,
} from "@/theme";
import { themeApi, type ThemeConfig } from "@/utils/api-next";

const THEME_STORAGE_KEY = "zhenxun-theme";
const CUSTOM_COLOR_KEY = "zhenxun-custom-color";
// 模式（light/dark/system）单独持久化：首次访问默认跟随系统，
// 之后用户手动选了主题就由用户的选择接管
const MODE_STORAGE_KEY = "zhenxun-theme-mode";
// 多端统一开关跟随云端配置（本地缓存用于首屏），任意一端拨动都会同步到所有端
// 默认开启；仅当本地/云端显式写入 false 时关闭
const SYNC_ENABLED_KEY = "zhenxun-theme-sync";

const systemDarkQuery =
    typeof window !== "undefined" && window.matchMedia
        ? window.matchMedia("(prefers-color-scheme: dark)")
        : null;

const isThemePresetName = (value: string): value is ThemePresetName =>
    value in getThemePresets();

export const useThemeStore = defineStore("theme", () => {
    const activeThemeName = ref<ThemePresetName>(defaultTheme.name);
    const customTheme = ref<AppTheme | null>(null);
    const customColor = ref<string | null>(null);
    // light | dark | system（system = 跟随系统，实际模式由系统偏好解析）
    const customMode = ref<"light" | "dark" | "system">("light");
    // 多端统一：开启后应用云端主题并跟随 theme_update 事件
    // 默认开启；localStorage 显式存了 "false" 才视为关闭
    const syncEnabled = ref(
        typeof window === "undefined" ||
            localStorage.getItem(SYNC_ENABLED_KEY) !== "false",
    );
    const systemDark = ref(systemDarkQuery?.matches ?? false);

    // 实际生效的模式（跟随系统时由系统偏好决定）
    const effectiveMode = computed<"light" | "dark">(() =>
        customMode.value === "system"
            ? systemDark.value
                ? "dark"
                : "light"
            : customMode.value,
    );

    const presets = computed(() => getThemePresets());
    const activeTheme = computed(
        () => customTheme.value || presets.value[activeThemeName.value],
    );

    // 跟随系统：系统深浅切换时实时跟随（自定义色重生成，预设主题切换预设）
    systemDarkQuery?.addEventListener("change", (e) => {
        systemDark.value = e.matches;
        if (customMode.value !== "system") return;
        if (customColor.value) {
            applyCustomColorTheme(customColor.value, "system", true);
            return;
        }
        const name = systemDark.value ? "zhenxun-dark" : "zhenxun-light";
        setTheme(name);
        // setTheme 内会把模式按预设固定成 light/dark，拉回跟随系统
        customMode.value = "system";
        localStorage.setItem(MODE_STORAGE_KEY, "system");
    });

    function setTheme(name: ThemePresetName) {
        customTheme.value = null;
        customColor.value = null;
        activeThemeName.value = name;
        applyThemePreset(name);
        // 同步模式：预设自带深浅（当前仅 zhenxun-dark 为深色），
        // effectiveMode 依赖它，不同步会导致深色预设下仍按浅色计算
        customMode.value = name === "zhenxun-dark" ? "dark" : "light";
        localStorage.setItem(THEME_STORAGE_KEY, name);
        localStorage.setItem(MODE_STORAGE_KEY, customMode.value);
        localStorage.removeItem(CUSTOM_COLOR_KEY);
    }

    function setCustomTheme(theme: AppTheme) {
        customTheme.value = theme;
        applyTheme(theme);
        localStorage.setItem(THEME_STORAGE_KEY, theme.name);
    }

    function applyCustomColorTheme(
        primary: string,
        mode: "light" | "dark" | "system" = "light",
        skipWrite = false,
    ) {
        const resolved =
            mode === "system"
                ? systemDark.value
                    ? "dark"
                    : "light"
                : mode;
        const theme = generateThemeFromColors(primary, resolved);
        customColor.value = primary;
        customMode.value = mode;
        setCustomTheme(theme);
        if (!skipWrite) {
            localStorage.setItem(
                CUSTOM_COLOR_KEY,
                JSON.stringify({ primary, mode }),
            );
        }
        localStorage.setItem(MODE_STORAGE_KEY, mode);
    }

    function resetTheme() {
        setTheme(defaultTheme.name);
    }

    function forceApplyLight() {
        setTheme("zhenxun-light");
    }

    function restoreSavedTheme() {
        const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        if (storedTheme && isThemePresetName(storedTheme)) {
            applyThemePreset(storedTheme);
        } else {
            applyThemePreset(defaultTheme.name);
        }
        // 登录后先对齐云端：多端统一默认开启，避免恢复到过期的本地主题
        void syncFromBackend();
    }

    function toggleTheme() {
        setTheme(
            activeThemeName.value === "zhenxun-dark"
                ? "zhenxun-light"
                : "zhenxun-dark",
        );
    }

    /** 当前主题状态 → 云端配置结构 */
    function buildThemeConfig(): ThemeConfig {
        return {
            source: customColor.value ? "custom" : "preset",
            preset: activeThemeName.value,
            primary: customColor.value ?? "#6366f1",
            mode: customMode.value,
            sync: syncEnabled.value,
        };
    }

    /** 应用一份云端主题配置 */
    function applyThemeConfig(config: ThemeConfig) {
        if (config.source === "custom") {
            applyCustomColorTheme(config.primary, config.mode);
        } else if (isThemePresetName(config.preset)) {
            setTheme(config.preset);
            customMode.value = config.mode;
        }
    }

    /** 云端/广播未显式 false 时按默认开启处理 */
    function resolveRemoteSync(config: Pick<ThemeConfig, "sync">): boolean {
        return config.sync !== false;
    }

    /** 收到 theme_update 广播：开关状态全端一致；开启时跟随操作端的主题 */
    function applyRemoteTheme(config: ThemeConfig) {
        const remoteSync = resolveRemoteSync(config);
        setSyncEnabledLocal(remoteSync);
        if (remoteSync) {
            applyThemeConfig(config);
        }
    }

    /** 把本地主题推送到云端（后端会广播给其他端） */
    async function pushToBackend() {
        try {
            await themeApi.saveTheme(buildThemeConfig());
        } catch {
            // 推送失败静默：本地主题仍生效，下次修改会再尝试
        }
    }

    /** 拉取云端配置：优先应用云端主题；云端未写 sync 时按默认开启 */
    async function syncFromBackend() {
        try {
            const res = await themeApi.getTheme();
            if (res?.success && res.data) {
                const remoteSync = resolveRemoteSync(res.data);
                setSyncEnabledLocal(remoteSync);
                if (remoteSync) {
                    applyThemeConfig(res.data);
                }
            }
            // 无云端配置或请求失败：保持本地（默认开启）
        } catch {
            // 后端不可用时保持本地主题
        }
    }

    /** 仅改本地开关与缓存（远端广播走它，避免回环推送） */
    function setSyncEnabledLocal(value: boolean) {
        syncEnabled.value = value;
        localStorage.setItem(SYNC_ENABLED_KEY, String(value));
    }

    /** 操作端拨动开关：开关状态与主题都以操作端为准推给云端（后端广播所有端） */
    function setSyncEnabled(value: boolean) {
        setSyncEnabledLocal(value);
        void pushToBackend();
    }

    function initTheme() {
        const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        const storedColor = localStorage.getItem(CUSTOM_COLOR_KEY);
        const storedMode = localStorage.getItem(MODE_STORAGE_KEY);

        if (storedColor) {
            try {
                const { primary, mode } = JSON.parse(storedColor);
                applyCustomColorTheme(primary, mode, true);
            } catch {
                localStorage.removeItem(CUSTOM_COLOR_KEY);
                setTheme(defaultTheme.name);
            }
        } else if (storedTheme && isThemePresetName(storedTheme)) {
            setTheme(storedTheme);
            // 恢复"跟随系统"：按当前系统偏好落到对应预设，并保持 system 模式
            if (storedMode === "system") {
                const name = systemDark.value ? "zhenxun-dark" : "zhenxun-light";
                applyThemePreset(name);
                activeThemeName.value = name;
                customMode.value = "system";
            }
        } else {
            // 首次访问（无任何本地主题记录）：默认跟随系统设置
            setTheme(systemDark.value ? "zhenxun-dark" : "zhenxun-light");
            customMode.value = "system";
            localStorage.setItem(MODE_STORAGE_KEY, "system");
        }

        // 开关状态与主题以云端为准（其他端操作过也能对齐）
        void syncFromBackend();
    }

    return {
        activeThemeName,
        activeTheme,
        customTheme,
        customColor,
        customMode,
        effectiveMode,
        syncEnabled,
        presets,
        setTheme,
        setCustomTheme,
        applyCustomColorTheme,
        applyThemeConfig,
        applyRemoteTheme,
        buildThemeConfig,
        pushToBackend,
        syncFromBackend,
        setSyncEnabled,
        resetTheme,
        toggleTheme,
        initTheme,
        forceApplyLight,
        restoreSavedTheme,
    };
});
