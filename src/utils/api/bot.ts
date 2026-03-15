import request from '@/utils/axios'

export const botApi ={
    get_bot_list(options = {}){
        return request.get('/dashboard/get_bot_list',{
            ...options
        })
    },
    get_chat_and_call_count(options = {}){
        return request.get('/dashboard/get_chat_and_call_count',{
            ...options
        })
    },

    //
    // get_base_info(id,options = {}){
    //
    // },

}