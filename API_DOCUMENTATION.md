# Web UI API 封装文档

## 概述

本文档描述了 zhenxun_bot Web UI 的前端 API 封装，基于现有后端接口实现。

## API 模块

### 1. bot.ts - Bot 相关接口

```typescript
botApi.get_bot_list()           // 获取 Bot 列表
botApi.get_chat_and_call_count() // 获取聊天/调用数量（今日和全部）
botApi.get_chat_and_call_month() // 获取聊天/调用月度数据
botApi.get_plugin_count()        // 获取插件数量统计
botApi.get_all_chat_and_call_count() // 获取聊天/调用全部数据
```

### 2. chat.ts - 聊天相关接口

```typescript
chatApi.getMessageHistory()      // 获取消息历史
chatApi.sendMessage()            // 发送消息
chatApi.recallMessage()          // 撤回消息

// WebSocket 连接
connectChatWebSocket()           // 连接聊天 WebSocket
disconnectChatWebSocket()        // 断开聊天 WebSocket
```

### 3. configure.ts - 配置相关接口

```typescript
configureApi.setConfigure()      // 设置基础配置
configureApi.testDb()            // 测试数据库连接
configureApi.restart()           // 重启 Bot
```

### 4. dashboard.ts - 仪表盘接口

```typescript
dashboardApi.getBotList()        // 获取 Bot 列表
dashboardApi.getChatAndCallCount() // 获取聊天/调用数量
dashboardApi.getAllChatAndCallCount() // 获取全部聊天/调用数据
dashboardApi.getChatAndCallMonth() // 获取月度聊天/调用数据
dashboardApi.getConnectLog()     // 获取连接日志
dashboardApi.getNonebotConfig()  // 获取 NoneBot 配置
```

### 5. database.ts - 数据库接口

```typescript
databaseApi.getTableList()       // 获取数据库表列表
databaseApi.getTableColumns()    // 获取表的列信息
databaseApi.execSql()            // 执行 SQL
databaseApi.getSqlLog()          // 获取 SQL 执行日志
databaseApi.getCommonSql()       // 获取常用 SQL
```

### 6. file.ts - 文件管理接口

```typescript
fileApi.getFileList()            // 获取文件列表
fileApi.uploadFile()             // 上传文件
fileApi.deleteFile()             // 删除文件
fileApi.createFolder()           // 创建文件夹
fileApi.readFile()               // 读取文件内容
fileApi.saveFile()               // 保存文件
```

### 7. logs.ts - 日志接口

```typescript
logsApi.getHistoryLogs()         // 获取历史日志

// WebSocket 连接
connectLogsWebSocket()           // 连接日志 WebSocket
disconnectLogsWebSocket()        // 断开日志 WebSocket
```

### 8. main.ts - 主页接口

```typescript
mainApi.getBaseInfo()            // 获取 Bot 基础信息
mainApi.getAllChatCount()        // 获取接收消息数量
mainApi.getAllCallCount()        // 获取调用次数
mainApi.getFgCount()             // 获取好友/群组数量
mainApi.getNbData()              // 获取 NoneBot 数据
mainApi.getNbConfig()            // 获取 NoneBot 配置
mainApi.getRunTime()             // 获取运行时间
mainApi.getActiveGroup()         // 获取活跃群组
mainApi.getHotPlugin()           // 获取热门插件
mainApi.changeBotStatus()        // 修改 Bot 全局开关
mainApi.getBotBlockModule()      // 获取 Bot 禁用模块
mainApi.updateBotManage()        // 更新 Bot 管理配置
```

### 9. manage.ts - 群组/好友管理接口

```typescript
manageApi.getGroupList()         // 获取群组列表
manageApi.updateGroup()          // 更新群组信息
manageApi.getFriendList()        // 获取好友列表
manageApi.getRequestCount()      // 获取请求数量
manageApi.getRequestList()       // 获取请求列表
manageApi.clearRequest()         // 清空请求列表
manageApi.refuseRequest()        // 拒绝请求
manageApi.deleteRequest()        // 忽略请求
manageApi.approveRequest()       // 同意请求
manageApi.leaveGroup()           // 退群
manageApi.deleteFriend()         // 删除好友
manageApi.getFriendDetail()      // 获取好友详情
manageApi.getGroupDetail()       // 获取群组详情
manageApi.sendMessage()          // 发送消息
```

