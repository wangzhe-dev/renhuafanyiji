<template>
  <view class="page">
    <skill-feed ref="feedRef" />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SkillFeed from '@/components/skill-feed/index.vue'

const feedRef = ref<InstanceType<typeof SkillFeed> | null>(null)

onShow(() => {
  feedRef.value?.refreshPublished()
})
</script>

<style lang="scss" scoped>
.page {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
