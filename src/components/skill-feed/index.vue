<template>
  <view class="root">

    <!-- 搜索 -->
    <view class="top-bar">
      <view class="search-wrap" @tap="toSearch">
        <uni-icons type="search" size="16" color="rgba(0,0,0,0.35)" />
        <text class="search-ph">搜索 Skill / 场景 / 模型</text>
      </view>
    </view>

    <!-- 排序 Tab -->
    <scroll-view class="sort-bar" scroll-x :show-scrollbar="false" :scroll-into-view="sortBarScrollIntoView"
      scroll-with-animation>
      <view class="sort-row">
        <view v-for="tab in sortTabs" :key="tab.key" :id="tab.viewId" class="sort-tab"
          :class="{ active: activeSort === tab.key }" @touchstart="onSortTabTouchStart" @touchmove="onSortTabTouchMove"
          @tap="onSortTabTap(tab.key)">
          <text class="sort-tab-t">{{ tab.label }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- Skill 列表 -->
    <view class="list-outer">
      <scroll-view class="list-scroll" scroll-y :show-scrollbar="false" :refresher-enabled="refresherEnabled"
        refresher-default-style="black" :refresher-triggered="pullTriggered" lower-threshold="100"
        @touchstart="onListGestureStart" @touchmove="onListGestureMove" @touchend="onListGestureEnd"
        @touchcancel="onGestureCancel" @refresherrefresh="onPullRefresh" @refresherrestore="onRefresherRestore"
        @refresherabort="onRefresherRestore" @scrolltolower="onLoadMore">
        <view v-if="showSkeleton" class="skill-list skill-skeleton-list">
          <view v-for="n in 4" :key="`skill-skeleton-${n}`" class="skill-card sk-skill-card">
            <view class="sc-badge-row">
              <view class="sk-block sk-chip" />
              <view class="sk-block sk-chip" />
              <view class="sc-scene-tag sk-block sk-chip sk-chip-right" />
            </view>

            <view class="sk-block sk-line sk-w-68" />
            <view class="sk-block sk-line sk-w-92 mt-12" />
            <view class="sk-block sk-line sk-w-80 mt-12" />

            <view class="sk-img-row">
              <view v-for="idx in 3" :key="`skill-sk-img-${n}-${idx}`" class="sk-block sk-img" />
            </view>

            <view class="sc-tags">
              <view v-for="idx in 3" :key="`skill-sk-tag-${n}-${idx}`" class="sc-tag sk-block sk-tag" />
            </view>

            <view class="sc-foot">
              <view class="sc-author-wrap">
                <view class="sc-av sk-block" />
                <view class="sc-author-info">
                  <view class="sk-block sk-line sk-w-30" />
                  <view class="sk-block sk-line sk-w-46 mt-10" />
                </view>
              </view>
              <view class="sc-actions">
                <view class="sk-block sk-pill sk-pill-sm" />
                <view class="sk-block sk-pill" />
              </view>
            </view>
          </view>
        </view>

        <view v-else class="carousel-stage">
          <view v-for="panel in carouselPanels" :key="panel.key" class="carousel-pane" :class="`pane-${panel.role}`"
            :style="getPaneStyle(panel.role)">
            <view class="skill-list">
              <view v-for="skill in panel.skills" :key="`${panel.key}-${skill.id}`" class="skill-card"
                @touchstart="onListGestureStart" @touchmove="onListGestureMove" @touchend="onListGestureEnd"
                @touchcancel="onGestureCancel" @tap="toSkill(skill.id)">
                <!-- 标签行 -->
                <view class="sc-badge-row">
                  <view v-if="skill.featured" class="sc-badge badge-gold">精选</view>
                  <view v-if="skill.isNew" class="sc-badge badge-blue">新发布</view>
                  <view v-if="skill.lowCost" class="sc-badge badge-green">低成本</view>
                  <view v-if="skill.highConsume" class="sc-badge badge-red">高消耗</view>
                  <view v-if="skill.stable" class="sc-badge badge-purple">输出稳定</view>
                  <view class="sc-scene-tag">{{ skill.scene }}</view>
                </view>

                <text class="sc-title">{{ skill.title }}</text>
                <view class="sc-prompt-row">
                  <text class="sc-prompt">{{ skill.promptPreview }}</text>
                </view>

                <!-- 图片九宫格 -->
                <view v-if="skill.images && skill.images.length" class="sc-imgs"
                  :class="`gi-${skill.images.length >= 3 ? (skill.images.length > 3 ? 'many' : 3) : skill.images.length}`">
                  <app-image v-for="(src, i) in skill.images.slice(0, 9)" :key="i" :src="src" class="sc-img"
                    mode="aspectFill" @tap.stop="previewImg(skill.images, i)" />
                </view>

                <view class="sc-tags">
                  <view v-for="tag in skill.tags.slice(0, 3)" :key="tag" class="sc-tag">
                    <text class="sc-tag-t">{{ tag }}</text>
                  </view>
                </view>

                <!-- 作者 + 操作 -->
                <view class="sc-foot">
                  <view class="sc-author-wrap" @tap.stop="toAuthor(skill.authorId)">
                    <view class="sc-av" :style="{ background: skill.authorColor }">
                      <text class="sc-av-t">{{ skill.author[0] }}</text>
                    </view>
                    <view class="sc-author-info">
                      <text class="sc-author-n">{{ skill.author }}</text>
                      <text class="sc-counts">{{ skill.copyCount }} 复制 · {{ skill.favoriteCount }} 收藏</text>
                    </view>
                  </view>
                  <view class="sc-actions">
                    <view class="sc-share-btn" @tap.stop="shareSkill(skill)">
                      <uni-icons type="redo" size="13" color="rgba(0,0,0,0.55)" />
                      <text class="sc-share-t">分享</text>
                    </view>
                    <view class="sc-copy-btn" @tap.stop="copySkill(skill)">
                      <text class="sc-copy-t">复制 Skill</text>
                    </view>
                  </view>
                </view>
              </view>
            </view>

            <view v-if="panel.skills.length === 0 && (panel.role === 'preview' || (!loading && !refreshing))"
              class="empty-state">
              <text class="empty-state-t">暂无 Skill</text>
            </view>
          </view>
        </view>

        <!-- 底部加载状态 -->
        <view class="load-footer">
          <view v-if="loading" class="load-ing">
            <text class="load-txt">加载中…</text>
          </view>
          <view v-else-if="noMore" class="no-more">
            <view class="no-more-line" />
            <text class="no-more-txt">没有更多了</text>
            <view class="no-more-line" />
          </view>
        </view>

        <view class="list-bottom" />
      </scroll-view>
    </view>

  </view>
</template>

<script setup lang="ts">
import { copySkill as copySkillApi, getSkillCategories, getSkillDetail, getSkillList } from '@/api/skill'
import AppImage from '@/components/app-image/index.vue'
import { useGuideStore, useUserStore } from '@/stores'
import { requireLogin } from '@/utils/auth-guard'
import { normalizeImageUrl } from '@/utils/image-url'
import { shareSkillItem } from '@/utils/share-skill'

const emit = defineEmits<{ edgeSwipe: [dir: 'left' | 'right'] }>()
const userStore = useUserStore()
const guideStore = useGuideStore()

const RECOMMEND_TAB_KEY = 'recommend'
const SCENE_TAB_PREFIX = 'scene:'
const SORT_TAB_ID_PREFIX = 'sort-tab-'

type SortTab = {
  key: string
  label: string
  viewId: string
}

const buildSceneTabKey = (scene: string) => `${SCENE_TAB_PREFIX}${scene}`
const parseSceneFromTabKey = (key: string) => key.startsWith(SCENE_TAB_PREFIX) ? key.slice(SCENE_TAB_PREFIX.length) : ''
const buildSortTabs = (scenes: string[]): SortTab[] => [
  { key: RECOMMEND_TAB_KEY, label: '推荐', viewId: `${SORT_TAB_ID_PREFIX}0` },
  ...scenes.map((scene, idx) => ({
    key: buildSceneTabKey(scene),
    label: scene,
    viewId: `${SORT_TAB_ID_PREFIX}${idx + 1}`
  }))
]

const sortTabs = ref(buildSortTabs([]))

const activeSort = ref(RECOMMEND_TAB_KEY)
const sortBarScrollIntoView = ref(`${SORT_TAB_ID_PREFIX}0`)

const SWIPE_X_THRESHOLD = 56
const SWIPE_LOCK_DISTANCE = 10
const SWIPE_LOCK_BIAS_X = 6
const HORIZONTAL_SWIPE_Y_LIMIT = 28
const SWIPE_MAX_DURATION = 1200
const SORT_TAP_MOVE_THRESHOLD = 8
const SORT_TAP_SUPPRESS_MS = 180
const EDGE_DAMPING = 0.28
const CAROUSEL_SWITCH_DURATION = 280
const CAROUSEL_REBOUND_DURATION = 220
const CAROUSEL_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

let touchStartX = 0
let touchStartY = 0
let touchStartAt = 0
let touching = false
let gestureSource: 'sort' | 'list' | '' = ''
let gestureLock: 'horizontal' | 'vertical' | '' = ''
let carouselTimer: ReturnType<typeof setTimeout> | null = null
let sortTabTouchStartX = 0
let sortTabTouchStartY = 0
let sortTabDragging = false
let sortTabSuppressUntil = 0

const screenWidth = ref(Math.max(uni.getSystemInfoSync().windowWidth || 375, 1))
const dragOffsetX = ref(0)
const swipeDirection = ref<'left' | 'right' | ''>('')
const previewSortKey = ref('')
const isCarouselAnimating = ref(false)

const getSortTabByKey = (key: string) => sortTabs.value.find((tab) => tab.key === key)
const syncSortBarToKey = (key: string) => {
  const targetId = getSortTabByKey(key)?.viewId
  if (!targetId) return
  sortBarScrollIntoView.value = targetId
}

const getSortIndex = (key: string) => sortTabs.value.findIndex(tab => tab.key === key)

const getAdjacentSortKey = (key: string, delta: number) => {
  const current = getSortIndex(key)
  if (current < 0) return ''
  const next = current + delta
  if (next < 0 || next >= sortTabs.value.length) return ''
  return sortTabs.value[next].key
}

const clearCarouselTimer = () => {
  if (carouselTimer) clearTimeout(carouselTimer)
  carouselTimer = null
}

const refresherEnabled = ref(true)
const pullTriggered = ref(false)

const enableRefresher = () => {
  if (!refresherEnabled.value) refresherEnabled.value = true
}

const disableRefresherForHorizontalSwipe = () => {
  if (refreshing.value || pullTriggered.value) return
  refresherEnabled.value = false
}

const resetGesture = () => {
  gestureSource = ''
  gestureLock = ''
  touchStartX = 0
  touchStartY = 0
  touchStartAt = 0
  enableRefresher()
}

const resetCarouselState = () => {
  dragOffsetX.value = 0
  swipeDirection.value = ''
  previewSortKey.value = ''
  isCarouselAnimating.value = false
  clearCarouselTimer()
}

const startReboundAnimation = () => {
  if (dragOffsetX.value === 0 && !previewSortKey.value) return
  clearCarouselTimer()
  isCarouselAnimating.value = true
  dragOffsetX.value = 0
  carouselTimer = setTimeout(() => {
    resetCarouselState()
  }, CAROUSEL_REBOUND_DURATION)
}

const startSwitchAnimation = (nextSortKey: string, dir: 'left' | 'right') => {
  if (!nextSortKey) return
  clearCarouselTimer()
  swipeDirection.value = dir
  previewSortKey.value = nextSortKey
  isCarouselAnimating.value = true
  dragOffsetX.value = dir === 'left' ? -screenWidth.value : screenWidth.value
  carouselTimer = setTimeout(() => {
    activeSort.value = nextSortKey
    resetCarouselState()
  }, CAROUSEL_SWITCH_DURATION)
}

const updateDragState = (dx: number) => {
  const clampedDx = Math.max(-screenWidth.value, Math.min(screenWidth.value, dx))
  const dir: 'left' | 'right' = dx < 0 ? 'left' : 'right'
  const nextSortKey = getAdjacentSortKey(activeSort.value, dir === 'left' ? 1 : -1)
  swipeDirection.value = dir
  previewSortKey.value = nextSortKey
  isCarouselAnimating.value = false
  dragOffsetX.value = nextSortKey ? clampedDx : clampedDx * EDGE_DAMPING
}

const onGestureStart = (e: any, source: 'sort' | 'list') => {
  const touch = e.touches?.[0]
  if (!touch) return
  touching = true
  enableRefresher()
  gestureSource = source
  gestureLock = ''
  touchStartX = touch.clientX
  touchStartY = touch.clientY
  touchStartAt = Date.now()
  clearCarouselTimer()
  isCarouselAnimating.value = false
}

const onGestureMove = (e: any) => {
  if (!touching) return
  const touch = e.touches?.[0]
  if (!touch) return

  const dx = touch.clientX - touchStartX
  const dy = touch.clientY - touchStartY
  const absX = Math.abs(dx)
  const absY = Math.abs(dy)

  if (!gestureLock) {
    if (absX < SWIPE_LOCK_DISTANCE && absY < SWIPE_LOCK_DISTANCE) return
    gestureLock = absX > (absY + SWIPE_LOCK_BIAS_X) ? 'horizontal' : 'vertical'
    if (gestureLock === 'horizontal') disableRefresherForHorizontalSwipe()
  }

  if (gestureLock !== 'horizontal') return
  if (absY > HORIZONTAL_SWIPE_Y_LIMIT) {
    gestureLock = 'vertical'
    startReboundAnimation()
    enableRefresher()
    return
  }

  if (typeof e.preventDefault === 'function') e.preventDefault()
  updateDragState(dx)
}

const onGestureEnd = (e: any, source: 'sort' | 'list') => {
  if (!touching) return
  touching = false

  const touch = e.changedTouches?.[0]
  if (!touch) {
    startReboundAnimation()
    resetGesture()
    return
  }

  const dx = touch.clientX - touchStartX
  const dy = touch.clientY - touchStartY
  const dt = Date.now() - touchStartAt
  const isHorizontal = gestureLock === 'horizontal' || Math.abs(dx) > Math.abs(dy)
  const passedThreshold = Math.abs(dx) > SWIPE_X_THRESHOLD && Math.abs(dy) < HORIZONTAL_SWIPE_Y_LIMIT
  const inDuration = dt <= SWIPE_MAX_DURATION

  if (isHorizontal && passedThreshold && inDuration) {
    const dir: 'left' | 'right' = dx < 0 ? 'left' : 'right'
    const nextSortKey = getAdjacentSortKey(activeSort.value, dir === 'left' ? 1 : -1)
    if (nextSortKey) {
      startSwitchAnimation(nextSortKey, dir)
    } else {
      startReboundAnimation()
      if (source || gestureSource) emit('edgeSwipe', dir)
    }
  } else {
    startReboundAnimation()
  }

  resetGesture()
}

const onGestureCancel = () => {
  touching = false
  startReboundAnimation()
  resetGesture()
}

const onListGestureStart = (e: any) => { onGestureStart(e, 'list') }
const onListGestureMove = (e: any) => { onGestureMove(e) }
const onListGestureEnd = (e: any) => { onGestureEnd(e, 'list') }

const onSortTabTouchStart = (e: any) => {
  const touch = e?.touches?.[0]
  if (!touch) return
  sortTabTouchStartX = touch.clientX
  sortTabTouchStartY = touch.clientY
  sortTabDragging = false
}

const onSortTabTouchMove = (e: any) => {
  const touch = e?.touches?.[0]
  if (!touch) return
  const dx = Math.abs(touch.clientX - sortTabTouchStartX)
  const dy = Math.abs(touch.clientY - sortTabTouchStartY)
  if (dx > SORT_TAP_MOVE_THRESHOLD || dy > SORT_TAP_MOVE_THRESHOLD) {
    sortTabDragging = true
    sortTabSuppressUntil = Date.now() + SORT_TAP_SUPPRESS_MS
  }
}

const onSortTabTap = (key: string) => {
  if (sortTabDragging || Date.now() < sortTabSuppressUntil) return
  setSort(key)
}

const setSort = (key: string) => {
  if (key === activeSort.value) return
  resetCarouselState()
  activeSort.value = key
}

const FEED_PUBLISHED_KEY = 'skill_feed_published_v1'

const skills = ref<any[]>([])
const refreshing = ref(false)
const loading = ref(false)
const noMore = ref(false)
const page = ref(1)
const PAGE_SIZE = 10
const showSkeleton = computed(() => refreshing.value && skills.value.length === 0)
const PULL_REFRESH_MIN_DURATION = 260
const PULL_REFRESH_RELEASE_DELAY = 80

let pullTriggeredAt = 0
let pullTriggeredSeq = 0

const wait = (ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms) })

