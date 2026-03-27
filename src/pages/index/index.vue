<template>
  <view class="page">

    <!-- ── Tab Header ── -->
    <view class="header">
      <view class="tab-strip">
        <view
          v-for="(t, i) in feedTabs" :key="t"
          class="tab-item" :class="{ active: activeTab === i }"
          @tap="switchTab(i)"
        >
          <text class="tab-text">{{ t }}</text>
        </view>
        <view class="tab-ind-wrap" :style="{ transform: `translateX(${activeTab * 100}%)` }">
          <view class="tab-ind-bar" />
        </view>
      </view>
    </view>

    <view v-if="showSloganBanner" class="slogan-banner">
      <view class="sb-main">
        <uni-icons type="info-filled" size="14" color="#5B5BD6" />
        <text class="sb-text">看 AI 消耗，抄高性价比 Skill，少烧 Token。</text>
      </view>
      <view class="sb-actions">
        <view class="sb-close" @tap.stop="dismissSloganBanner">
          <uni-icons type="closeempty" size="14" color="rgba(0,0,0,0.45)" />
        </view>
      </view>
    </view>

    <!-- ── FAB：记一笔（仅消耗记录 Tab 可见）── -->
    <view v-if="activeTab === 0" class="fab" @tap="toCreateRecord">
      <uni-icons type="compose" size="22" color="#fff" />
    </view>

    <!-- ── 左右滑动内容区 ── -->
    <swiper
      class="tab-swiper"
      :current="activeTab"
      :disable-touch="activeTab === 1"
      :duration="280"
      @change="onSwiperChange"
    >
      <swiper-item class="tab-pane">
        <feed-post ref="feedRef" @go-skill="enterSkillTab">
          <template #header>
            <view class="newbie-home-block">
              <view class="nh-head">
                <view class="nh-title-wrap">
                  <uni-icons type="star-filled" size="15" color="#E45C1A" />
                  <text class="nh-title">新手必试 · Skill 入门</text>
                </view>
                <text class="nh-more" @tap="enterSkillTab">去 Skill 区</text>
              </view>
              <text class="nh-sub">先复制 1 条试试，再按你的场景改变量。</text>

              <view v-if="newbieLoading" class="nh-loading">
                <text class="nh-loading-text">加载中...</text>
              </view>

              <view
                v-else-if="newbieSkills.length"
                class="nh-list"
              >
                <view
                  v-for="skill in newbieSkills"
                  :key="`home-newbie-${skill.id}`"
                  class="nh-item"
                  @tap="toSkillDetail(skill.id)"
                >
                  <view class="nh-item-main">
                    <text class="nh-item-title line-1">{{ skill.title }}</text>
                    <view class="nh-item-meta">
                      <text class="nh-scene">{{ skill.scene }}</text>
                      <text class="nh-copy-count">{{ skill.copyCountText }}</text>
                    </view>
                  </view>

                  <view class="nh-copy-btn" @tap.stop="copyNewbieSkill(skill)">
                    <text class="nh-copy-text">复制</text>
                  </view>
                </view>
              </view>

              <view v-else class="nh-empty">
                <text class="nh-empty-text">暂无推荐，去 Skill 区看看</text>
              </view>
            </view>
          </template>
        </feed-post>
      </swiper-item>
      <swiper-item class="tab-pane">
        <skill-feed @edge-swipe="onSkillEdgeSwipe" />
      </swiper-item>
    </swiper>

    <view v-if="showOnboarding" class="onboarding-mask" @tap="skipOnboarding">
      <view class="onboarding-panel" @tap.stop>
        <view class="ob-head">
          <text class="ob-step">{{ onboardingStep }}/{{ onboardingSlides.length }}</text>
          <view class="ob-close" @tap="skipOnboarding">
            <uni-icons type="closeempty" size="16" color="rgba(0,0,0,0.45)" />
          </view>
        </view>

        <view class="ob-icon-wrap" :style="{ background: currentSlide.gradient }">
          <uni-icons :type="currentSlide.icon" size="34" color="#FFFFFF" />
        </view>

        <text class="ob-title">{{ currentSlide.title }}</text>
        <text class="ob-desc">{{ currentSlide.desc }}</text>

        <view v-if="currentSlide.pill" class="ob-pill">
          <text class="ob-pill-t">{{ currentSlide.pill }}</text>
        </view>

        <view class="ob-points">
          <view
            v-for="(_, index) in onboardingSlides"
            :key="`ob-point-${index}`"
            class="ob-point"
            :class="{ on: onboardingStep === index + 1 }"
          />
        </view>

        <view class="ob-actions">
          <view
            v-if="!isLastSlide"
            class="ob-btn ob-btn-primary"
            @tap="nextOnboarding"
          >
            <text class="ob-btn-text">下一步</text>
          </view>

          <template v-else>
            <view class="ob-btn ob-btn-ghost" @tap="finishOnboarding('consume')">
              <text class="ob-btn-text ghost">看大家怎么烧钱</text>
            </view>
            <view class="ob-btn ob-btn-primary" @tap="finishOnboarding('skill')">
              <text class="ob-btn-text">直接抄 Skill</text>
            </view>
          </template>
        </view>
      </view>
    </view>

  </view>
