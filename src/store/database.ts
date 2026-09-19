import { defineStore } from 'pinia'
import { ref } from 'vue'
import { databaseApi } from '@/utils/api-next'
import type { SqlLogItem } from '@/types/api-next.types'

export interface SqlFileItem {
    id: string
    name: string
    content: string
    updatedAt: number
}

export interface SqlQueryResult {
    columns: string[]
    rows: Record<string, any>[]
    message: string
    ok: boolean
}

const toUiItem = (row: { name: string; content: string; updated_at: number }): SqlFileItem => ({
    id: `db://sql/${row.name}`,
    name: row.name,
    content: row.content ?? '',
    updatedAt: row.updated_at ?? Date.now(),
})

export const useDatabaseStore = defineStore('database', () => {
    const showSqlLog = ref(false)
    const sqlLogList = ref<SqlLogItem[]>([])
    const sqlLogTotal = ref(0)
    const sqlLogLoading = ref(false)

    /** SQL 编辑器文件 — 后端 data/webui/sql_files.json */
    const sqlFiles = ref<SqlFileItem[]>([])
    const sqlFilesLoading = ref(false)
    let sqlSeq = 0

    const sqlResult = ref<SqlQueryResult | null>(null)
    const sqlRunning = ref(false)

    const loadSqlFiles = async () => {
        sqlFilesLoading.value = true
        try {
            const res = await databaseApi.listSqlFiles()
            if (res?.success && res.data) {
                sqlFiles.value = (res.data.items || []).map(toUiItem)
                sqlSeq = sqlFiles.value.length
            }
        } catch {
            // 拦截器已提示
        } finally {
            sqlFilesLoading.value = false
        }
    }

    /** 新建并写入后端，返回可打开的 UI 项 */
    const createSqlFile = async (name?: string, content = '-- Write SQL here\n') => {
        sqlSeq += 1
        const base = name?.replace(/\.sql$/i, '') || `query-${sqlSeq}`
        let fileName = `${base}.sql`
        // 避免重名
        for (;;) {
            const exists = sqlFiles.value.some((f) => f.name === fileName)
            if (!exists) break
            sqlSeq += 1
            fileName = `query-${sqlSeq}.sql`
        }
        const res = await databaseApi.saveSqlFile(fileName, content)
        if (res?.success && res.data) {
            const item = toUiItem(res.data)
            sqlFiles.value = [item, ...sqlFiles.value.filter((f) => f.name !== item.name)]
            return item
        }
        throw new Error(res?.message || '创建 SQL 文件失败')
    }

    const saveSqlFile = async (name: string, content: string) => {
        const res = await databaseApi.saveSqlFile(name, content)
        if (res?.success && res.data) {
            const item = toUiItem(res.data)
            const idx = sqlFiles.value.findIndex((f) => f.name === item.name)
            if (idx >= 0) sqlFiles.value[idx] = item
            else sqlFiles.value = [item, ...sqlFiles.value]
            return item
        }
        throw new Error(res?.message || '保存 SQL 文件失败')
    }

    const removeSqlFile = async (name: string) => {
        await databaseApi.deleteSqlFile(name)
        sqlFiles.value = sqlFiles.value.filter((f) => f.name !== name)
    }

    /** 重命名：写入新文件再删旧文件（后端无独立 rename） */
    const renameSqlFile = async (oldName: string, newName: string) => {
        const next = newName.trim()
        if (!next || next === oldName) {
            return sqlFiles.value.find((f) => f.name === oldName) || null
        }
        const existing = sqlFiles.value.find((f) => f.name === oldName)
        const content = existing?.content ?? ''
        const item = await saveSqlFile(next, content)
        if (next !== oldName) {
            try {
                await databaseApi.deleteSqlFile(oldName)
            } catch {
                /* 旧文件删除失败不影响新名 */
            }
            sqlFiles.value = sqlFiles.value.filter((f) => f.name !== oldName)
        }
        return item
    }

    const getSqlFile = (name: string) =>
        sqlFiles.value.find((f) => f.name === name) || null

    const runSql = async (sql: string) => {
        const q = sql.trim()
        if (!q) {
            sqlResult.value = {
                columns: [],
                rows: [],
                message: 'SQL 为空',
                ok: false,
            }
            return sqlResult.value
        }
        sqlRunning.value = true
        try {
            const res = await databaseApi.executeSql({ sql: q })
            if (!res?.success) {
                sqlResult.value = {
                    columns: [],
                    rows: [],
                    message: res?.message || '执行失败',
                    ok: false,
                }
                return sqlResult.value
            }
            const payload = res.data
            if (payload?.data && Array.isArray(payload.data)) {
                const rows = payload.data
                sqlResult.value = {
                    columns: rows.length ? Object.keys(rows[0]) : [],
                    rows,
                    message: payload.message || `Success. ${rows.length} rows`,
                    ok: true,
                }
            } else {
                sqlResult.value = {
                    columns: [],
                    rows: [],
                    message: payload?.message || 'Success. No rows returned',
                    ok: true,
                }
            }
            return sqlResult.value
        } catch (e: any) {
            sqlResult.value = {
                columns: [],
                rows: [],
                message:
                    e?.response?.data?.message || e?.message || '执行失败',
                ok: false,
            }
            return sqlResult.value
        } finally {
            sqlRunning.value = false
        }
    }

    const loadSqlLog = async () => {
        sqlLogLoading.value = true
        try {
            const res = await databaseApi.getSqlLogs(1, 100)
            if (res?.success && res.data) {
                sqlLogList.value = res.data.items ?? []
                sqlLogTotal.value = res.data.total ?? 0
            }
        } catch {
            // 拦截器已提示
        } finally {
            sqlLogLoading.value = false
        }
    }

    const openSqlLog = () => {
        showSqlLog.value = true
        loadSqlLog()
    }

    const closeSqlLog = () => {
        showSqlLog.value = false
    }

    return {
        showSqlLog,
        sqlLogList,
        sqlLogTotal,
        sqlLogLoading,
        loadSqlLog,
        openSqlLog,
        closeSqlLog,
        sqlFiles,
        sqlFilesLoading,
        loadSqlFiles,
        createSqlFile,
        saveSqlFile,
        removeSqlFile,
        renameSqlFile,
        getSqlFile,
        sqlResult,
        sqlRunning,
        runSql,
    }
})
