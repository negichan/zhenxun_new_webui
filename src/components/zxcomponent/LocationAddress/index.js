import { createApp, defineAsyncComponent, h, ref } from 'vue'
import { useComponentStore } from '@/store/componet.js'

const LocationAddress = defineAsyncComponent(() =>
    import('./LocationAddress.vue')
)

export function showLocationAddress(props = {}) {
    const container = document.createElement('div')
    document.body.appendChild(container)

    const visible = ref(true)
    const modalRef = ref(null)

    const componentStore = useComponentStore()
    componentStore.LocationAddress = visible.value

    const close = async () => {
        // 调用组件暴露的离开动画方法
        if (modalRef.value && modalRef.value.leaveAnimation) {
            await modalRef.value.leaveAnimation()
        }
        app.unmount()
        container.remove()
    }

    const app = createApp({
        setup() {
            return () => h(LocationAddress, {
                ...props,
                modelValue: visible.value,
                ref: modalRef,
                'onUpdate:modelValue': val => {
                    visible.value = val
                    if (!val) {
                        close()
                    }
                },
            })
        }
    })

    app.mount(container)

    // 返回关闭方法以便外部调用
    return {
        close
    }
}