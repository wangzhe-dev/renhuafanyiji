<template>
  <view class="page">
    <uni-nav-bar
      status-bar
      title="我的数据"
      left-icon="left"
      background-color="#FFFFFF"
      @clickLeft="goBack"
    />

    <view v-if="!isLoggedIn" class="guest-wrap">
      <view class="guest-card" @tap="goLogin">
        <uni-icons type="person" size="34" color="#C8CBD4" />
        <text class="guest-title">登录后查看我的数据</text>
        <text class="guest-sub">发布、收藏、点赞、复制都会在这里沉淀</text>
        <view class="guest-btn">去登录</view>
      </view>
    </view>

    <template v-else>
      <view class="tabs-wrap">
        <uni-segmented-control
          :current="currentTab"
          :values="tabValues"
          style-type="button"
          active-color="#E45C1A"
          @clickItem="onTabClick"
        />
      </view>

      <scroll-view
        class="list-scroll"
        scroll-y
        :show-scrollbar="false"
        lower-threshold="120"
        @scrolltolower="loadMoreCurrent"
      >
        <view class="tab-tip">
          <text class="tab-tip-text">{{ tabTip }}</text>
        </view>

        <view v-if="activeState.inited && activeState.list.length === 0 && !activeState.loading" class="empty-wrap">
          <uni-icons type="info-filled" size="22" color="#C8CBD4" />
          <text class="empty-title">{{ emptyTitle }}</text>
          <text class="empty-sub">{{ emptySubTitle }}</text>
        </view>

        <template v-else>
          <view v-if="activeKey === 'publish'" class="card-list">
            <view
              v-for="item in publishState.list"
              :key="item.id"
              class="record-card"
              @tap="toSkillDetail(item.id)"
            >
              <view class="record-top">
                <text class="record-tag">{{ item.scene }}</text>
                <text class="record-time">{{ item.publishAt }}</text>
              </view>
              <text class="record-title">{{ item.title }}</text>
              <view class="metric-row">
                <view class="metric-item">
                  <text class="metric-val orange">{{ item.copyCount }}</text>
                  <text class="metric-lab">复制</text>
                </view>
                <view class="metric-item">
                  <text class="metric-val">{{ item.favoriteCount }}</text>
                  <text class="metric-lab">收藏</text>
                </view>
                <view class="metric-item">
                  <text class="metric-val green">{{ item.successRate }}</text>
                  <text class="metric-lab">复现率</text>
                </view>
                <view class="metric-item">
                  <text class="metric-val blue">{{ item.feedbackCount }}</text>
                  <text class="metric-lab">反馈</text>
                </view>
              </view>
            </view>
          </view>

          <view v-if="activeKey === 'favorite'" class="card-list">
            <view
              v-for="item in favoriteState.list"
              :key="item.favoriteId"
              class="line-card"
              @tap="toSkillDetail(item.skillId)"
            >
              <view class="line-main">
                <text class="line-title">{{ item.title }}</text>
                <text class="line-sub">{{ item.creator }} · {{ item.scene }} · {{ item.favoredAt }}</text>
              </view>
              <text class="line-meta">{{ item.favoriteCount }} 收藏</text>
            </view>
          </view>

          <view v-if="activeKey === 'like'" class="card-list">
            <view
              v-for="item in likeState.list"
              :key="item.likeId"
              class="record-card like-card"
              @tap="toPostDetail(item.postId)"
            >
              <view class="record-top">
                <text class="record-tag like-tag">点赞动态</text>
                <text class="record-time">{{ item.likedAt }}</text>
              </view>
              <text class="record-title">{{ item.skillTitle || '动态内容' }}</text>
              <text class="record-desc">{{ item.text }}</text>
              <view class="line-bottom">
                <text class="line-sub">{{ item.author }} · {{ item.modelName }}</text>
                <text class="line-meta">{{ item.likeCount }} 赞 · {{ item.commentCount }} 评</text>
              </view>
            </view>
          </view>

          <view v-if="activeKey === 'copy'" class="card-list">
            <view
              v-for="item in copyState.list"
              :key="item.id"
              class="line-card"
              @tap="toSkillDetail(item.skillId)"
            >
              <view class="line-main">
                <text class="line-title">{{ item.title }}</text>
                <text class="line-sub">{{ item.scene }} · {{ item.sourceChannel }} · {{ item.createdAt }}</text>
              </view>
              <text class="line-meta">已复制</text>
            </view>
          </view>
        </template>

        <view class="load-more-wrap">
          <uni-load-more :status="loadMoreStatus" :content-text="loadMoreText" />
        </view>
        <view class="bottom-gap" />
      </scroll-view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { getMyCopies, getMyFavorites, getMyLikes, getMySkills } from '@/api/me'
