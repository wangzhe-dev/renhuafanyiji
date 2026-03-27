<template>
  <view class="root">

    <scroll-view
      class="scroll"
      scroll-y
      :show-scrollbar="false"
      refresher-enabled
      refresher-default-style="black"
      :refresher-triggered="refreshing"
      lower-threshold="100"
      @refresherrefresh="onRefresh"
      @scrolltolower="onLoadMore"
    >
      <slot name="header" />

      <view v-if="showSkeleton" class="feed-wrap feed-skeleton-wrap">
        <view v-for="n in 4" :key="`post-skeleton-${n}`" class="post-card sk-post-card">
          <view class="pc-hd">
            <view class="pc-av sk-block sk-av" />
            <view class="pc-info">
              <view class="sk-block sk-line sk-w-44" />
              <view class="sk-block sk-line sk-w-26" />
            </view>
          </view>
          <view class="pc-body">
            <view class="sk-block sk-line sk-w-96" />
            <view class="sk-block sk-line sk-w-82" />
          </view>
          <view class="sk-img-grid">
            <view v-for="idx in 3" :key="`post-sk-img-${n}-${idx}`" class="sk-block sk-img" />
          </view>
          <view class="pc-meta-row">
            <view class="sk-block sk-line sk-w-40" />
            <view class="sk-block sk-pill" />
          </view>
          <view class="pc-acts">
            <view class="sk-block sk-pill sk-w-24" />
            <view class="pc-act-grp">
              <view class="sk-block sk-icon" />
              <view class="sk-block sk-icon" />
              <view class="sk-block sk-icon" />
            </view>
          </view>
        </view>
      </view>

      <view class="feed-wrap">
        <view v-for="(item, idx) in posts" :key="item.id" class="feed-entry">
          <view class="post-card" @tap="toPost(item.id)">

          <!-- 作者行 -->
          <view class="pc-hd">
            <view class="pc-av" :style="{ background: item.authorColor }" @tap.stop="toAuthor(item.authorId)">
              <text class="pc-av-t">{{ item.author[0] }}</text>
            </view>
            <view class="pc-info" @tap.stop="toAuthor(item.authorId)">
              <view class="pc-name-row">
                <text class="pc-name">{{ item.author }}</text>
                <view class="pc-model">
                  <view class="pc-dot" />
                  <text class="pc-model-t">{{ item.model }}</text>
                </view>
              </view>
              <text class="pc-time">{{ item.time }}</text>
            </view>
            <view
              class="pc-rxn-pill"
              :class="{ 'rxn-active': item.reaction, 'rxn-editable': item.isMine }"
              :style="item.reaction
                ? { background: reactions.find((r:any) => r.key === item.reaction)?.bgColor,
                    color: reactions.find((r:any) => r.key === item.reaction)?.activeColor }
                : {}"
              @tap.stop="item.isMine ? showReactions(item) : undefined"
            >
              <uni-icons
                class="pc-rxn-icon"
                :type="item.reaction ? (reactions.find((r:any) => r.key === item.reaction)?.icon || 'info') : 'info'"
                size="13"
                :color="item.reaction ? reactions.find((r:any)=> r.key === item.reaction)?.activeColor : '#9CA3AF'"
              />
              <text class="pc-rxn-t">
                {{ item.reaction ? reactions.find((r:any) => r.key === item.reaction)?.text : '未标记' }}
              </text>
              <uni-icons
                v-if="item.isMine"
                type="bottom"
                size="10"
                :color="item.reaction ? reactions.find((r:any)=> r.key === item.reaction)?.activeColor : '#9CA3AF'"
              />
            </view>
          </view>

          <!-- 正文 -->
          <text class="pc-body">{{ item.content }}</text>

          <view v-if="item.skillId" class="pc-skill" @tap.stop="toSkill(item.skillId)">
            <text class="pc-skill-label">Skill</text>
            <text class="pc-skill-title line-1">{{ item.skillTitle }}</text>
            <text v-if="item.skillScene" class="pc-skill-scene">{{ item.skillScene }}</text>
          </view>

          <!-- 图片九宫格 -->
          <view
            v-if="item.images && item.images.length"
            class="pc-imgs"
            :class="`gi-${item.images.length >= 3 ? (item.images.length > 3 ? 'many' : 3) : item.images.length}`"
          >
            <app-image
              v-for="(src, i) in item.images.slice(0, 9)" :key="i"
              :src="src" class="pc-img" mode="aspectFill"
              @tap.stop="previewImg(item.images, i)"
            />
          </view>

          <!-- 花费 + 操作（单行） -->
          <view class="pc-bottom-row">
            <view class="pc-cost-judge">
              <view class="pc-cost-inline">
                <text class="pc-cost-main">花费</text>
                <text class="pc-cost-main">{{ item.costText }}</text>
                <text class="pc-token-text">{{ item.tokensText }}</text>
                <view class="pc-token-tip" @tap.stop="showTokenHint(item)">
                  <uni-icons type="info" size="13" color="#9CA3AF" />
                </view>
              </view>
            </view>

            <view class="pc-act-grp">
              <view class="pc-act pc-meoo-icon" @tap.stop="toggleMeoo(item)">
                <uni-icons type="hand-up" size="15" :color="item.myMeoo ? '#FF7A45' : '#9CA3AF'" />
              </view>
              <view class="pc-act" @tap.stop="toggleLike(item)">
                <uni-icons :type="item.liked ? 'heart-filled' : 'heart'" size="15" :color="item.liked ? '#E45C1A' : '#9CA3AF'" />
                <text class="pc-act-n" :style="item.liked ? { color: '#E45C1A' } : {}">{{ item.likes }}</text>
              </view>
              <view class="pc-act" @tap.stop="toPost(item.id)">
                <uni-icons type="chat" size="15" color="#9CA3AF" />
                <text class="pc-act-n">{{ item.comments }}</text>
              </view>
            </view>
          </view>

          </view>

          <view
            v-if="bridgeVisible && (idx + 1) % BRIDGE_INTERVAL === 0"
            class="bridge-card"
          >
            <view class="bridge-main" @tap="openSkillFromBridge">
              <text class="bridge-text">看完消耗想上手？去 Skill 区直接复用现成提示词。</text>
            </view>
            <text class="bridge-link" @tap="openSkillFromBridge">去 Skill 区</text>
            <view class="bridge-close" @tap="dismissBridge">
              <uni-icons type="closeempty" size="14" color="rgba(0,0,0,0.45)" />
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-if="!loading && !refreshing && posts.length === 0" class="empty-state">
        <text class="empty-txt">还没有人分享消耗记录</text>
        <text class="empty-sub">快来第一个分享吧</text>
      </view>

      <!-- 底部加载状态 -->
      <view class="load-footer">
        <view v-if="loading" class="load-ing">
          <text class="load-txt">加载中…</text>
        </view>
        <view v-else-if="noMore && posts.length > 0" class="no-more">
          <view class="no-more-line" />
          <text class="no-more-txt">没有更多了</text>
          <view class="no-more-line" />
        </view>
      </view>

      <view class="feed-bottom" />
    </scroll-view>

    <!-- 情绪反应弹层（在 scroll-view 外，fixed 定位才正确） -->
    <view v-if="rxnTarget" class="rxn-mask" @tap="rxnTarget = null">
      <view class="rxn-sheet" @tap.stop>
        <text class="rxn-sheet-title">这次值不值</text>
        <view class="rxn-options">
          <view
            v-for="r in reactions" :key="r.key"
            class="rxn-opt"
            :class="{ 'rxn-opt-on': rxnTarget.reaction === r.key }"
            :style="rxnTarget.reaction === r.key ? { background: r.bgColor, borderColor: r.borderColor } : {}"
            @tap="pickReaction(r.key)"
          >
            <uni-icons class="rxn-opt-icon" :type="r.icon" size="24" :color="rxnTarget.reaction === r.key ? r.activeColor : '#9CA3AF'" />
            <text class="rxn-opt-t" :style="rxnTarget.reaction === r.key ? { color: r.activeColor } : {}">{{ r.text }}</text>
          </view>
        </view>
      </view>
    </view>

  </view>