</template>

<script setup lang="ts">
import { copySkill as copySkillApi, getSkillDetail, getSkillList } from '@/api/skill'
import FeedPost from '@/components/feed-post/index.vue'
import SkillFeed from '@/components/skill-feed/index.vue'
import { useGuideStore, useUserStore } from '@/stores'
import { requireLogin } from '@/utils/auth-guard'
import { getCurrentInstance } from 'vue'

const instance = getCurrentInstance()
const guideStore = useGuideStore()
const userStore = useUserStore()

const FEED_POST_PUBLISHED_KEY = 'feed_post_published_v1'
const ONBOARDING_DELAY_MS = 1200
const NEWBIE_PAGE_SIZE = 8

const feedRef = ref<InstanceType<typeof FeedPost> | null>(null)

const activeTab = ref(0)
const feedTabs = ['消耗', 'Skill']

const showSloganBanner = ref(false)
const showOnboarding = ref(false)
const onboardingStep = ref(1)
const newbieLoading = ref(false)
const newbieSkills = ref<Array<{
  id: string
  title: string
  scene: string
  copyFallback: string
  copyCount: number
  copyCountText: string
}>>([])

let onboardingTimer: ReturnType<typeof setTimeout> | null = null

const onboardingSlides = [
  {
    gradient: 'linear-gradient(135deg, #FF8C5A 0%, #E45C1A 100%)',
    icon: 'fire-filled',
    title: 'Token 烧多了？\n来这里说',
    desc: '围观大佬用 AI 做了什么牛逼项目，花了多少 Token——也有人烧钱翻车，点「我也是」找组织。',
    pill: '点「我也是」找到同款受害者',
  },
  {
    gradient: 'linear-gradient(135deg, #7C7CE8 0%, #5B5BD6 100%)',
    icon: 'star-filled',
    title: '别人调好的 AI 指令\n直接抄走',
    desc: '一键复制高性价比 Prompt，不用从头摸索——改 2 个词就能用，省 Token 也省命。',
    pill: 'Skill 广场 · 高性价比提示词库',
  },
  {
    gradient: 'linear-gradient(135deg, #5B5BD6 0%, #FF7A45 100%)',
    icon: 'compose',
    title: '先做哪件事？',
    desc: '两条路都能让你少烧冤枉 Token。',
    pill: null,
  },
]

const currentSlide = computed(() => onboardingSlides[Math.max(onboardingStep.value - 1, 0)] || onboardingSlides[0])
const isLastSlide = computed(() => onboardingStep.value >= onboardingSlides.length)