import type { MyCopyItem as ApiCopyItem, MyFavoriteItem as ApiFavoriteItem, MyLikeItem as ApiLikeItem } from '@/api/me'
import type { SkillListItem } from '@/api/skill'
import { useUserStore } from '@/stores'

type PublishItem = {
  id: string
  title: string
  scene: string
  publishAt: string
  copyCount: string
  favoriteCount: string
  successRate: string
  feedbackCount: string
}

type FavoriteItem = {
  favoriteId: string
  skillId: string
  title: string
  scene: string
  creator: string
  favoriteCount: string
  favoredAt: string
}

type LikeItem = {
  likeId: string
  postId: string
  text: string
  modelName: string
  author: string
  skillTitle: string
  likedAt: string
  likeCount: string
  commentCount: string
}

type CopyItem = {
  id: string
  createdAt: string
  sourceChannel: string
  skillId: string
  title: string
  scene: string
}

type TabKey = 'publish' | 'favorite' | 'like' | 'copy'

type TabState<T> = {
  list: T[]
  page: number
  noMore: boolean
  loading: boolean
  inited: boolean
}

const PAGE_SIZE = 20
const tabValues = ['发布', '收藏', '点赞', '复制']
const tabKeys: TabKey[] = ['publish', 'favorite', 'like', 'copy']

const userStore = useUserStore()
const isLoggedIn = computed(() => !!userStore.token)
const currentTab = ref(0)

const publishState = reactive<TabState<PublishItem>>({
  list: [],
  page: 1,
  noMore: false,
  loading: false,
  inited: false
})

const favoriteState = reactive<TabState<FavoriteItem>>({
  list: [],
  page: 1,
  noMore: false,
  loading: false,
  inited: false
})

const likeState = reactive<TabState<LikeItem>>({
  list: [],
  page: 1,
  noMore: false,
  loading: false,
  inited: false
})

const copyState = reactive<TabState<CopyItem>>({
  list: [],
  page: 1,
  noMore: false,
  loading: false,
  inited: false
})

const stateMap: Record<TabKey, TabState<any>> = {
  publish: publishState,
  favorite: favoriteState,
  like: likeState,
  copy: copyState
}

const activeKey = computed<TabKey>(() => tabKeys[currentTab.value] || 'publish')
const activeState = computed(() => stateMap[activeKey.value])

const tabTipMap: Record<TabKey, string> = {
  publish: '展示你发布的 Skill 表现与反馈',
  favorite: '集中查看你收藏过的优质 Skill',
  like: '回看你点赞过的动态内容',
  copy: '查看你复制过的 Skill 轨迹'
}

const emptyTitleMap: Record<TabKey, string> = {
  publish: '还没有发布数据',
  favorite: '还没有收藏数据',
  like: '还没有点赞数据',
  copy: '还没有复制数据'
}

const tabTip = computed(() => tabTipMap[activeKey.value])
const emptyTitle = computed(() => emptyTitleMap[activeKey.value])
const emptySubTitle = computed(() => '去首页或趋势页逛逛，积累属于你的数据轨迹')

const loadMoreText = {
  contentdown: '上拉加载更多',
  contentrefresh: '正在加载...',
  contentnomore: '没有更多了'
}

const loadMoreStatus = computed(() => {
  if (!isLoggedIn.value) return 'more'
  const state = activeState.value
  if (state.loading) return 'loading'
  if (state.noMore) return 'noMore'
  return 'more'
})

