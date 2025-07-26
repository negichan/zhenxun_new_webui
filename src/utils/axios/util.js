import { getBaseUrl } from '@/utils/api/index.js'
import request, { apiUrl } from '@/utils/axios/index.js'

export function setRequestBaseUrl() {
    request.defaults.baseURL = getBaseUrl()+apiUrl
}