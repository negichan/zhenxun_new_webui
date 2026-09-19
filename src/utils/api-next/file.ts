/**
 * WebUI Next API - 文件管理接口
 */

import { api, apiClient } from './client'
import type {
    FileListResult,
    FileContent,
    FileSearchResult,
    ArchivePreviewResult,
    ArchiveExtractResult,
    APIResponse,
} from '@/types/api-next.types'

export const fileApi = {
    /**
     * 获取文件列表
     */
    getFileList(path?: string): Promise<APIResponse<FileListResult>> {
        return api.get<FileListResult>('/file/list', { path: path || undefined })
    },

    /**
     * 读取文件内容
     * as_image：图片返回 data URL；as_bytes：原始字节返回裸 base64（hex/utf-8 视图）
     */
    readFile(filePath: string, options?: { skipInterceptor?: boolean; as_image?: boolean; as_bytes?: boolean }): Promise<APIResponse<FileContent>> {
        return api.get<FileContent>('/file/read', { file_path: filePath, as_image: options?.as_image, as_bytes: options?.as_bytes }, options)
    },

    /**
     * 保存文件内容（encoding 可选：utf-8 / gbk）
     */
    saveFile(filePath: string, content: string, encoding = 'utf-8'): Promise<APIResponse<boolean>> {
        return api.post<boolean>('/file/save', { file_path: filePath, content, encoding })
    },

    /**
     * 删除文件
     */
    deleteFile(filePath: string): Promise<APIResponse<boolean>> {
        return api.post<boolean>('/file/delete', { file_path: filePath })
    },

    /**
     * 删除文件夹
     */
    deleteFolder(folderPath: string): Promise<APIResponse<boolean>> {
        return api.post<boolean>('/file/delete-folder', { folder_path: folderPath })
    },

    /**
     * 重命名文件/文件夹
     */
    rename(sourcePath: string, newName: string): Promise<APIResponse<boolean>> {
        return api.post<boolean>('/file/rename', { source_path: sourcePath, new_name: newName })
    },

    /**
     * 复制文件/文件夹到目标目录（同名自动 _copy），返回新路径
     */
    copyPath(sourcePath: string, destDir: string, newName?: string): Promise<APIResponse<string>> {
        return api.post<string>('/file/copy', {
            source_path: sourcePath,
            dest_dir: destDir,
            new_name: newName || undefined,
        })
    },

    /**
     * 移动文件/文件夹到目标目录，返回新路径
     */
    movePath(sourcePath: string, destDir: string, newName?: string): Promise<APIResponse<string>> {
        return api.post<string>('/file/move', {
            source_path: sourcePath,
            dest_dir: destDir,
            new_name: newName || undefined,
        })
    },

    /**
     * 创建文件
     */
    createFile(parentPath: string | undefined, name: string): Promise<APIResponse<boolean>> {
        return api.post<boolean>('/file/create-file', { parent_path: parentPath || '', name })
    },

    /**
     * 创建文件夹
     */
    createFolder(parentPath: string | undefined, name: string): Promise<APIResponse<boolean>> {
        return api.post<boolean>('/file/create-folder', { parent_path: parentPath || '', name })
    },

    /**
     * 下载文件：单个文件直下，多选/文件夹打包 zip
     * 返回 blob 与从 Content-Disposition 解析出的文件名
     */
    async downloadFiles(paths: string[]): Promise<{ blob: Blob; filename: string }> {
        try {
            const res = await apiClient.get('/file/download', {
                params: { paths: JSON.stringify(paths) },
                responseType: 'blob',
                skipInterceptor: true,
            } as any)

            const blob = res.data as Blob
            const cd = String(res.headers?.['content-disposition'] ?? '')
            let filename = ''
            const star = /filename\*=(?:utf-8'')([^;]+)/i.exec(cd)
            const plain = /filename="?([^";]+)"?/i.exec(cd)
            if (star) {
                try {
                    filename = decodeURIComponent(star[1])
                } catch {
                    filename = star[1]
                }
            } else if (plain) {
                try {
                    filename = decodeURIComponent(plain[1])
                } catch {
                    filename = plain[1]
                }
            }
            return { blob, filename }
        } catch (e) {
            throw new Error(await readBlobErrorMessage(e))
        }
    },

    /**
     * 全文搜索目录下文本文件内容
     */
    searchFiles(params: {
        path?: string
        keyword: string
        is_regex?: boolean
        case_sensitive?: boolean
        whole_word?: boolean
    }): Promise<APIResponse<FileSearchResult>> {
        return api.post<FileSearchResult>('/file/search', {
            path: params.path || undefined,
            keyword: params.keyword,
            is_regex: params.is_regex || false,
            case_sensitive: params.case_sensitive || false,
            whole_word: params.whole_word || false,
        })
    },

    /**
     * 预览压缩包内容；entries 为钻入嵌套压缩包的条目链
     */
    previewArchive(path: string, entries?: string[]): Promise<APIResponse<ArchivePreviewResult>> {
        return api.post<ArchivePreviewResult>('/file/archive-preview', { path, entries: entries || [] })
    },

    /**
     * 读取压缩包（含嵌套）内单个文件的原始字节（base64）
     */
    readArchiveEntry(path: string, entries: string[]): Promise<APIResponse<FileContent>> {
        return api.post<FileContent>('/file/archive-read-entry', { path, entries })
    },

    /**
     * 解压压缩包到同级 <名称>_extracted 文件夹
     */
    extractArchive(path: string): Promise<APIResponse<ArchiveExtractResult>> {
        return api.post<ArchiveExtractResult>('/file/archive-extract', { path })
    },

    /**
     * 把选中的文件/文件夹压缩为 zip
     */
    compressFiles(paths: string[], name?: string): Promise<APIResponse<ArchiveExtractResult>> {
        return api.post<ArchiveExtractResult>('/file/compress', { paths, name: name || undefined })
    },
}

/** 下载失败时后端返回的 JSON 错误体是 Blob，读出来取 message */
async function readBlobErrorMessage(e: unknown): Promise<string> {
    const data = (e as { response?: { data?: unknown } })?.response?.data
    if (data instanceof Blob) {
        try {
            const json = JSON.parse(await data.text())
            if (json?.message) return json.message
        } catch {
            /* 非 JSON 错误体，走默认文案 */
        }
    }
    return '下载失败'
}