const markPullTriggered = () => {
  pullTriggeredSeq += 1
  pullTriggeredAt = Date.now()
  pullTriggered.value = true
  enableRefresher()
  return pullTriggeredSeq
}

const settlePullTriggered = async (seq: number) => {
  if (!pullTriggered.value) return
  const elapsed = Date.now() - pullTriggeredAt
  if (elapsed < PULL_REFRESH_MIN_DURATION) {
    await wait(PULL_REFRESH_MIN_DURATION - elapsed)
  }
  await wait(PULL_REFRESH_RELEASE_DELAY)
  if (seq !== pullTriggeredSeq) return
  pullTriggered.value = false
}

const formatCount = (value: number | null | undefined) => {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n) || n <= 0) return '0'
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`
  return `${Math.round(n)}`
}

const formatToken = (value: number | null | undefined) => {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n) || n <= 0) return '--'
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return `${Math.round(n)}`
}

const formatRate = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '--'
  return `${Number(value).toFixed(0)}%`
}

const modelColor = (modelName: string) => {
  const val = modelName.toLowerCase()
  if (val.includes('claude')) return '#C7A06A'
  if (val.includes('gpt')) return '#2F8A57'
  if (val.includes('deepseek')) return '#5E738A'
  if (val.includes('gemini')) return '#D6943A'
  return '#5B5BD6'
}

const normalizePlainText = (value: unknown) => `${value ?? ''}`
  .replace(/<[^>]*>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeUsageModelName = (value: unknown): string => {
  const modelName = `${value ?? ''}`.trim()
  if (!modelName || modelName === '--' || modelName === '未知模型') return ''
  return modelName
}

const buildPromptPreview = (item: any, fallback: string) => {
  const promptRaw = item?.promptPreview ?? item?.fullPrompt ?? item?.content?.fullPrompt
  const promptText = normalizePlainText(promptRaw)
  if (promptText) return promptText
  return normalizePlainText(fallback)
}

const mapApiSkill = (item: any) => {
  const copyCountNum = Number(item?.copyCount ?? item?.stats?.copyCount ?? 0)
  const tokenNum = Number(item?.avgTotalTokens ?? item?.tokenInfo?.avgTotalTokens ?? 0)
  const rateNum = Number(item?.successRate ?? item?.stats?.successRate ?? 0)
  const title = `${item?.title || '未命名 Skill'}`
  const creatorName = `${item?.creator?.nickname || '匿名用户'}`
  const scene = `${item?.scene || '其他'}`

  const feedbackCountNum = Number(item?.feedbackCount ?? item?.stats?.feedbackCount ?? 0)
  const publishAtRaw = item?.publishAt ?? item?.publish_at ?? item?.createdAt ?? ''
  const publishAtTime = publishAtRaw ? new Date(publishAtRaw).getTime() : 0
  const isNew = Number.isFinite(publishAtTime) && publishAtTime > 0 && (Date.now() - publishAtTime) < 7 * 24 * 60 * 60 * 1000
  const summary = normalizePlainText(item?.summary ?? item?.brief)
  const promptPreview = buildPromptPreview(item, summary || title)
  const modelName = `${item?.modelName ?? item?.tokenInfo?.recommendedModelName ?? item?.tokenInfo?.commonModelName ?? '--'}`
  const tags = Array.isArray(item?.tags)
    ? item.tags
    : (Array.isArray(item?.useScenes) ? item.useScenes : [])
  const coverImageUrl = item?.coverImage || (Array.isArray(item?.images?.cover) ? item.images.cover[0] : '')

  return {
    id: `${item?.id}`,
    title,
    summary,
    promptPreview,
    scene,
    tags,
    avgToken: formatToken(tokenNum),
    model: modelName,
    modelColor: modelColor(modelName),
    successRate: formatRate(rateNum),
    copyCount: formatCount(copyCountNum),
    favoriteCount: formatCount(Number(item?.favoriteCount ?? item?.stats?.favoriteCount ?? 0)),
    author: creatorName,
    authorId: `${item?.creator?.id || ''}`,
    authorColor: `${item?.creator?.displayColor || '#5B5BD6'}`,
    featured: item?.featured === true,
    isNew,
    lowCost: tokenNum > 0 && tokenNum < 1200,
    highConsume: tokenNum > 8000,
    stable: rateNum >= 90 && feedbackCountNum >= 3,
    images: coverImageUrl ? [normalizeImageUrl(`${coverImageUrl}`)] : [],
  }
}

const currentSceneFromTab = computed(() => parseSceneFromTabKey(activeSort.value))

const loadSkillsFromApi = async (reset = false) => {
  const targetPage = reset ? 1 : page.value

  const data = await getSkillList({
    page: targetPage,
    pageSize: PAGE_SIZE,
    sort: RECOMMEND_TAB_KEY as any,
    scene: currentSceneFromTab.value || undefined
  })

  const list = Array.isArray(data?.list) ? data.list.map(mapApiSkill) : []
  const totalPages = Number(data?.pagination?.totalPages ?? 0)

  if (reset) skills.value = list
  else skills.value.push(...list)

  noMore.value = totalPages > 0 ? targetPage >= totalPages : list.length < PAGE_SIZE
  page.value = noMore.value ? targetPage : targetPage + 1
}

// 把刚发布的 skill 注入到列表顶部（24h 内有效）
const injectPublishedSkill = () => {
  const published = uni.getStorageSync(FEED_PUBLISHED_KEY)
  if (!published?.id) return
  if (Date.now() - (published.publishedAt || 0) > 24 * 60 * 60 * 1000) return
  if (skills.value.find((s: any) => s.id === published.id)) return
  skills.value.unshift(published)
}

const onRefresh = async (isPull = false) => {
  if (isPull) markPullTriggered()
  if (refreshing.value) return

  resetCarouselState()
  refreshing.value = true

  try {
    await loadSkillsFromApi(true)
    injectPublishedSkill()
  } catch {
    console.error('[skill-feed] refresh failed')
    uni.showToast({ title: 'Skill 列表加载失败', icon: 'none' })
  }

  refreshing.value = false
  const settleSeq = pullTriggeredSeq
  await settlePullTriggered(settleSeq)
  enableRefresher()
}

const onPullRefresh = () => {
  void onRefresh(true)
}

const onRefresherRestore = () => {
  pullTriggeredSeq += 1
  pullTriggered.value = false
  enableRefresher()
}

onMounted(() => {
  void onRefresh()
  getSkillCategories().then(cats => {
    if (Array.isArray(cats) && cats.length > 0) {
      const nextScenes = cats
        .map((c) => `${c?.name || ''}`.trim())
        .filter(Boolean)
      if (!nextScenes.length) return

      sortTabs.value = buildSortTabs(nextScenes)
      if (!sortTabs.value.some(tab => tab.key === activeSort.value)) {
        activeSort.value = RECOMMEND_TAB_KEY
      }
      syncSortBarToKey(activeSort.value)
    }
  }).catch(() => { })
})

defineExpose({ refreshPublished: injectPublishedSkill })

const onLoadMore = async () => {
  if (refreshing.value || loading.value || noMore.value) return
  loading.value = true

  try {
    await loadSkillsFromApi(false)
  } catch {
    console.error('[skill-feed] load more failed')
    uni.showToast({ title: '加载更多失败', icon: 'none' })
  }

  loading.value = false
}

watch(activeSort, () => {
  syncSortBarToKey(activeSort.value)
  if (refreshing.value) return
  if (loading.value) return
  void onRefresh()
})

const copySkill = async (skill: any) => {
  if (!requireLogin(userStore.token, '复制 Skill')) return

  let copyText = ''
  try {
    const detail = await getSkillDetail(skill.id)
    copyText = normalizePlainText(detail?.content?.fullPrompt)
  } catch { }

  if (!copyText) {
    copyText = normalizePlainText(skill?.promptPreview ?? skill?.summary ?? '')
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
    const modelName = normalizeUsageModelName(skill?.model ?? skill?.modelName)
    await copySkillApi(
      skill.id,
      modelName
        ? { sourceChannel: 'feed', usage: { modelName } }
        : { sourceChannel: 'feed' }
    )
  } catch {
    // ignore API record error in UI action
  }
  guideStore.markFirstSkillCopy()
  uni.showToast({ title: '已复制 Skill', icon: 'success' })
}
const shareSkill = async (skill: any) => {
  await shareSkillItem({
    id: skill.id,
    title: skill.title,
    summary: skill.summary,
    imageUrl: Array.isArray(skill.images) ? skill.images[0] : null,
  })
}
const toSkill = (id: string) => uni.navigateTo({ url: `/pages/detail/skill?id=${id}` })
const toAuthor = (id: string) => {
  if (!id) return
  uni.navigateTo({ url: `/pages/author/index?id=${id}` })
}
const toSearch = () => uni.navigateTo({ url: '/pages/search/index' })
const previewImg = (images: string[], current: number) => uni.previewImage({ urls: images, current: images[current] })

const parseMetricNumber = (value: string) => {
  const raw = String(value).trim().toLowerCase()
  if (!raw) return 0
  const num = Number.parseFloat(raw.replace(/[^0-9.]/g, ''))
  if (!Number.isFinite(num)) return 0
  if (raw.includes('k')) return num * 1000
  if (raw.includes('m')) return num * 1000 * 1000
  return num
}

const parseRate = (value: string) => parseMetricNumber(value)
const parseToken = (value: string) => parseMetricNumber(value)
const parseCount = (value: string) => parseMetricNumber(value)
const parseSkillId = (id: string) => Number.parseInt(String(id).replace(/[^0-9]/g, ''), 10) || 0

const byRecommend = (a: any, b: any) => {
  const featured = Number(b.featured) - Number(a.featured)
  if (featured !== 0) return featured
  const stable = Number(b.stable) - Number(a.stable)
  if (stable !== 0) return stable
  const rate = parseRate(b.successRate) - parseRate(a.successRate)
  if (rate !== 0) return rate
  return parseCount(b.copyCount) - parseCount(a.copyCount)
}

const byNewest = (a: any, b: any) => {
  const isNew = Number(b.isNew) - Number(a.isNew)
  if (isNew !== 0) return isNew
  return parseSkillId(b.id) - parseSkillId(a.id)
}

const byMostCopy = (a: any, b: any) => parseCount(b.copyCount) - parseCount(a.copyCount)
const byLowestToken = (a: any, b: any) => parseToken(a.avgToken) - parseToken(b.avgToken)

const byBestValue = (a: any, b: any) => {
  const score = (skill: any) => {
    const token = Math.max(parseToken(skill.avgToken), 1)
    const rate = parseRate(skill.successRate)
    const copy = parseCount(skill.copyCount)
    const stableBonus = skill.stable ? 1.05 : 1
    return (rate * copy * stableBonus) / token
  }
  return score(b) - score(a)
}

const byHighRate = (a: any, b: any) => {
  const rate = parseRate(b.successRate) - parseRate(a.successRate)
  if (rate !== 0) return rate
  return parseCount(b.copyCount) - parseCount(a.copyCount)
}

const sortSkillList = (list: any[], sortKey: string = activeSort.value) => {
  const sorted = [...list]
  if (sortKey === 'newest') return sorted.sort(byNewest)
  if (sortKey === 'mostCopy') return sorted.sort(byMostCopy)
  if (sortKey === 'lowestToken') return sorted.sort(byLowestToken)
  if (sortKey === 'bestValue') return sorted.sort(byBestValue)
  if (sortKey === 'highRate') return sorted.sort(byHighRate)
  return sorted.sort(byRecommend)
}

const filteredSkills = computed(() => {
  return skills.value
})

const getDisplaySkillsBySort = (sortKey: string) => sortSkillList(filteredSkills.value, sortKey)
const displaySkills = computed(() => getDisplaySkillsBySort(activeSort.value))
const previewSkills = computed(() => previewSortKey.value ? getDisplaySkillsBySort(previewSortKey.value) : [])

const carouselPanels = computed(() => {
  const panels: Array<{ key: string; role: 'current' | 'preview'; skills: any[] }> = [
    { key: `current-${activeSort.value}`, role: 'current', skills: displaySkills.value },
  ]

  if (previewSortKey.value) {
    panels.push({
      key: `preview-${previewSortKey.value}`,
      role: 'preview',
      skills: previewSkills.value,
    })
  }

  return panels
})

const swipeProgress = computed(() => {
  return Math.min(Math.abs(dragOffsetX.value) / Math.max(screenWidth.value, 1), 1)
})

const carouselTransition = computed(() => {
  const duration = dragOffsetX.value === 0 ? CAROUSEL_REBOUND_DURATION : CAROUSEL_SWITCH_DURATION
  return `transform ${duration}ms ${CAROUSEL_EASE}, opacity ${duration}ms ease`
})

const currentPaneStyle = computed(() => {
  const scale = 1 - (swipeProgress.value * 0.06)
  const opacity = 1 - (swipeProgress.value * 0.28)
  return {
    transform: `translate3d(${dragOffsetX.value}px, 0, 0) scale(${scale.toFixed(3)})`,
    opacity: opacity.toFixed(3),
    transition: isCarouselAnimating.value ? carouselTransition.value : 'none',
  }
})

const previewPaneStyle = computed(() => {
  if (!previewSortKey.value || !swipeDirection.value) {
    return {
      transform: `translate3d(${screenWidth.value}px, 0, 0) scale(0.96)`,
      opacity: '0',
      transition: 'none',
    }
  }

  const baseX = swipeDirection.value === 'left' ? screenWidth.value : -screenWidth.value
  const x = baseX + dragOffsetX.value
  const scale = 0.94 + (swipeProgress.value * 0.06)
  const opacity = Math.min(1, swipeProgress.value * 1.15)
  return {
    transform: `translate3d(${x}px, 0, 0) scale(${scale.toFixed(3)})`,
    opacity: opacity.toFixed(3),
    transition: isCarouselAnimating.value ? carouselTransition.value : 'none',
  }
})

const getPaneStyle = (role: 'current' | 'preview') => {
  return role === 'current' ? currentPaneStyle.value : previewPaneStyle.value
}

onUnmounted(() => {
  clearCarouselTimer()
})
</script>

<style lang="scss" scoped>
.root {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-secondary);
  position: relative;
}

/* ── 搜索栏 ── */
.top-bar {
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx 12rpx;
  background: #fff;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.05);
  flex-shrink: 0;

  .search-wrap {
    flex: 1;
    height: 72rpx;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 36rpx;
    display: flex;
    align-items: center;
    gap: 10rpx;
    padding: 0 24rpx;

    .search-ph {
      font-size: 24rpx;
      color: rgba(0, 0, 0, 0.30);
    }
  }
}

/* ── 排序 Tab ── */
.sort-bar {
  flex-shrink: 0;
  background: #fff;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.05);

  .sort-row {
    display: flex;
    padding: 0 16rpx;
    gap: 4rpx;
    width: max-content;
  }

  .sort-tab {
    padding: 18rpx 20rpx;
    position: relative;
    flex-shrink: 0;

    .sort-tab-t {
      font-size: 24rpx;
      color: rgba(0, 0, 0, 0.40);
      font-weight: 500;
    }

    &.active {
      .sort-tab-t {
        color: var(--orange-color);
        font-weight: 700;
      }

      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 20rpx;
        right: 20rpx;
        height: 4rpx;
        background: var(--orange-color);
        border-radius: 999rpx;
      }
    }
  }
}

/* ── 列表 ── */
.list-outer {
  flex: 1;
  height: 0;
  display: flex;
  flex-direction: column;
}

.list-scroll {
  flex: 1;
  height: 0;
  overflow: hidden;
}

.carousel-stage {
  position: relative;
  overflow: hidden;
}

.carousel-pane {
  will-change: transform, opacity;
}

.pane-current {
  position: relative;
  z-index: 1;
}

.pane-preview {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}

.skill-list {
  padding: 20rpx 24rpx 0;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.skill-skeleton-list {
  .sk-skill-card {
    .sc-scene-tag {
      margin-left: auto;
    }
  }
}

.sk-block {
  border-radius: 12rpx;
  background: linear-gradient(100deg, #eef1f5 20%, #f7f8fa 38%, #eef1f5 56%);
  background-size: 200% 100%;
  animation: skShimmer 1.25s linear infinite;
}

.sk-line {
  height: 24rpx;
}

.sk-chip {
  width: 90rpx;
  height: 28rpx;
  border-radius: 8rpx;
}

.sk-chip-right {
  width: 80rpx;
}

.sk-tag {
  width: 96rpx;
  height: 32rpx;
  border-radius: 8rpx;
  background: rgba(0, 0, 0, 0.08);
}

.sk-pill {
  width: 150rpx;
  height: 56rpx;
  border-radius: 100rpx;
}

.sk-pill-sm {
  width: 110rpx;
}

.sk-w-92 {
  width: 92%;
}

.sk-w-80 {
  width: 80%;
}

.sk-w-68 {
  width: 68%;
}

.sk-w-46 {
  width: 46%;
}

.sk-w-30 {
  width: 30%;
}

.mt-12 {
  margin-top: 12rpx;
}

.mt-10 {
  margin-top: 10rpx;
}

.sk-img-row {
  display: flex;
  gap: 4rpx;
  margin-top: 18rpx;
}

.sk-img {
  width: calc(33.33% - 3rpx);
  height: 190rpx;
  border-radius: 10rpx;
}

.empty-state {
  display: flex;
  justify-content: center;
  padding: 72rpx 24rpx 20rpx;

  .empty-state-t {
    font-size: 24rpx;
    color: var(--text-muted);
  }
}

.skill-card {
  background: #fff;
  border-radius: 28rpx;
  border: 1rpx solid rgba(0, 0, 0, 0.06);
  padding: 28rpx;

  &:active {
    background: var(--card-bg-hover);
  }

  .sc-badge-row {
    display: flex;
    align-items: center;
    gap: 10rpx;
    margin-bottom: 18rpx;
    flex-wrap: wrap;

    .sc-badge {
      font-size: 18rpx;
      font-weight: 600;
      padding: 4rpx 14rpx;
      border-radius: 8rpx;

      &.badge-gold {
        color: var(--yellow-color);
        background: rgba(214, 148, 58, 0.12);
      }

      &.badge-blue {
        color: var(--blue-color);
        background: rgba(94, 115, 138, 0.12);
      }

      &.badge-green {
        color: var(--green-color);
        background: rgba(47, 138, 87, 0.12);
      }

      &.badge-red {
        color: var(--red-color);
        background: rgba(200, 70, 52, 0.12);
      }

      &.badge-purple {
        color: #7C3AED;
        background: rgba(124, 58, 237, 0.10);
      }
    }

    .sc-scene-tag {
      margin-left: auto;
      font-size: 20rpx;
      color: rgba(0, 0, 0, 0.40);
      background: rgba(0, 0, 0, 0.06);
      padding: 4rpx 14rpx;
      border-radius: 8rpx;
    }
  }

  .sc-title {
    display: block;
    font-size: 30rpx;
    font-weight: 800;
    color: var(--text-color);
    margin-bottom: 12rpx;
    line-height: 1.35;
  }

  .sc-prompt-row {
    display: block;
    margin-bottom: 18rpx;
  }

  .sc-prompt {
    flex: 1;
    min-width: 0;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    font-size: 24rpx;
    color: rgba(0, 0, 0, 0.50);
    line-height: 1.65;
    word-break: break-all;
  }

  .sc-imgs {
    display: flex;
    flex-wrap: wrap;
    margin-bottom: 18rpx;

    &.gi-1 .sc-img {
      width: 100%;
      height: 340rpx;
      border-radius: 16rpx;
    }

    &.gi-2 {
      gap: 4rpx;

      .sc-img {
        width: calc(50% - 2rpx);
        height: 220rpx;
        border-radius: 12rpx;
      }
    }

    &.gi-3,
    &.gi-many {
      gap: 4rpx;

      .sc-img {
        width: calc(33.33% - 3rpx);
        height: 190rpx;
        border-radius: 10rpx;
      }
    }
  }

  .sc-tags {
    display: flex;
    gap: 10rpx;
    margin-bottom: 20rpx;

    .sc-tag {
      background: rgba(0, 0, 0, 0.05);
      padding: 6rpx 16rpx;
      border-radius: 8rpx;
    }

    .sc-tag-t {
      font-size: 20rpx;
      color: rgba(0, 0, 0, 0.50);
    }
  }

  .sc-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16rpx;

    .sc-author-wrap {
      display: flex;
      align-items: center;
      gap: 12rpx;
      flex: 1;
      min-width: 0;
    }

    .sc-av {
      width: 44rpx;
      height: 44rpx;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      .sc-av-t {
        font-size: 18rpx;
        color: #fff;
        font-weight: 700;
      }
    }

    .sc-author-info {
      display: flex;
      flex-direction: column;
      gap: 4rpx;
      min-width: 0;
    }

    .sc-author-n {
      font-size: 22rpx;
      color: rgba(0, 0, 0, 0.60);
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .sc-counts {
      font-size: 18rpx;
      color: rgba(0, 0, 0, 0.35);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .sc-actions {
      display: flex;
      align-items: center;
      gap: 12rpx;
      flex-shrink: 0;
    }

    .sc-share-btn {
      background: rgba(0, 0, 0, 0.06);
      border: 1rpx solid rgba(0, 0, 0, 0.08);
      padding: 14rpx 24rpx;
      border-radius: 100rpx;
      display: flex;
      align-items: center;
      gap: 6rpx;

      .sc-share-t {
        font-size: 22rpx;
        color: rgba(0, 0, 0, 0.62);
        font-weight: 600;
      }
    }

    .sc-copy-btn {
      background: var(--orange-color);
      padding: 16rpx 32rpx;
      border-radius: 100rpx;
      box-shadow: 0 4rpx 16rpx rgba(228, 92, 26, 0.18);
      flex-shrink: 0;

      .sc-copy-t {
        font-size: 24rpx;
        color: #fff;
        font-weight: 700;
      }
    }
  }
}

/* ── 加载状态 ── */
.load-footer {
  display: flex;
  justify-content: center;
  padding: 20rpx 0 12rpx;

  .load-txt {
    font-size: 24rpx;
    color: var(--text-muted);
  }

  .no-more {
    display: flex;
    align-items: center;
    gap: 20rpx;

    .no-more-line {
      flex: 1;
      max-width: 80rpx;
      height: 1rpx;
      background: var(--border-light);
    }

    .no-more-txt {
      font-size: 22rpx;
      color: var(--border-lighter);
      white-space: nowrap;
    }
  }
}

.list-bottom {
  height: calc(160rpx + env(safe-area-inset-bottom));
}

@keyframes skShimmer {
  from {
    background-position: 200% 0;
  }

  to {
    background-position: -40% 0;
  }
}
</style>
