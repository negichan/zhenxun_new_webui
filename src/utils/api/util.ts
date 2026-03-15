import { setRequestBaseUrl } from '@/utils/axios/util.js'
import { setBaseApiUrl, setPort } from '@/utils/api/'

export function updateRequestUrl(url:string, port:number) {
    setPort(port)
    setBaseApiUrl(url)
    setRequestBaseUrl();
}
