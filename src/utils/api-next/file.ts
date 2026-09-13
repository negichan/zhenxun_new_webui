/**
 * WebUI Next API - 文件管理接口
 */

import { api, apiClient } from './client'
import type {
    FileListResult,
    FileContent,
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
     */
    readFile(filePath: string, options?: { skipInterceptor?: boolean; as_image?: boolean }): Promise<APIResponse<FileContent>> {
        return api.get<FileContent>('/file/read', { file_path: filePath, as_image: options?.as_image }, options)
    },

    /**
     * 保存文件内容
     */
    saveFile(filePath: string, content: string): Promise<APIResponse<boolean>> {
        return api.post<boolean>('/file/save', { file_path: filePath, content })
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
     * 预览压缩包内容
     */
    previewArchive(path: string): Promise<APIResponse<ArchivePreviewResult>> {
        return api.post<ArchivePreviewResult>('/file/archive-preview', { path })
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