</template>

<script setup lang="ts">
import type { FeedItem, FeedReaction } from '@/api/feed'
import { getFeed, likeFeedPost, meooFeedPost, unlikeFeedPost, unmeooFeedPost, updateFeedReaction } from '@/api/feed'
import AppImage from '@/components/app-image/index.vue'
import { useUserStore } from '@/stores'
import { requireLogin } from '@/utils/auth-guard'
import { normalizeImageUrl } from '@/utils/image-url'

const emit = defineEmits<{ goSkill: [] }>()

const reactions = [
  { key: 'worth', icon: 'checkmarkempty', text: '超值', activeColor: '#2F8A57', bgColor: 'rgba(47,138,87,0.09)', borderColor: 'rgba(47,138,87,0.22)' },
  { key: 'ok', icon: 'info', text: '可接受', activeColor: '#5B5BD6', bgColor: 'rgba(91,91,214,0.09)', borderColor: 'rgba(91,91,214,0.22)' },
  { key: 'regret', icon: 'clear', text: '偏亏', activeColor: '#C84634', bgColor: 'rgba(200,70,52,0.09)', borderColor: 'rgba(200,70,52,0.22)' },
  { key: 'addicted', icon: 'fire-filled', text: '上头', activeColor: '#FF7A45', bgColor: 'rgba(255,122,69,0.09)', borderColor: 'rgba(255,122,69,0.22)' },
]