### 10. menu.ts - 菜单接口

```typescript
menuApi.getMenus()               // 获取菜单列表
```

### 11. plugin.ts - 插件管理接口

```typescript
pluginApi.getPluginList()        // 获取插件列表
pluginApi.getPluginCount()       // 获取插件数量
pluginApi.getPluginDetail()      // 获取插件详情
pluginApi.updatePlugin()         // 更新插件参数
pluginApi.togglePluginStatus()   // 切换插件状态
pluginApi.getPluginMenuType()    // 获取插件菜单类型
pluginApi.batchUpdatePlugins()   // 批量更新插件配置
pluginApi.renameMenuType()       // 重命名菜单类型
pluginApi.installDependencies()  // 安装/卸载依赖
pluginApi.getPluginConfig()      // 获取插件配置
pluginApi.setPluginConfig()      // 设置插件配置
pluginApi.resetPluginConfig()    // 重置插件配置
```

### 12. store.ts - 插件商店接口

```typescript
storeApi.getPluginStore()        // 获取插件商店列表
storeApi.installPlugin()         // 安装插件
storeApi.updatePlugin()          // 更新插件
storeApi.removePlugin()          // 移除插件
```

### 13. system.ts - 系统管理接口

```typescript
systemApi.login()                // 登录
systemApi.ping()                 // 检查服务器状态
systemApi.test_db()              // 测试数据库连接
systemApi.set_configure()        // 设置基础配置
systemApi.restartBot()           // 重启 Bot
systemApi.getSystemStatus()      // 获取系统状态 (CPU/内存/磁盘)
systemApi.getResourcesSize()     // 获取资源大小
systemApi.getDirList()           // 获取文件列表
systemApi.deleteFile()           // 删除文件
systemApi.deleteFolder()         // 删除文件夹
systemApi.renameFile()           // 重命名文件
systemApi.renameFolder()         // 重命名文件夹
systemApi.addFile()              // 新建文件
systemApi.addFolder()            // 新建文件夹
systemApi.readFile()             // 读取文件
systemApi.saveFile()             // 保存文件
systemApi.getImage()             // 获取图片 base64
```

## 类型定义

### 已创建的类型文件

- `types/api.types.ts` - 通用 API 响应类型
- `types/bot.types.ts` - Bot 相关类型
- `types/chat.types.ts` - 聊天相关类型
- `types/dashboard.types.ts` - 仪表盘类型
- `types/database.types.ts` - 数据库类型
- `types/file.types.ts` - 文件类型
- `types/log.types.ts` - 日志类型
- `types/main.types.ts` - 主页类型
- `types/manage.types.ts` - 群组/好友管理类型
- `types/menu.types.ts` - 菜单类型
- `types/plugin.types.ts` - 插件类型
- `types/store.types.ts` - 插件商店类型
- `types/system.types.ts` - 系统类型

## 使用示例

### 基本使用

```typescript
import { pluginApi, manageApi, systemApi } from '@/utils/api'

// 获取插件列表
const plugins = await pluginApi.getPluginList()

// 获取群组列表
const groups = await manageApi.getGroupList(bot_id)

// 获取系统状态
const status = await systemApi.getSystemStatus()
```

### WebSocket 使用

```typescript
import { connectChatWebSocket, disconnectChatWebSocket } from '@/utils/api/chat'

// 连接 WebSocket
connectChatWebSocket((message) => {
    console.log('收到新消息:', message)
})

// 断开连接
disconnectChatWebSocket()
```

## 注意事项

1. 所有 API 请求都会自动添加认证 Token（如果已登录）
2. 错误处理由 Axios 拦截器统一处理
3. WebSocket 连接断开后需要手动重新连接
4. 所有类型定义都使用 TypeScript，确保类型安全
