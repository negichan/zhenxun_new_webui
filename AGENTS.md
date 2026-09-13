# AGENTS.md — UI 风格规范

供 agent / 开发者参考的 zhenxun_webui 设计规范。**做任何 UI 改动前先读这份文档**，可视化版本见运行时的 `/ui-style` 页面。

技术栈：Vue 3 `<script setup>` + TypeScript + Tailwind CSS v4 + Element Plus（部分组件）+ GSAP（动效）。

## 主题体系（最重要）

- 主题变量定义在 `src/assets/theme.css` / `src/theme/`，运行时切换，全部以 **`--zx-color-*`** 为准；
- Tailwind 通过 `--color-zx-*` 映射出工具类：`text-zx-primary`、`bg-zx-primary-soft`、`bg-zx-primary-tint`、`text-zx-danger`、`bg-zx-danger-soft` 等，**优先用这些类**而不是写死颜色；
- `bg-white` / `slate-*` / `gray-*` 这批中性色在深色主题下会被 theme.css 自动反转，可以放心用作卡片底色和描边；
- 注意历史上存在 `--zx-color-*` 与 `--color-zx-*` 两套前缀，工具类走后者，CSS `var()` 走前者；
- `--zx-color-on-primary`（主色上的文字色）需在多处同步修改，改主色时注意。

## 组件目录约定

- **`src/components/zxcomponent/`** 只放跨页面复用的通用组件（组件库性质）：ZxTag、ZXDropdown、ZXInput、MiniDatePicker、ZXMessageBox、ZXNotification、ZXConfetti、ContextMenu、ZXTextEditor、LocationAddress、WhiteScreen、CornerFrame 等；
- **页面自用组件**放到所属页面/模块的文件夹：`src/views/<页面>/components/`（如 `views/plugin/components/StoreCard`、`views/manage/components/FriendCard`）或 `src/components/home/`（header 专属：User、HomeHeader、Island、RequestCenter 等）；
- 新建组件前先判断：别的页面也会用 → zxcomponent；只有本页面用 → 页面目录。

## 卡片

标准卡片：`rounded-3xl border border-slate-200 bg-white shadow-sm`（浅内边距 + `overflow-hidden` 按需）。

## 徽标 / Tag（以插件市场卡片为准）

- **统一使用全局组件 `<ZxTag>`**（`src/components/zxcomponent/ZxTag.vue`，已自动注册）；
- **配色：实色底 + 主题 on-* 对比字，跟随主题**——底色用主题语义实体色（`--zx-color-success` 等，浅色饱和/深色提亮），文字用配套 `--zx-color-on-success` 等对比色变量（浅色白字、深色统一深字）。禁止写死的 Tailwind 色值（如 `#22c55e`）和 soft 半透底；
- 规格：`h-[22px] rounded-lg px-2 text-[11px] leading-none font-medium`（ZxTag 内置；圆角走 MD3 chip 规范的 8dp，非全圆胶囊）；
- 语义档：`primary`（品牌强调/选中）、`success`（启用/完成/在线）、`warning`（注意/待处理/常驻）、`danger`（错误/删除/下线）、`info`（提示/版本/链接）、`neutral`（禁用/占位）、`purple`（特殊分类，如内置插件）、`cyan`（字典/数据类）；
- 自定义品牌色用 `color` prop（实色底 + 亮度自动黑白字）；
- 插件页的具体映射：已启用 `success`、已禁用 `neutral`、版本 `info`、内置 `purple`、三方/常驻 `warning`、置顶 `purple`；
- 群角色徽标：群主 `bg-red-500 text-white`、管理员 `bg-blue-500 text-white`、成员 `bg-gray-200 text-gray-500`。

## 按钮

- **统一用 `<ZxButton>`**（`src/components/zxcomponent/ZxButton.vue`，自动注册）：内置 `rounded-full`、`btn-touch`、`cursor-pointer`、`type="button"` 默认值与统一禁用态；
- Props：`variant="primary | ghost | outline | danger"`、`circle`（图标圆钮）、`size="md | sm"`、`disabled`；
- 主按钮文字用 `--zx-color-on-primary` 变量（深色主题下 `text-white` 会被反转成深色，禁用）；
- 特殊交互形态（分段切换、分页、菜单项、Island、dropdown 触发器）仍手写，规格见 `BUTTON_MIGRATION_PLAN.md` 第四节。

## 页面头部（HomeHeader）

- 左侧：胶囊用户卡（`User.vue`，`rounded-full border bg-white shadow-sm`）+ 问候语；
- 右侧：**岛屿（Island）** → 右侧动作圆钮组 → `h-5 w-[1px] bg-slate-200` 竖分隔线隔开；
- 动作圆钮：`h-9 w-9 rounded-full border border-slate-200 bg-white shadow-sm hover:scale-105`（铃铛/主题/Bot/设置）。

