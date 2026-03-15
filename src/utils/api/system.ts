import request from '../axios'
import { BaseResponse } from "@/types/index.js";


export const systemApi = {

    login(data:object,options = {}){
        return request.post('/login',data,{
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            ...options
        })
    },


    ping(options = {}){
        return request.get('/system/ping',{
            ...options
        })
    },

    test_db(data:string,options = {}){
        return request.get('/configure/test_db',{
            params:{
                db_url:data
            },
            ...options
        })
    },
    set_configure(params:object,options = {}){
        return request.post('/configure/set_configure',
            params,{
                ...options
            }
        )
    },

}
