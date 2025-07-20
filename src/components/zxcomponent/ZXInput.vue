<template>
    <!-- 输入框 -->
    <input
        :placeholder="placeholder"
        :value="modelValue"
        class="ease w-full rounded-md border border-slate-300 bg-white px-3 py-2 pl-6 text-sm font-light text-slate-700 transition duration-300 placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-400 focus:shadow focus:outline-none"
        v-bind="attrs"
        @input="emit('update:modelValue', $event.target.value)"
    />

    <!-- 状态图标 -->
    <span
        v-if="icon && message"
        :data-placement="position"
        :data-success="iconType"
        class="pointer-events-none absolute top-1/2 -translate-y-1/2 text-red-500 inline-flex w-6 h-6 data-[placement=start]:left-2.5 data-[placement=end]:right-2.5 data-[show=false]:hidden data-[success=success]:text-green-500"
    >
          <svg v-if="iconType==='success'" class="size-6" fill="none" stroke="currentColor" stroke-width="1.5"
               viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke-linecap="round"
                  stroke-linejoin="round" />
          </svg>
          <svg v-else class="size-6" fill="none" stroke="currentColor" stroke-width="1.5"
               viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke-linecap="round"
                  stroke-linejoin="round" />
          </svg>
        </span>

    <!-- 消息 -->
    <span
        v-if="message"
        :class="messageClass"
        class="absolute right-0 bottom-0 translate-y-full  font-normal text-sm"
    >
      {{ message }}
    </span>
</template>

<script setup>
import { computed, useAttrs } from 'vue'

const props = defineProps({
    modelValue: {
        type: [String, Number],
        default: ''
    },
    placeholder: {
        type: String,
        default: '请输入'
    },
    message: {
        type: [String, Number],
        default: ''
    },
    messageType: {
        type: String,
        default: 'error', // 'error' | 'warning' | 'info' | 'success'
        validator: value => ['error', 'warning', 'info', 'success'].includes(value)
    },
    icon: {
        type: Boolean,
        default: false
    },
    position: {
        type: String,
        default: 'end'
    },
    type: {
        type: [String, Boolean],
        default: 'success'
    }
})

const attrs = useAttrs()
const emit = defineEmits(['update:modelValue'])

const iconType = computed(() => {
    let value = props.type
    if (typeof value === 'boolean') {
        return value ? 'success' : 'error'
    }
    if (typeof value === 'string') {
        return value.toLowerCase()
    }
    return 'error'
})

const messageClass = computed(() => ({
    'text-red-500': props.messageType === 'error',
    'text-yellow-500': props.messageType === 'warning',
    'text-blue-500': props.messageType === 'info',
    'text-green-500': props.messageType === 'success'
}))
</script>