## 岛屿（Island，header 里的信息胶囊）

- 标题胶囊：`rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm hover:scale-105`，彩色图标 + 标签文字；
- 统计胶囊：`数字（语义色 font-black，v-odometer 滚动动画）+ h-3 w-[1px] bg-black/30 竖线 + 灰色小标签`，每个统计一个胶囊；
- 数字色按语义：总数 blue、已启用 green、禁用 gray、内置 purple 等。

## 工具栏（插件页标准）

- 工具栏本身是一张标准卡片：`rounded-3xl border border-slate-200 bg-white p-3 sm:p-4`，搜索/筛选/统计/切换全集成；
- 分段切换：容器 `rounded-2xl border bg-gray-100 p-1`，选中项 `bg-white text-zx-primary shadow-sm`；
- 搜索框：`rounded-full border bg-slate-50 py-1.5 pl-3.5 + Search 图标`，聚焦 `focus-within:bg-white`；
- 筛选下拉按钮：`rounded-full border bg-gray-100 text-gray-500 hover:text-gray-700`（配合 ZXDropdown 的 `trigger-class`）；
- 分页：圆形 `h-8 w-8`，选中 `bg-zx-primary text-white`，禁用 `text-gray-300`；
- 卡片网格：`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4`。

## 首页（Dashboard）

- 大网格：`2xl:grid-cols-[0.6fr_1fr_24rem]`，右栏固定 24rem；
- 资源卡：进度条 `h-2 rounded-full`，按使用率换语义色（绿→黄→橙）；
- 时间线：圆点（首条 `border-zx-primary` 加粗）+ `w-px bg-slate-200` 连线 + 头像。

## 弹窗

- 自定义弹窗：`Teleport to body` + `glass-overlay` 遮罩 + `modal-content` 白色圆角容器，`<Transition name="modal-jelly" :duration="{ enter: 500, leave: 250 }">`（样式在 `custom.css` 全局定义），参考 `SettingsModal.vue` / `PluginConfigModal.vue`；
- 确认框/输入框弹窗一律用 `ZXMessageBox`（支持 `slots.default`、危险按钮 `confirmButtonHoverBg`）；
- 通知用 `ZXNotification`，表情文案风格（如 `(っ °Д °;) っ`）随场景。

## 表单控件

- 输入框：`ZXInput`（方框）、`ZxInputNumber`（数字步进器）或富文本 `rich-editor`（聊天输入）；
- 下拉：`ZXDropdown`（`@/components/zxcomponent/ZXDropdown`，支持 `trigger-class`、`slots.trigger`、`slots.option`）；
- 开关：`ZxSwitch`（`src/components/zxcomponent/ZxSwitch.vue`，`v-model` + `@change`）；页内一次性开关也可用纯 Tailwind peer 写法（`peer-checked:bg-zx-primary`）；
- 日期选择：自制 `MiniDatePicker.vue`（日期）；精确到时分秒的范围筛选用原生 `<input type="datetime-local" step="1">`；
- 代码编辑器：`ZXTextEditor`（monaco 引擎，CDN 优先 npmmirror→jsdelivr、失败回退本地打包；markdown 文件内置"编辑/预览"分段切换）。主题用 `zx-light`/`zx-dark`（defineTheme 读 `--zx-color-*`），跟随应用深浅色。`monacoLoader.ts` 的 `MONACO_VERSION` 必须与 package.json 版本同步。

> 项目已移除 Element Plus 依赖，禁止再引入任何 `el-*` 组件；加载态用 `animate-spin` 圆环遮罩，骨架屏用 `animate-pulse` 色块，图片加载失败/占位态手写（配合 `v-image-viewer` 双击查看）。

## 列表性能（UI 层约定）

- 固定行高列表：`useVirtualList`；变动行高（图片/多行气泡）：`useDynamicVirtualList`；
- 聊天主界面用「底部窗口渲染」：只渲染最近 N 条，扩窗 + 滚动锚定，进会话瞬时置底。

## 已知约定 / 坑

- 不自创副标题文案；页面头部大标题已移除；
- `space-x-*` 会产生死边距（末尾元素多出间距），间距优先用 `gap-*`；
- 无 `@layer` 的规则会压过 utilities，需要覆盖工具类时进 `@layer components`；
- CSS 多列瀑布流会虚报固有宽度，需 `contain: inline-size`。

## UI 参考页

运行时访问 `/ui-style`（不在菜单里），展示：语义色板、ZxTag 全家族、按钮、头部胶囊（岛屿/统计）、分段切换、搜索框、分页、输入控件、卡片与弹窗示例。改设计规范时同步更新该页面与本文档。
