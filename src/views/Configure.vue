// @flow
<script setup>
import { systemApi } from '@/utils/api/system.js'
import { ZXNotification } from 'components'
import { reactive, computed, toRaw } from 'vue'
import { navigateTo } from '@/utils/navigation.js'

/*
图片导入区
 */

import poster from '@/assets/img/7(1).png'
import ZXInput from 'components/zxcomponent/ZXInput.vue'

/*
图片导入区结束
 */


// const router = useRouter();

const config = reactive({
    superusers: '',
    db_url: 'sqlite:data/db/zhenxun.db',
    username: 'admin',
    password: '',
    host: '127.0.0.1',
    port: '8080'
})

const validationStatus = reactive({
    superusers: { valid: true, message: '' },
    db_url: { valid: true, message: '' },
    username: { valid: true, message: '' },
    password: { valid: true, message: '' },
    host: { valid: true, message: '' },
    port: { valid: true, message: '' }
})

const isAllValid = computed(() =>
    Object.values(validationStatus).every(field => field.valid)
)

const fieldNameMap = {
    superusers: '超级用户',
    db_url: '数据库地址',
    username: '用户名',
    password: '密码',
    host: 'IP地址',
    port: '端口号'
}

function validateField(key) {
    const value = String(config[key]).trim()

    if (!value) {
        validationStatus[key] = { valid: false, message: `${fieldNameMap[key]}不能为空` }
        return
    }

    if (key === 'superusers' && !validateSuperUsername(value)) {
        validationStatus.superusers = { valid: false, message: '你是不是输入了中文逗号?回答我!' }
        return
    }

    if (key === 'db_url') {
        validationStatus.db_url = { valid: true, message: '' }
        test_db(value)
        return
    }

    if (key === 'host' && !validateIP(value)) {
        validationStatus.host = { valid: false, message: 'IP地址格式错误, 应为如 127.0.0.1' }
        return
    }

    if (key === 'port' && !validatePort(value)) {
        validationStatus.port = { valid: false, message: '端口号应为 1~65535 的整数' }
        return
    }

    validationStatus[key] = { valid: true, message: '' }
}

function validateIP(host) {
    const ipRegex = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/
    return ipRegex.test(host)
}

function validatePort(port) {
    const num = Number(port)
    return Number.isInteger(num) && num >= 1 && num <= 65535
}

function validateSuperUsername(superusers) {
    return !superusers.includes('，')
}

function test_db(db_url) {
    systemApi.test_db(db_url, { skipInterceptor: true })
        .then(res => {
            if (res?.suc) {
                ZXNotification({
                    title: '呜呼~',
                    message: res?.info,
                    type: '🥳',
                    confetti: true,
                    position: 'top-right'
                })
            } else {
                validationStatus.db_url = { valid: false, message: res?.info || '数据库连接失败' }
                ZXNotification({
                    title: '啊哦~',
                    message: res?.info,
                    type: '🥹',
                    position: 'top-right'
                })
            }
        })
        .catch(() => {
            validationStatus.db_url = { valid: false, message: '数据库连接失败惹~' }
            ZXNotification({
                title: '啊啊~',
                message: '数据库连接失败惹~',
                type: '😭',
                position: 'top-right'
            })
        })
}

function validateAll() {
    Object.keys(config).forEach(validateField)
}

async function submit() {
    validateAll()
    if (!isAllValid.value) return

    const raw = toRaw(config)
    const payload = {
        ...raw,
        superusers: Array.isArray(raw.superusers)
            ? raw.superusers
            : String(raw.superusers).split(',').map(s => s.trim()).filter(Boolean)
    }
    systemApi.set_configure(payload).then(async (res) => {
        if (res?.suc) {
            ZXNotification({
                title: '恭喜~',
                message: res?.info,
                type: '👏',
                confetti: true
            })
            await navigateTo({
                path: '/login'
            })
        } else {
            ZXNotification({
                title: '有问题',
                message: res?.info,
                type: '😨'
            })
        }
    }).catch(e => {
        ZXNotification({
            title: '异常',
            message: '配置提交失败，请检查网络或后端接口',
            type: '💥'
        })
    })
}
</script>


