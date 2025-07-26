import { createWebSocket } from '@/utils/websocket/index.js'
import { getHost } from '@/utils/api/index.js'

const system_status = {
    name:'system_status',
    initWebSocket(store) {
        const socketManager = createWebSocket({
            host: getHost(),
            path: '/zhenxun/socket'
        })

        // 系统状态命名空间
        const statusSocket = socketManager.of(this.name)
        statusSocket.on('message', (data) => {
            // console.log(data)
            store.addMessage(this.name,data)
        })
        statusSocket.on('disconnect', () => {
            console.log("断开连接")
            // store.addMessage(this.name,data)
        })
        statusSocket.on('error', (data) => {
            // console.log("发生错误",data)
            // store.addMessage(this.name,data)
        })
        statusSocket.on('reconnecting', (data) => {

            console.log(data)
            // store.addMessage(this.name,data)
        })
        statusSocket.on('reconnect_failed', (data) => {

            console.log("重连失败，停止连接")
            // store.addMessage(this.name,data)
        })

        return socketManager
    }
}

export default system_status