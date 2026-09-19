<script setup lang="ts">
import { storeToRefs } from "pinia";
import { CheckCircle, Clock, X, XCircle } from "lucide-vue-next";
import { modalJelly } from "@/composables/useGsapTransition";
import { useDatabaseStore } from "@/store/database";

const databaseStore = useDatabaseStore();
const { showSqlLog, sqlLogList, sqlLogLoading, sqlLogTotal } =
    storeToRefs(databaseStore);
const { closeSqlLog } = databaseStore;

const formatTime = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
};
</script>

<template>
    <Transition
        :css="false"
        @enter="modalJelly.onEnter"
        @leave="modalJelly.onLeave"
    >
        <div
            v-if="showSqlLog"
            class="glass-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
            @click="closeSqlLog"
        >
            <div
                class="modal-content flex max-h-[85vh] w-full max-w-[600px] flex-col rounded-2xl bg-white p-4 shadow-xl sm:max-h-[70vh] sm:p-6"
                @click.stop
            >
                <div class="mb-4 flex items-center justify-between">
                    <h3
                        class="flex items-center gap-2 text-base font-semibold text-gray-800 sm:text-lg"
                    >
                        <Clock class="h-5 w-5 text-zx-primary" />
                        <span>SQL 执行日志</span>
                        <span
                            v-if="sqlLogTotal"
                            class="text-xs font-normal text-gray-400"
                        >
                            {{ sqlLogTotal }} 条
                        </span>
                    </h3>
                    <ZxButton variant="ghost" circle @click="closeSqlLog">
                        <X class="h-5 w-5" />
                    </ZxButton>
                </div>

                <div class="min-h-0 flex-1 overflow-y-auto">
                    <div
                        v-if="sqlLogLoading"
                        class="py-8 text-center text-gray-400"
                    >
                        <Clock class="mx-auto mb-2 h-8 w-8 animate-pulse" />
                        <p>加载中...</p>
                    </div>
                    <div
                        v-else-if="sqlLogList.length === 0"
                        class="py-8 text-center text-gray-400"
                    >
                        <Clock class="mx-auto mb-2 h-8 w-8 opacity-50" />
                        <p>暂无日志记录</p>
                        <p class="mt-1 text-sm">执行 SQL 后会出现在这里</p>
                    </div>
                    <div v-else class="space-y-2">
                        <div
                            v-for="log in sqlLogList"
                            :key="log.id"
                            :class="log.is_success ? 'bg-green-50' : 'bg-red-50'"
                            class="rounded-2xl p-3"
                        >
                            <div
                                class="mb-2 flex items-center justify-between gap-2"
                            >
                                <div class="flex min-w-0 items-center gap-2">
                                    <CheckCircle
                                        v-if="log.is_success"
                                        class="h-4 w-4 flex-shrink-0 text-green-600"
                                    />
                                    <XCircle
                                        v-else
                                        class="h-4 w-4 flex-shrink-0 text-red-600"
                                    />
                                    <span
                                        class="truncate text-sm font-medium text-gray-700"
                                    >
                                        {{ formatTime(log.created_at) }}
                                    </span>
                                </div>
                            </div>
                            <pre
                                class="font-mono text-xs break-all whitespace-pre-wrap text-gray-600"
                            >{{ log.sql }}</pre>
                            <p
                                v-if="log.message"
                                class="mt-1 text-xs break-all text-gray-500"
                            >
                                {{ log.message }}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </Transition>
</template>