// ── 数据格式化工具 ──
const formatTime = (isoStr: string): string => {
  const now = Date.now()
  const ts = new Date(isoStr).getTime()
  const diff = now - ts
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}小时前`
  if (diff < 172_800_000) return '昨天'
  const d = new Date(isoStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

const formatCost = (amount: string | null, currency: string): string => {
  if (amount === null || amount === undefined || `${amount}` === '') return '--'
  const n = Number.parseFloat(`${amount}`)
  if (!Number.isFinite(n)) return '--'
  const code = `${currency || 'CNY'}`.toUpperCase()
  if (code === 'CNY') return `¥${n.toFixed(2)}`
  if (code === 'USD') return `$${n.toFixed(4)}`
  return `${code} ${n.toFixed(4)}`
}

const formatTokens = (total: number | null): string => {
  if (total === null || total === undefined) return '--'
  if (total >= 1_000_000) return `${(total / 1_000_000).toFixed(1)}M`
  if (total >= 1_000) return `${(total / 1_000).toFixed(1)}K`
  return String(total)
}

const formatCountZh = (n: number): string => {
  if (n >= 10_000) return `${(n / 10_000).toFixed(n >= 100_000 ? 0 : 1)}万`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}千`
  return `${n}`
}

// 默认头像色阶（当 displayColor 为 null 时）
const FALLBACK_COLORS = ['#5B5BD6', '#7C3AED', '#0891B2', '#059669', '#D6943A', '#C84634']
const fallbackColor = (userId: number) => FALLBACK_COLORS[userId % FALLBACK_COLORS.length]

interface PostItem {
  id: number
  author: string
  authorId: number
  authorColor: string
  isMine: boolean
  model: string
  time: string
  content: string
  images: string[]
  costText: string
  tokensText: string
  totalTokens: number | null
  skillId: number | null
  skillTitle: string
  skillScene: string
  likes: number
  comments: number
  meoo: number
  liked: boolean
  myMeoo: boolean
  reaction: string
}

const userStore = useUserStore()
const BRIDGE_INTERVAL = 10
const BRIDGE_DISMISS_KEY = 'feed_skill_bridge_dismiss_until_v1'
const BRIDGE_RESHOW_AFTER_MS = 7 * 24 * 60 * 60 * 1000
const bridgeVisible = ref(true)

const ensureLogin = (action = '执行此操作') =>
  requireLogin(userStore.token, action)

const mapApiPost = (item: FeedItem): PostItem => {
  const tokenText = formatTokens(item.totalTokens)
  return {
    id: item.id,
    author: item.user.nickname || '匿名用户',
    authorId: item.user.id,
    authorColor: item.user.displayColor || fallbackColor(item.user.id),
    isMine: Number(userStore.userInfo?.id || 0) === item.user.id,
    model: item.modelName || '--',
    time: formatTime(item.createdAt),
    content: item.noteText,
    images: Array.isArray(item.images)
      ? item.images.map((src) => normalizeImageUrl(`${src || ''}`)).filter(Boolean)
      : [],
    costText: formatCost(item.costAmount, item.currency),
    tokensText: tokenText === '--' ? '--' : `${tokenText} tokens`,
    totalTokens: item.totalTokens ?? null,
    skillId: item.skill?.id ?? null,
    skillTitle: `${item.skill?.title || '未命名 Skill'}`.trim(),
    skillScene: `${item.skill?.scene || ''}`.trim(),
    likes: item.likes ?? 0,
    comments: item.comments ?? 0,
    meoo: item.meoo ?? 0,
    liked: !!item.liked,
    myMeoo: !!item.myMeoo,
    reaction: item.reaction || '',
  }
}

