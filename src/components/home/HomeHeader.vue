<script setup lang="ts">
import User from "@/components/home/User.vue";
import Island from "@/components/home/Island/Island.vue";
import HomeGreeting from "./HomeGreeting.vue";
import HomeActions from "./HomeActions.vue";
</script>

<template>
    <div
        class="@container top relative z-10 flex w-full items-center justify-between gap-3 px-2 py-2 select-none sm:px-0 sm:py-0"
    >
        <div class="flex min-w-0 flex-1 items-center space-x-4">
            <User class="flex-shrink-0" />
            <!-- 宽度不足时优先隐藏问候语，给右侧 Island 腾位置 -->
            <HomeGreeting class="hidden @5xl:block" />
        </div>

        <div class="flex flex-shrink-0 items-center space-x-1.5 sm:space-x-3 pr-4">
            <Island />
            <div class="hidden h-5 w-[1px] bg-slate-200 sm:block"></div>
            <HomeActions />
        </div>
    </div>
</template>
