/**
 * WebUI Next API - 数据库接口
 */

import { api } from './client'
import type {
    APIResponse,
    RowInsertRequest,
    RowMutationResult,
    RowUpdateRequest,
    SqlExecuteRequest,
    SqlExecuteResult,
    SqlFileItem,
    SqlFileListResult,
    SqlLogListResult,
    TableColumn,
    TableDataResult,
} from '@/types/api-next.types'

export const databaseApi = {
    /** 表列表 */
    getTableList(): Promise<APIResponse<string[]>> {
        return api.get<string[]>('/database/tables')
    },

    /** 表字段 */
    getTableColumns(tableName: string): Promise<APIResponse<TableColumn[]>> {
        return api.get<TableColumn[]>(
            `/database/tables/${encodeURIComponent(tableName)}/columns`,
        )
    },

    /** 分页表数据 */
    getTableData(
        tableName: string,
        page: number = 1,
        pageSize: number = 50,
    ): Promise<APIResponse<TableDataResult>> {
        return api.get<TableDataResult>(
            `/database/tables/${encodeURIComponent(tableName)}/data`,
            { page, page_size: pageSize },
        )
    },

    /** 执行 SQL */
    executeSql(request: SqlExecuteRequest): Promise<APIResponse<SqlExecuteResult>> {
        return api.post<SqlExecuteResult>('/database/execute', request)
    },

    /** SQL 执行日志（倒序分页） */
    getSqlLogs(
        page: number = 1,
        pageSize: number = 50,
    ): Promise<APIResponse<SqlLogListResult>> {
        return api.get<SqlLogListResult>('/database/sql-logs', {
            page,
            page_size: pageSize,
        })
    },

    /** 按主键更新单行 */
    updateRow(
        tableName: string,
        rowId: string | number,
        request: RowUpdateRequest,
    ): Promise<APIResponse<RowMutationResult>> {
        return api.patch<RowMutationResult>(
            `/database/tables/${encodeURIComponent(tableName)}/rows/${encodeURIComponent(String(rowId))}`,
            request,
        )
    },

    /** 按主键删除单行 */
    deleteRow(
        tableName: string,
        rowId: string | number,
    ): Promise<APIResponse<RowMutationResult>> {
        return api.delete<RowMutationResult>(
            `/database/tables/${encodeURIComponent(tableName)}/rows/${encodeURIComponent(String(rowId))}`,
        )
    },

    /** 插入单行 */
    insertRow(
        tableName: string,
        request: RowInsertRequest,
    ): Promise<APIResponse<RowMutationResult>> {
        return api.post<RowMutationResult>(
            `/database/tables/${encodeURIComponent(tableName)}/rows`,
            request,
        )
    },

    /** SQL 编辑器文件：列表（后端持久化） */
    listSqlFiles(): Promise<APIResponse<SqlFileListResult>> {
        return api.get<SqlFileListResult>('/database/sql-files')
    },

    /** SQL 编辑器文件：新建/保存 */
    saveSqlFile(name: string, content: string): Promise<APIResponse<SqlFileItem>> {
        return api.post<SqlFileItem>('/database/sql-files', { name, content })
    },

    /** SQL 编辑器文件：删除 */
    deleteSqlFile(name: string): Promise<APIResponse<boolean>> {
        return api.delete<boolean>(
            `/database/sql-files/${encodeURIComponent(name)}`,
        )
    },
}