// ── 状态 ──
const posts = ref<PostItem[]>([])
const refreshing = ref(false)
const loading = ref(false)
const noMore = ref(false)
const page = ref(1)
const showSkeleton = computed(() => refreshing.value && posts.value.length === 0)

// ── 数据加载 ──
const loadPage = async (pageNum: number) => {
  const res = await getFeed({ page: pageNum, pageSize: 20 })
  return res
}

const onRefresh = async () => {
  refreshing.value = true
  try {
    const res = await loadPage(1)
    posts.value = res.list.map(mapApiPost)
    page.value = 1
    const totalPages = Number(res?.pagination?.totalPages ?? 0)
    noMore.value = totalPages <= 1
  } catch (err) {
    // 之前是静默失败，调试时难定位，这里保留列表并给出明确提示
    console.error('[feed-post] refresh failed:', err)
    uni.showToast({ title: '动态加载失败', icon: 'none' })
  } finally {
    refreshing.value = false
  }
}

const onLoadMore = async () => {
  if (loading.value || noMore.value) return
  loading.value = true
  try {
    const nextPage = page.value + 1
    const res = await loadPage(nextPage)
    posts.value.push(...res.list.map(mapApiPost))
    page.value = nextPage
    noMore.value = nextPage >= Number(res?.pagination?.totalPages ?? 0)
  } catch (err) {
    console.error('[feed-post] load more failed:', err)
    uni.showToast({ title: '加载更多失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

const loadBridgeState = () => {
  const raw = Number(uni.getStorageSync(BRIDGE_DISMISS_KEY) || 0)
  bridgeVisible.value = !Number.isFinite(raw) || raw <= Date.now()
}

const dismissBridge = () => {
  const until = Date.now() + BRIDGE_RESHOW_AFTER_MS
  uni.setStorageSync(BRIDGE_DISMISS_KEY, until)
  bridgeVisible.value = false
}

const openSkillFromBridge = () => {
  emit('goSkill')
}

// 首次加载
onMounted(() => {
  loadBridgeState()
  void onRefresh()
})

// ── 情绪反应 ──
const rxnTarget = ref<PostItem | null>(null)
const showReactions = (item: PostItem) => {
  if (!item.isMine) return
  if (!ensureLogin('标记结果')) return
  rxnTarget.value = item
}
const pickReaction = async (key: string) => {
  const target = rxnTarget.value
  if (!target) return

  const prevReaction = target.reaction
  const nextReaction = prevReaction === key ? '' : key
  target.reaction = nextReaction
  rxnTarget.value = null

  try {
    const result = await updateFeedReaction(target.id, (nextReaction || null) as FeedReaction | null)
    target.reaction = result.reaction || ''
  } catch (err) {
    console.error('[feed-post] update reaction failed:', err)
    target.reaction = prevReaction
    uni.showToast({ title: '仅可修改自己的感受', icon: 'none' })
  }
}

// ── 互动 ──
const toggleLike = async (item: PostItem) => {
  if (!ensureLogin('点赞')) return

  const prevLiked = item.liked
  const prevLikes = item.likes

  item.liked = !prevLiked
  item.likes += item.liked ? 1 : -1

  try {
    const res = item.liked ? await likeFeedPost(item.id) : await unlikeFeedPost(item.id)
    item.liked = !!res.liked
    item.likes = res.likes ?? 0
  } catch (err) {
    console.error('[feed-post] toggle like failed:', err)
    item.liked = prevLiked
    item.likes = prevLikes
  }
}

const toggleMeoo = async (item: PostItem) => {
  if (!ensureLogin('我也是')) return

  const prevMyMeoo = item.myMeoo
  const prevMeoo = item.meoo

  item.myMeoo = !prevMyMeoo
  item.meoo += item.myMeoo ? 1 : -1

  try {
    const res = item.myMeoo ? await meooFeedPost(item.id) : await unmeooFeedPost(item.id)
    item.myMeoo = !!res.myMeoo
    item.meoo = res.meoo ?? 0
  } catch (err) {
    console.error('[feed-post] toggle meoo failed:', err)
    item.myMeoo = prevMyMeoo
    item.meoo = prevMeoo
  }
}
const previewImg = (images: string[], current: number) => uni.previewImage({ urls: images, current: images[current] })
const showTokenHint = (item: PostItem) => {
  const total = item.totalTokens
  if (typeof total !== 'number' || !Number.isFinite(total) || total <= 0) {
    uni.showModal({
      title: 'Token 小说明',
      content: 'Token 是模型处理文本的计量单位。中文场景下，1 个汉字通常约 1~2 Token。',
      showCancel: false,
      confirmText: '知道了',
    })
    return
  }

  const minChars = Math.round(total / 2)
  const maxChars = Math.round(total)
  let volumeHint = '接近一篇长文或小型报告的体量。'
  if (total < 2_000) volumeHint = '大概是一篇短文到两篇短文的体量。'
  else if (total < 20_000) volumeHint = '大概是一篇万字级文章的体量。'
  else if (total >= 100_000) volumeHint = '已经是长文档级别的体量。'

  uni.showModal({
    title: 'Token 小说明',
    content: [
      'Token 是模型读写文本时的计量单位。',
      '中文里通常 1 个汉字约 1~2 Token。',
      `这条记录约 ${item.tokensText}，大致相当于 ${formatCountZh(minChars)}~${formatCountZh(maxChars)} 个汉字。`,
      volumeHint,
    ].join('\n'),
    showCancel: false,
    confirmText: '我知道了',
  })
}

const toPost   = (id: number) => uni.navigateTo({ url: `/pages/detail/post?id=${id}` })
const toAuthor = (id: number) => uni.navigateTo({ url: `/pages/author/index?id=${id}` })
const toSkill  = (id: number) => uni.navigateTo({ url: `/pages/detail/skill?id=${id}` })

defineExpose({ refresh: onRefresh })
</script>

<style lang="scss" scoped>
.root {
  height: 100%;
  position: relative;
  background: var(--bg-secondary);
}

.scroll {
  height: 100%;
}

.feed-wrap {
  padding: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.feed-entry {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.feed-skeleton-wrap {
  .sk-post-card {
    padding-bottom: 16rpx;
  }
}

.sk-block {
  border-radius: 12rpx;
  background: linear-gradient(100deg, #eef1f5 20%, #f7f8fa 38%, #eef1f5 56%);
  background-size: 200% 100%;
  animation: skShimmer 1.25s linear infinite;
}

.sk-av {
  border-radius: 50%;
}

.sk-line {
  height: 24rpx;
}

.sk-w-96 { width: 96%; }
.sk-w-82 { width: 82%; margin-top: 12rpx; }
.sk-w-44 { width: 44%; margin-bottom: 12rpx; }
.sk-w-26 { width: 26%; }
.sk-w-40 { width: 40%; }
.sk-w-24 { width: 24%; }

.sk-pill {
  height: 40rpx;
  border-radius: 999rpx;
  width: 120rpx;
}

.sk-icon {
  width: 44rpx;
  height: 30rpx;
}

.sk-img-grid {
  display: flex;
  gap: 4rpx;
  padding: 16rpx 24rpx 0;
}

.sk-img {
  width: calc(33.33% - 3rpx);
  height: 200rpx;
  border-radius: 10rpx;
}

/* ── Post card ── */
.post-card {
  background: var(--card-bg);
  border-radius: 20rpx;
  overflow: hidden;
}

.bridge-card {
  margin: 0 6rpx;
  padding: 14rpx 16rpx;
  border-radius: 14rpx;
  background: rgba(91, 91, 214, 0.05);
  border: 1rpx solid rgba(91, 91, 214, 0.12);
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.bridge-main {
  min-width: 0;
  flex: 1;
}

.bridge-text {
  display: block;
  font-size: 23rpx;
  color: var(--text-gray);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bridge-link {
  flex-shrink: 0;
  font-size: 22rpx;
  color: var(--primary-color);
  font-weight: 700;
}

.bridge-close {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
}

.pc-hd {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx 24rpx 0;

  .pc-av {
    width: 72rpx; height: 72rpx;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    .pc-av-t { font-size: 26rpx; color: #fff; font-weight: 800; }
  }

  .pc-info {
    flex: 1;
    .pc-name-row { display: flex; align-items: center; gap: 10rpx; margin-bottom: 6rpx; }
    .pc-name { font-size: 30rpx; font-weight: 700; color: var(--text-primary); }
    .pc-model {
      display: flex; align-items: center; gap: 6rpx;
      background: rgba(47,138,87,0.08); border-radius: 100rpx; padding: 3rpx 10rpx;
      .pc-dot { width: 8rpx; height: 8rpx; border-radius: 50%; background: var(--green-color); }
      .pc-model-t { font-size: 18rpx; color: var(--green-color); font-weight: 500; }
    }
    .pc-time { font-size: 20rpx; color: var(--text-muted); }
  }

  .pc-rxn-pill {
    margin-left: auto;
  }
}

.pc-body {
  display: block;
  font-size: 29rpx; color: var(--text-dark); line-height: 1.75;
  padding: 16rpx 24rpx 0;
}

.pc-skill {
  margin: 14rpx 24rpx 0;
  padding: 12rpx 16rpx;
  border-radius: 14rpx;
  background: rgba(91, 91, 214, 0.06); /* ~primary-light-06, no exact var */
  display: flex;
  align-items: center;
  gap: 10rpx;

  .pc-skill-label {
    font-size: 20rpx;
    color: var(--primary-color);
    font-weight: 700;
    flex-shrink: 0;
  }

  .pc-skill-title {
    flex: 1;
    font-size: 22rpx;
    color: var(--text-dark);
    font-weight: 600;
  }

  .pc-skill-scene {
    font-size: 20rpx;
    color: rgba(0,0,0,0.45);
    flex-shrink: 0;
  }
}

.pc-imgs {
  display: flex; flex-wrap: wrap; margin-top: 16rpx;
  &.gi-1 .pc-img { width: 100%; height: 360rpx; }
  &.gi-2 { gap: 4rpx; padding: 0 24rpx;
    .pc-img { width: calc(50% - 2rpx); height: 240rpx; border-radius: 12rpx; }
  }
  &.gi-3, &.gi-many { gap: 4rpx; padding: 0 24rpx;
    .pc-img { width: calc(33.33% - 3rpx); height: 200rpx; border-radius: 10rpx; }
  }
}

.pc-bottom-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  padding: 14rpx 16rpx 18rpx 24rpx;
  margin-top: 14rpx;
  border-top: 1rpx solid rgba(0,0,0,0.05);
}

.pc-cost-judge {
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.pc-cost-inline {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
  flex-shrink: 0;
}

.pc-cost-main {
  font-size: 30rpx;
  font-weight: 800;
  color: var(--orange-color);
  font-variant-numeric: tabular-nums;
}

.pc-token-text {
  font-size: 22rpx;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.pc-token-tip {
  width: 28rpx;
  height: 28rpx;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pc-rxn-pill {
  display: flex;
  align-items: center;
  gap: 6rpx;
  background: rgba(0,0,0,0.04);
  border-radius: 100rpx;
  padding: 8rpx 16rpx;
  min-width: 0;
  flex-shrink: 0;

  .pc-rxn-icon {
    flex-shrink: 0;
  }

  .pc-rxn-t {
    font-size: 22rpx;
    color: var(--text-muted);
    font-weight: 500;
    white-space: nowrap;
  }

  &.rxn-active .pc-rxn-t {
    font-weight: 600;
  }

  &.rxn-editable {
    border: 1rpx solid rgba(0,0,0,0.08);
  }
}

.pc-act-grp {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4rpx;
  flex-shrink: 0;
}

.pc-act {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 10rpx 12rpx;
}

.pc-act-n {
  font-size: 24rpx;
  color: var(--text-muted);
}

.pc-meoo-icon {
  padding-left: 10rpx;
  padding-right: 10rpx;
}

.pc-meta-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16rpx 24rpx 0; gap: 16rpx;

  .pc-spend {
    display: flex; align-items: baseline; gap: 8rpx;
    .pc-cost { font-size: 32rpx; font-weight: 800; color: var(--orange-color); font-variant-numeric: tabular-nums; }
    .pc-cost-sep { font-size: 22rpx; color: var(--border-lighter); }
    .pc-tok { font-size: 22rpx; color: var(--text-muted); }
  }

  .pc-rxn-pill {
    display: flex; align-items: center; gap: 6rpx;
    background: rgba(0,0,0,0.04); border-radius: 100rpx; padding: 8rpx 16rpx;
    .pc-rxn-icon { flex-shrink: 0; }
    .pc-rxn-t { font-size: 22rpx; color: var(--text-muted); font-weight: 500; }
    &.rxn-active .pc-rxn-t { font-weight: 600; }
    &.rxn-editable { border: 1rpx solid rgba(0,0,0,0.08); }
  }
}

.pc-acts {
  display: flex; align-items: center;
  padding: 14rpx 16rpx 18rpx 20rpx;
  margin-top: 14rpx;
  border-top: 1rpx solid rgba(0,0,0,0.05);

  .pc-meoo {
    display: flex; align-items: center; gap: 6rpx;
    background: rgba(0,0,0,0.04); border-radius: 100rpx; padding: 10rpx 20rpx;
    .pc-meoo-t { font-size: 22rpx; color: var(--text-gray); font-weight: 600; }
    .pc-meoo-n { font-size: 22rpx; color: var(--text-muted); }
    &.meoo-on { background: var(--accent-light); }
  }
  .pc-act-grp { flex: 1; display: flex; align-items: center; justify-content: flex-end; gap: 4rpx; }
  .pc-act {
    display: flex; align-items: center; gap: 6rpx; padding: 10rpx 14rpx;
    .pc-act-n { font-size: 24rpx; color: var(--text-muted); }
  }
}

/* ── 空状态 ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 40rpx;
  gap: 16rpx;

  .empty-txt { font-size: 30rpx; color: var(--text-gray); font-weight: 600; }
  .empty-sub { font-size: 24rpx; color: var(--text-muted); }
}

/* ── 加载状态 ── */
.load-footer {
  display: flex;
  justify-content: center;
  padding: 20rpx 0 12rpx;

  .load-txt { font-size: 24rpx; color: var(--text-muted); }

  .no-more {
    display: flex; align-items: center; gap: 20rpx;
    .no-more-line { flex: 1; max-width: 80rpx; height: 1rpx; background: var(--border-light); }
    .no-more-txt { font-size: 22rpx; color: var(--border-lighter); white-space: nowrap; }
  }
}

.feed-bottom {
  height: calc(160rpx + env(safe-area-inset-bottom));
}

.line-1 {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@keyframes skShimmer {
  from { background-position: 200% 0; }
  to { background-position: -40% 0; }
}

/* ── 情绪反应弹层 ── */
.rxn-mask {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: rgba(0,0,0,0.35);
  display: flex; align-items: flex-end;
  z-index: 999;

  .rxn-sheet {
    width: 100%; background: var(--card-bg);
    border-radius: 28rpx 28rpx 0 0;
    padding: 32rpx 32rpx calc(40rpx + env(safe-area-inset-bottom));

    .rxn-sheet-title {
      display: block; font-size: 26rpx; font-weight: 700;
      color: var(--text-gray); text-align: center; margin-bottom: 28rpx;
    }

    .rxn-options {
      display: flex; gap: 16rpx;

      .rxn-opt {
        flex: 1; display: flex; flex-direction: column; align-items: center;
        gap: 10rpx; background: rgba(0,0,0,0.04);
        border: 2rpx solid transparent; border-radius: 20rpx; padding: 20rpx 0;
        .rxn-opt-icon { line-height: 1; }
        .rxn-opt-t { font-size: 22rpx; color: var(--text-gray); font-weight: 600; }
        &.rxn-opt-on { border-color: currentColor; }
      }
    }
  }
}

/* 低版本微信 WebView 对 flex gap 支持不完整，做一层 margin 降级 */
@supports not (gap: 1px) {
  .feed-wrap > * + * { margin-top: 20rpx; }
  .feed-entry > * + * { margin-top: 12rpx; }

  .pc-hd > * + * { margin-left: 16rpx; }
  .pc-name-row > * + * { margin-left: 10rpx; }
  .pc-model > * + * { margin-left: 6rpx; }

  .pc-bottom-row > * + * { margin-left: 12rpx; }
  .pc-cost-judge > * + * { margin-left: 8rpx; }
  .pc-cost-inline > * + * { margin-left: 8rpx; }
  .pc-meta-row > * + * { margin-left: 16rpx; }
  .pc-spend > * + * { margin-left: 8rpx; }
  .pc-rxn-pill > * + * { margin-left: 6rpx; }

  .pc-meoo > * + * { margin-left: 6rpx; }
  .pc-act-grp > * + * { margin-left: 4rpx; }
  .pc-act > * + * { margin-left: 6rpx; }

  .no-more > * + * { margin-left: 20rpx; }
  .rxn-options > * + * { margin-left: 16rpx; }
  .rxn-opt > * + * { margin-top: 10rpx; }
}
</style>