const formatCount = (value: number | null | undefined) => {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n) || n <= 0) return '0'
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`
  return `${Math.round(n)}`
}

const formatRate = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '--'
  return `${Number(value).toFixed(0)}%`
}

const formatDate = (value: string | null | undefined) => {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const normalizeText = (value: unknown) => `${value ?? ''}`.replace(/\s+/g, ' ').trim()

const SOURCE_CHANNEL_LABEL_MAP: Record<string, string> = {
  detail: '详情页',
  copy_all: '详情页整段复制',
  similar: '相似推荐',
  search: '搜索页',
  feed: '首页推荐',
  trend: '趋势页',
  author: '作者页'
}

const formatSourceChannel = (value: string | null | undefined) => {
  const key = `${value ?? ''}`.trim().toLowerCase()
  if (!key) return '未知来源'
  return SOURCE_CHANNEL_LABEL_MAP[key] || key
}

const resetTabState = (key: TabKey) => {
  const state = stateMap[key]
  state.list = []
  state.page = 1
  state.noMore = false
  state.loading = false
  state.inited = false
}

const ensureTabData = async () => {
  if (!isLoggedIn.value) return
  const key = activeKey.value
  const state = stateMap[key]
  if (state.inited || state.loading) return
  await loadTabData(key, true)
}

const loadTabData = async (key: TabKey, reset = false) => {
  if (!isLoggedIn.value) return
  const state = stateMap[key]
  if (state.loading) return
  if (!reset && state.noMore) return

  state.loading = true
  const targetPage = reset ? 1 : state.page

  try {
    if (key === 'publish') {
      const res = await getMySkills({ page: targetPage, pageSize: PAGE_SIZE, status: 1 })
      const list = Array.isArray(res?.list)
        ? res.list.map((item: SkillListItem) => ({
            id: `${item.id}`,
            title: `${item.title || '未命名 Skill'}`,
            scene: `${item.scene || '其他'}`,
            publishAt: formatDate(item.publishAt),
            copyCount: formatCount(item.copyCount),
            favoriteCount: formatCount(item.favoriteCount),
            successRate: formatRate(item.successRate),
            feedbackCount: formatCount(item.feedbackCount)
          }))
        : []

      state.list = reset ? list : [...state.list, ...list]

      const totalPages = Number(res?.pagination?.totalPages ?? 0)
      state.noMore = totalPages > 0 ? targetPage >= totalPages : list.length < PAGE_SIZE
      state.page = state.noMore ? targetPage : targetPage + 1
      state.inited = true
      return
    }

    if (key === 'favorite') {
      const res = await getMyFavorites({ page: targetPage, pageSize: PAGE_SIZE })
      const list = Array.isArray(res?.list)
        ? res.list.map((item: ApiFavoriteItem) => ({
            favoriteId: `${item.favoriteId}`,
            skillId: `${item.skill.id}`,
            title: `${item.skill.title || '未命名 Skill'}`,
            scene: `${item.skill.scene || '其他'}`,
            creator: `${item.skill.creator.nickname || '匿名用户'}`,
            favoriteCount: formatCount(item.skill.favoriteCount),
            favoredAt: formatDate(item.favoredAt)
          }))
        : []

      state.list = reset ? list : [...state.list, ...list]

      const totalPages = Number(res?.pagination?.totalPages ?? 0)
      state.noMore = totalPages > 0 ? targetPage >= totalPages : list.length < PAGE_SIZE
      state.page = state.noMore ? targetPage : targetPage + 1
      state.inited = true
      return
    }

    if (key === 'like') {
      const res = await getMyLikes({ page: targetPage, pageSize: PAGE_SIZE })
      const list = Array.isArray(res?.list)
        ? res.list.map((item: ApiLikeItem) => ({
            likeId: `${item.likeId}`,
            postId: `${item.post.id}`,
            text: normalizeText(item.post.text),
            modelName: `${item.post.modelName || '未知模型'}`,
            author: `${item.post.author.nickname || '匿名用户'}`,
            skillTitle: `${item.post.skill?.title || ''}`,
            likedAt: formatDate(item.likedAt),
            likeCount: formatCount(item.post.likeCount),
            commentCount: formatCount(item.post.commentCount)
          }))
        : []

      state.list = reset ? list : [...state.list, ...list]

      const totalPages = Number(res?.pagination?.totalPages ?? 0)
      state.noMore = totalPages > 0 ? targetPage >= totalPages : list.length < PAGE_SIZE
      state.page = state.noMore ? targetPage : targetPage + 1
      state.inited = true
      return
    }

    const res = await getMyCopies({ page: targetPage, pageSize: PAGE_SIZE })
    const list = Array.isArray(res?.list)
      ? res.list.map((item: ApiCopyItem) => ({
          id: `${item.id}`,
          createdAt: formatDate(item.createdAt),
          sourceChannel: formatSourceChannel(item.sourceChannel),
          skillId: `${item.skill?.id || ''}`,
          title: `${item.skill?.title || 'Skill 已删除'}`,
          scene: `${item.skill?.scene || '其他'}`
        }))
      : []

    state.list = reset ? list : [...state.list, ...list]

    const totalPages = Number(res?.pagination?.totalPages ?? 0)
    state.noMore = totalPages > 0 ? targetPage >= totalPages : list.length < PAGE_SIZE
    state.page = state.noMore ? targetPage : targetPage + 1
    state.inited = true
  } catch {
    uni.showToast({ title: '数据加载失败', icon: 'none' })
  } finally {
    state.loading = false
  }
}

const onTabClick = (e: any) => {
  const next = Number(e?.currentIndex ?? 0)
  if (!Number.isInteger(next) || next < 0 || next >= tabValues.length) return
  if (currentTab.value === next) return
  currentTab.value = next
  void ensureTabData()
}

const loadMoreCurrent = async () => {
  if (!isLoggedIn.value) return
  await loadTabData(activeKey.value, false)
}

const goBack = () => {
  uni.navigateBack()
}

const goLogin = () => {
  uni.navigateTo({ url: '/pages/login/index' })
}

const toSkillDetail = (id: string) => {
  if (!id) {
    uni.showToast({ title: 'Skill 已不存在', icon: 'none' })
    return
  }
  uni.navigateTo({ url: `/pages/detail/skill?id=${id}` })
}

const toPostDetail = (id: string) => {
  if (!id) {
    uni.showToast({ title: '动态已不存在', icon: 'none' })
    return
  }
  uni.navigateTo({ url: `/pages/detail/post?id=${id}` })
}

onLoad((query: any) => {
  const tab = `${query?.tab || ''}`
  const targetIndex = tabKeys.findIndex((item) => item === tab)
  if (targetIndex >= 0) currentTab.value = targetIndex
})

onShow(() => {
  if (!isLoggedIn.value) return
  void ensureTabData()
})

watch(isLoggedIn, (val) => {
  if (val) {
    void ensureTabData()
    return
  }
  resetTabState('publish')
  resetTabState('favorite')
  resetTabState('like')
  resetTabState('copy')
})
</script>

<style lang="scss" scoped>
.page {
  height: 100%;
  background: var(--bg-secondary);
}

.guest-wrap {
  padding: 24rpx;
}

.guest-card {
  background: var(--card-bg);
  border-radius: 24rpx;
  border: 1rpx dashed var(--primary-border);
  padding: 40rpx 28rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;

  &:active {
    background: var(--primary-bg);
  }
}

.guest-title {
  font-size: 30rpx;
  color: var(--text-primary);
  font-weight: 700;
}

.guest-sub {
  font-size: 24rpx;
  color: var(--text-muted);
}

.guest-btn {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: var(--primary-color);
  background: var(--primary-light-10);
  padding: 10rpx 24rpx;
  border-radius: 999rpx;
  font-weight: 600;
}

.tabs-wrap {
  padding: 18rpx 24rpx 12rpx;
  background: var(--card-bg);
}

.list-scroll {
  height: calc(100vh - 170rpx - env(safe-area-inset-bottom));
}

.tab-tip {
  padding: 18rpx 26rpx 8rpx;
}

.tab-tip-text {
  font-size: 22rpx;
  color: var(--text-muted);
}

.card-list {
  padding: 0 24rpx;
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.record-card {
  background: var(--card-bg);
  border-radius: 20rpx;
  padding: 22rpx 20rpx;

  &:active {
    background: var(--primary-bg);
  }
}

.record-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10rpx;
}

.record-tag {
  font-size: 20rpx;
  color: var(--primary-color);
  background: var(--primary-light-10);
  padding: 6rpx 12rpx;
  border-radius: 8rpx;
  font-weight: 600;
}

.like-tag {
  color: var(--green-color);
  background: rgba(47, 138, 87, 0.12);
}

.record-time {
  font-size: 22rpx;
  color: var(--text-muted);
}

.record-title {
  display: block;
  font-size: 28rpx;
  color: var(--text-primary);
  font-weight: 700;
  line-height: 1.45;
}

.record-desc {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: var(--text-gray);
  line-height: 1.6;
}

.metric-row {
  margin-top: 14rpx;
  display: flex;
  gap: 8rpx;
}

.metric-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  padding: 10rpx 0;
  border-radius: 10rpx;
  background: var(--bg-secondary);
}

.metric-val {
  font-size: 24rpx;
  color: var(--text-primary);
  font-weight: 700;
}

.metric-val.orange {
  color: var(--orange-color);
}

.metric-val.green {
  color: var(--green-color);
}

.metric-val.blue {
  color: var(--primary-color);
}

.metric-lab {
  font-size: 18rpx;
  color: var(--text-muted);
}

.line-card {
  background: var(--card-bg);
  border-radius: 16rpx;
  padding: 20rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;

  &:active {
    background: var(--primary-bg);
  }
}

.line-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.line-title {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--text-primary);
}

.line-sub {
  font-size: 22rpx;
  color: var(--text-muted);
}

.line-meta {
  font-size: 22rpx;
  color: var(--text-gray);
}

.line-bottom {
  margin-top: 10rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.empty-wrap {
  margin: 24rpx;
  padding: 44rpx 24rpx;
  border-radius: 20rpx;
  background: var(--card-bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
}

.empty-title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-primary);
}

.empty-sub {
  font-size: 22rpx;
  color: var(--text-muted);
}

.load-more-wrap {
  padding: 12rpx 24rpx 0;
}

.bottom-gap {
  height: calc(40rpx + env(safe-area-inset-bottom));
}
</style>