<template>
    <div class="h-screen flex justify-center items-center bg-orange-100">
        <div
            class="w-300 h-190 bg-pink-100 border-8 border-white overflow-hidden rounded-4xl shadow-lg flex justify-around relative sm:m-10 max-sm:h-screen max-sm:flex-col-reverse">
            <div
                class="content bg-white rounded-r-4xl h-full flex-1 p-8 px-16 max-sm:flex max-sm:flex-col max-sm:justify-around max-md:rounded-none max-sm:rounded-t-4xl max-sm:shadow-[0_3px_10px_rgb(0,0,0,0.2)]">
                <div class="title text-4xl font-bold mt-15 mb-10 max-sm:mt-5">基础配置</div>
                <div class="space-y-4 w-full font-bold">
                    <div class="space-y-2">
                        <div class="title">🦸‍超级用户</div>
                        <div class="w-full min-w-[200px] relative">
                            <ZXInput
                                v-model="config.superusers"
                                :message="validationStatus.superusers.message"
                                placeholder="请输入超级用户ID, 多个请使用逗号隔开"
                                @blur="validateField('superusers')"
                            />
                            <!--                            <input-->
                            <!--                                v-model="config.superusers"-->
                            <!--                                @blur="validateField('superusers')"-->
                            <!--                                class="w-full font-light pl-6 bg-white placeholder:text-slate-400 text-slate-700 text-sm border border-slate-300 rounded-md px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 focus:shadow"-->
                            <!--                                placeholder="请输入超级用户ID, 多个请使用逗号隔开"/>-->
                            <!--                            <span v-if="!validationStatus.superusers.valid"-->
                            <!--                                  class="absolute right-0 font-normal text-sm bottom-0 translate-y-full text-red-500">-->
                            <!--                {{ validationStatus.superusers.message }}-->
                            <!--              </span>-->
                        </div>
                    </div>

                    <div class="space-y-2">
                        <div class="title">🏛️数据库地址</div>
                        <div class="w-full min-w-[200px] relative">
                            <ZXInput
                                v-model="config.db_url"
                                :message="validationStatus.db_url.message"
                                placeholder="请输入数据库地址"
                                @blur="validateField('db_url')"
                            />
                        </div>
                    </div>

                    <div class="space-y-2">
                        <div class="title">🧑‍💼用户名</div>
                        <div class="w-full min-w-[200px] relative">
                            <ZXInput
                                v-model="config.username"
                                :message="validationStatus.username.message"
                                placeholder="请输入用户名"
                                @blur="validateField('username')"
                            />
                        </div>
                    </div>
                    <div class="space-y-2">
                        <div class="title">🔑密码</div>
                        <div class="w-full min-w-[200px] relative">
                            <ZXInput
                                v-model="config.password"
                                :message="validationStatus.password.message"
                                placeholder="请输入密码"
                                @blur="validateField('password')"
                            />
                        </div>
                    </div>

                    <div class="flex justify-between space-x-4">
                        <div class="space-y-2">
                            <div class="title">🌐IP</div>
                            <div class="min-w-60 relative max-sm:min-w-50">
                                <ZXInput
                                    v-model="config.host"
                                    :message="validationStatus.host.message"
                                    placeholder="请输入IP地址"
                                    @blur="validateField('host')"
                                />
                            </div>
                        </div>
                        <div class="space-y-2 flex-1">
                            <div class="title">🐛端口</div>
                            <div class="min-w-30 relative">
                                <ZXInput
                                    v-model="config.port"
                                    :message="validationStatus.port.message"
                                    placeholder="请输入端口号"
                                    @blur="validateField('port')"
                                />
                            </div>
                        </div>
                    </div>

                    <div class="login-button mt-10">
                        <button
                            class="w-full cursor-pointer font-bold items-center rounded-xl bg-slate-800 py-2 px-4 border border-transparent text-center text-lg text-white transition-all shadow-sm hover:shadow-md hover:bg-slate-700 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
                            type="button"
                            @click="submit">
                            提交
                        </button>
                    </div>
                </div>
            </div>

            <div
                class="left rounded-r-4xl w-5/9 bg-pink-100 overflow-hidden flex justify-center items-end  max-md:hidden max-sm:block max-sm:w-full">
                <img :src="poster" alt="" class="w-100 translate-y-4" />
            </div>
        </div>
    </div>
</template>


<style scoped>

</style>