const normalizePlainText = (value: unknown) => `${value ?? ''}`
  .replace(/<[^>]*>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const mapNewbieSkill = (item: any) => {
  const title = `${item?.title || '未命名 Skill'}`
  const copyCount = Math.max(0, Number(item?.copyCount ?? item?.stats?.copyCount ?? 0))
  const copyFallback = normalizePlainText(
    item?.promptPreview ?? item?.summary ?? item?.brief ?? title
  )

  return {
    id: `${item?.id || ''}`,
    title,
    scene: `${item?.scene || '其他'}`,
    copyFallback,
    copyCount,
    copyCountText: copyCount > 0 ? `${copyCount} 人复制` : '可直接复用',
  }
}

const loadNewbieSkills = async () => {
  newbieLoading.value = true
  try {
    const data = await getSkillList({
      page: 1,
      pageSize: NEWBIE_PAGE_SIZE,
      sort: 'mostCopy'
    })
    const list = Array.isArray(data?.list) ? data.list.map(mapNewbieSkill) : []
    newbieSkills.value = list
      .filter(item => item.id)
      .slice(0, 2)
  } catch {
    newbieSkills.value = []
  } finally {
    newbieLoading.value = false
  }
}

const clearOnboardingTimer = () => {
  if (!onboardingTimer) return
  clearTimeout(onboardingTimer)
  onboardingTimer = null
}

const scheduleGuideLayers = () => {
  clearOnboardingTimer()
  if (guideStore.canShowOnboarding()) {
    onboardingTimer = setTimeout(() => {
      guideStore.requestLayer('onboarding')
    }, ONBOARDING_DELAY_MS)
    return
  }

  if (guideStore.onboardingDone && guideStore.canShowBanner()) {
    guideStore.requestLayer('banner')
  }
}

const dismissSloganBanner = () => {
  guideStore.markBannerDismissed()
  guideStore.releaseLayer('banner')
}

const nextOnboarding = () => {
  if (isLastSlide.value) return
  onboardingStep.value += 1
}

const skipOnboarding = () => {
  guideStore.markOnboardingSkipped()
  guideStore.releaseLayer('onboarding')
}

const finishOnboarding = (target: 'consume' | 'skill') => {
  guideStore.markOnboardingDone()
  guideStore.releaseLayer('onboarding')

  if (target === 'skill') {
    activeTab.value = 1
  } else {
    activeTab.value = 0
  }
}

const enterSkillTab = () => {
  activeTab.value = 1
}

const toSkillDetail = (id: string) => {
  if (!id) return
  uni.navigateTo({ url: `/pages/detail/skill?id=${id}` })
}

const copyNewbieSkill = async (skill: {
  id: string
  title: string
  copyFallback: string
}) => {
  if (!requireLogin(userStore.token, '复制 Skill')) return
  if (!skill?.id) return

  let copyText = ''
  try {
    const detail = await getSkillDetail(skill.id)
    copyText = normalizePlainText(detail?.content?.fullPrompt)
  } catch { }

  if (!copyText) {
    copyText = normalizePlainText(skill.copyFallback || skill.title)
  }
  if (!copyText) {
    uni.showToast({ title: '暂无可复制内容', icon: 'none' })
    return
  }

  const copied = await new Promise<boolean>((resolve) => {
    uni.setClipboardData({
      data: copyText,
      showToast: false,
      success: () => resolve(true),
      fail: () => resolve(false),
    })
  })
  if (!copied) {
    uni.showToast({ title: '复制失败', icon: 'none' })
    return
  }

  try {
    await copySkillApi(skill.id, { sourceChannel: 'home_consume' })
  } catch {
    // ignore API record failure in UI action
  }

  guideStore.markFirstSkillCopy()
  uni.showToast({ title: '已复制 Skill', icon: 'success' })
}

const switchTab = (i: number) => { activeTab.value = i }
const onSwiperChange = (e: any) => { activeTab.value = e.detail.current }
const toCreateRecord = () => uni.navigateTo({ url: '/pages/publish/record' })
const onSkillEdgeSwipe = (dir: 'left' | 'right') => {
  if (dir === 'left') activeTab.value = Math.min(feedTabs.length - 1, activeTab.value + 1)
  else activeTab.value = Math.max(0, activeTab.value - 1)
}

watch(() => guideStore.activeLayer, (layer) => {
  showSloganBanner.value = layer === 'banner'
  showOnboarding.value = layer === 'onboarding'
  if (showOnboarding.value) onboardingStep.value = 1
}, { immediate: true })

onShow(() => {
  // #ifdef MP-WEIXIN
  ;(uni as any).getTabBar(instance?.proxy)?.setData({ selected: 0 })
  // #endif

  const published = uni.getStorageSync(FEED_POST_PUBLISHED_KEY)
  if (published?.id && typeof feedRef.value?.refresh === 'function') {
    feedRef.value.refresh()
    uni.removeStorageSync(FEED_POST_PUBLISHED_KEY)
  }

  if (!newbieSkills.value.length && !newbieLoading.value) {
    void loadNewbieSkills()
  }

  scheduleGuideLayers()
})

onHide(() => {
  clearOnboardingTimer()

  if (guideStore.activeLayer === 'banner') {
    guideStore.cancelLayer('banner')
  }
  if (guideStore.activeLayer === 'onboarding') {
    guideStore.cancelLayer('onboarding')
  }
})

onUnload(() => {
  clearOnboardingTimer()
})
</script>

<style lang="scss" scoped>
.page {
  height: 100%;
  background: var(--bg-secondary);
  display: flex;
  flex-direction: column;
}

/* ── Header ── */
.header {
  display: flex;
  justify-content: center;
  align-items: center;
  padding-top: 0;
  background: var(--card-bg);
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
}

/* #ifdef H5 */
.header {
  padding-top: var(--h5-safe-area-inset-top, 0px);
}
/* #endif */

/* #ifndef H5 */
.header {
  padding-top: constant(safe-area-inset-top);
  padding-top: env(safe-area-inset-top);
}
/* #endif */

.tab-strip {
  position: relative;
  display: flex;
  padding-bottom: 2rpx;

  .tab-item {
    width: 148rpx;
    display: flex;
    justify-content: center;
    padding: 24rpx 0 18rpx;

    .tab-text {
      font-size: 28rpx;
      color: var(--text-muted);
      font-weight: 500;
      transition: color 0.2s;
    }

    &.active .tab-text {
      color: var(--text-primary);
      font-weight: 700;
      font-size: 30rpx;
    }
  }

  .tab-ind-wrap {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 148rpx;
    display: flex;
    justify-content: center;
    transition: transform 0.28s cubic-bezier(0.34, 1.2, 0.64, 1);

    .tab-ind-bar {
      width: 36rpx;
      height: 4rpx;
      background: var(--accent-color);
      border-radius: 2rpx;
    }
  }
}

.slogan-banner {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 14rpx 20rpx;
  background: rgba(91, 91, 214, 0.07);
  border-bottom: 1rpx solid rgba(91, 91, 214, 0.15);

  .sb-main {
    min-width: 0;
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10rpx;
  }

  .sb-text {
    min-width: 0;
    flex: 1;
    font-size: 24rpx;
    color: rgba(26, 26, 26, 0.8);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sb-actions {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .sb-close {
    width: 36rpx;
    height: 36rpx;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.06);
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.newbie-home-block {
  margin: 14rpx 20rpx 0;
  padding: 16rpx;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.95);
  border: 1rpx solid rgba(0, 0, 0, 0.06);
}

.nh-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.nh-title-wrap {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.nh-title {
  font-size: 24rpx;
  color: var(--text-primary);
  font-weight: 700;
}

.nh-more {
  font-size: 22rpx;
  color: var(--primary-color);
  font-weight: 700;
}

.nh-sub {
  display: block;
  margin-bottom: 12rpx;
  font-size: 21rpx;
  color: var(--text-muted);
}

.nh-loading {
  height: 88rpx;
  border-radius: 14rpx;
  background: rgba(0, 0, 0, 0.03);
  display: flex;
  align-items: center;
  justify-content: center;
}

.nh-loading-text {
  font-size: 22rpx;
  color: var(--text-muted);
}

.nh-list {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.nh-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 14rpx;
  border-radius: 12rpx;
  border: 1rpx solid rgba(0, 0, 0, 0.06);
  background: var(--card-bg);
}

.nh-item-main {
  min-width: 0;
  flex: 1;
}

.nh-item-title {
  display: block;
  font-size: 24rpx;
  color: var(--text-primary);
  font-weight: 700;
  line-height: 1.4;
}

.nh-item-meta {
  margin-top: 6rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.nh-scene {
  max-width: 140rpx;
  padding: 4rpx 10rpx;
  border-radius: 999rpx;
  font-size: 19rpx;
  color: var(--orange-color);
  background: rgba(228, 92, 26, 0.1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nh-copy-count {
  font-size: 20rpx;
  color: var(--text-muted);
}

.nh-copy-btn {
  width: 88rpx;
  height: 52rpx;
  border-radius: 10rpx;
  background: rgba(91, 91, 214, 0.12);
  border: 1rpx solid rgba(91, 91, 214, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.nh-copy-text {
  font-size: 21rpx;
  color: var(--primary-color);
  font-weight: 700;
}

.nh-empty {
  height: 78rpx;
  border-radius: 12rpx;
  background: rgba(0, 0, 0, 0.03);
  display: flex;
  align-items: center;
  justify-content: center;
}

.nh-empty-text {
  font-size: 21rpx;
  color: var(--text-muted);
}

/* ── FAB ── */
.fab {
  position: fixed;
  right: 40rpx;
  bottom: calc(130rpx + env(safe-area-inset-bottom));
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: var(--accent-color);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 28rpx rgba(255, 122, 69, 0.45);
  z-index: 100;

  &:active {
    opacity: 0.85;
  }
}

/* ── Swiper ── */
.tab-swiper {
  flex: 1;
  height: 0;
}

.tab-pane {
  height: 100%;
}

.onboarding-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 1300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx;
}

.onboarding-panel {
  width: 100%;
  max-width: 680rpx;
  background: var(--card-bg);
  border-radius: 28rpx;
  padding: 30rpx;
  box-shadow: 0 24rpx 60rpx rgba(0, 0, 0, 0.2);
}

.ob-head {
  display: flex;
  align-items: center;
}

.ob-step {
  font-size: 20rpx;
  font-weight: 700;
  color: var(--text-muted);
  background: rgba(0, 0, 0, 0.05);
  border-radius: 999rpx;
  padding: 6rpx 18rpx;
}

.ob-close {
  margin-left: auto;
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
}

.ob-icon-wrap {
  width: 128rpx;
  height: 128rpx;
  border-radius: 36rpx;
  margin: 22rpx auto 26rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 16rpx 44rpx rgba(0, 0, 0, 0.22);
}

.ob-title {
  display: block;
  text-align: center;
  font-size: 40rpx;
  font-weight: 800;
  color: var(--text-primary);
  white-space: pre-line;
  line-height: 1.35;
  letter-spacing: -0.5rpx;
}

.ob-desc {
  display: block;
  margin-top: 20rpx;
  text-align: center;
  font-size: 27rpx;
  line-height: 1.7;
  color: #4B5563;
  padding: 0 8rpx;
}

.ob-pill {
  margin-top: 22rpx;
  display: flex;
  justify-content: center;
}

.ob-pill-t {
  font-size: 23rpx;
  font-weight: 600;
  color: var(--primary-color);
  background: rgba(91, 91, 214, 0.09);
  border: 1rpx solid rgba(91, 91, 214, 0.2);
  border-radius: 999rpx;
  padding: 10rpx 26rpx;
}

.ob-points {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10rpx;
  margin: 30rpx 0 24rpx;
}

.ob-point {
  width: 12rpx;
  height: 12rpx;
  border-radius: 6rpx;
  background: rgba(0, 0, 0, 0.12);
  transition: all 0.28s cubic-bezier(0.34, 1.2, 0.64, 1);

  &.on {
    width: 32rpx;
    border-radius: 6rpx;
    background: var(--primary-color);
  }
}

.ob-actions {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.ob-btn {
  height: 92rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ob-btn-primary {
  background: var(--primary-color);
  box-shadow: 0 8rpx 24rpx rgba(91, 91, 214, 0.32);
}

.ob-btn-ghost {
  background: rgba(0, 0, 0, 0.05);
}

.ob-btn-text {
  font-size: 30rpx;
  color: #ffffff;
  font-weight: 700;
  letter-spacing: 0.5rpx;

  &.ghost {
    color: var(--text-gray);
  }
}

.line-1 {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media screen and (min-width: 768px) {
  .newbie-home-block {
    margin: 10px 16px 0;
    padding: 12px;
  }

  .nh-title {
    font-size: 13px;
  }

  .nh-more {
    font-size: 12px;
  }

  .nh-item-title {
    font-size: 14px;
  }

  .nh-copy-count,
  .nh-scene {
    font-size: 12px;
  }

  .slogan-banner {
    padding: 10px 16px;

    .sb-text {
      font-size: 13px;
    }
  }

  .onboarding-panel {
    max-width: 420px;
    padding: 20px;
  }

  .ob-icon-wrap {
    width: 76px;
    height: 76px;
    border-radius: 20px;
    margin: 14px auto 18px;
  }

  .ob-title {
    font-size: 22px;
    letter-spacing: -0.2px;
  }

  .ob-desc {
    font-size: 14px;
    margin-top: 12px;
  }

  .ob-pill-t {
    font-size: 12px;
    padding: 5px 14px;
  }

  .ob-btn {
    height: 52px;
    border-radius: 12px;
  }

  .ob-btn-text {
    font-size: 15px;
  }
}
</style>
