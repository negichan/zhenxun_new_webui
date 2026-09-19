/**
 * 数据库类型再导出 — 实际定义见 api-next.types.ts，
 * 保留此文件兼容既有 `@/types/database` 导入路径。
 */
export type {
    RowInsertRequest,
    RowMutationResult,
    RowUpdateRequest,
    SqlExecuteRequest,
    SqlExecuteResult,
    SqlLogItem,
    SqlLogListResult,
    TableColumn,
    TableDataResult,
    TableRowData,
} from './api-next.types'
