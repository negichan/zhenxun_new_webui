import { getBaseUrl } from '@/utils/api/'
import request, { apiUrl } from '@/utils/axios/'

export function setRequestBaseUrl() {
    request.defaults.baseURL = getBaseUrl()+apiUrl
}