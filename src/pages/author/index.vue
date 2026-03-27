<template>
  <view class="author-page">
    <view class="profile-hero">
      <view class="cover-bg" />
      <view class="cover-spot cover-spot-left" />
      <view class="cover-spot cover-spot-right" />

      <view class="hero-top">
        <view class="back-btn" @tap="goBack">
          <uni-icons type="left" size="20" color="#FFFFFF" />
        </view>
      </view>

      <view class="hero-card card-shadow">
        <view class="hero-row">
          <view class="hero-avatar" :style="{ background: author.color }">
            <text class="hero-avatar-text">{{ authorInitial }}</text>
          </view>

          <view class="hero-info">
            <text class="hero-name">{{ author.name || '创作者' }}</text>
            <text class="hero-bio">{{ author.bio || '这位创作者还没有填写简介。' }}</text>

            <view v-if="author.tags.length" class="hero-tags">
              <view v-for="tag in author.tags" :key="tag" class="hero-tag">
                <text class="hero-tag-text">{{ tag }}</text>
              </view>
            </view>
          </view>

          <view class="follow-btn" :class="{ following: isFollowing, loading: followLoading }" @tap="toggleFollow">
            <text class="follow-text">{{ isFollowing ? '已关注' : '+ 关注' }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="author-body">
      <view class="stats-card card-shadow">
        <view class="stat-item stat-copy">
          <text class="stat-number">{{ author.totalCopies }}</text>
          <text class="stat-label">被复制</text>
        </view>
        <view class="stat-item">
          <text class="stat-number">{{ author.skillCount }}</text>
          <text class="stat-label">Skill</text>
        </view>
        <view class="stat-item stat-rate">
          <text class="stat-number">{{ author.avgSuccessRate }}</text>
          <text class="stat-label">平均复现率</text>
        </view>
        <view class="stat-item">
          <text class="stat-number">{{ author.followers }}</text>
          <text class="stat-label">粉丝</text>
        </view>
      </view>

      <view class="tabs-wrap">
        <view
          v-for="tab in TABS"
          :key="tab.key"
          class="tab-item"
          :class="{ active: activeTab === tab.key }"
          @tap="activeTab = tab.key"
        >
          <text class="tab-text">{{ tab.label }}</text>
          <view class="tab-indicator" />
        </view>
      </view>

      <scroll-view class="content-scroll" scroll-y :show-scrollbar="false">
        <view v-if="activeTab === 'skills'" class="skills-list">
          <view
            v-for="skill in authorSkills"
            :key="skill.id"
            class="skill-card card-shadow"
            @tap="toSkill(skill.id)"
          >
            <view class="skill-head">
              <view class="skill-scene">
                <text class="skill-scene-text">{{ skill.scene }}</text>
              </view>
              <text class="skill-time">{{ skill.time }}</text>
            </view>

            <text class="skill-title line-2">{{ skill.title }}</text>
            <text v-if="skill.modelName" class="skill-model line-1">{{ skill.modelName }}</text>

            <view class="skill-meta">
              <view class="meta-chip chip-token">
                <uni-icons type="fire-filled" size="13" color="#E45C1A" />
                <text class="meta-chip-text">{{ skill.avgToken }} Tokens</text>
              </view>

              <view class="meta-chip chip-rate">
                <uni-icons type="checkmarkempty" size="13" color="#2F8A57" />
                <text class="meta-chip-text">{{ skill.successRate }} 复现</text>
              </view>

              <view class="meta-chip">
                <uni-icons type="chat" size="13" color="#6B7280" />
                <text class="meta-chip-text">{{ skill.copyCount }} 复制</text>
              </view>
            </view>

            <view class="copy-btn" @tap.stop="copySkill(skill)">
              <text class="copy-btn-text">复制 Skill</text>
            </view>
          </view>

          <view v-if="authorSkills.length === 0" class="empty-box card-shadow">
            <text class="empty-title">还没有公开 Skill</text>
            <text class="empty-desc">等 ta 发布之后，这里会第一时间展示。</text>
          </view>
        </view>

        <view v-else-if="activeTab === 'feedbacks'" class="feedbacks-list">
          <view v-for="fb in authorFeedbacks" :key="fb.id" class="feedback-card card-shadow">
            <view class="feedback-head">
              <text class="feedback-title line-1">{{ fb.skillTitle }}</text>
              <view class="feedback-status" :class="fb.status === 'success' ? 'status-success' : 'status-normal'">
                <text class="feedback-status-text">{{ fb.status === 'success' ? '成功' : '一般' }}</text>
              </view>
            </view>

            <view class="feedback-meta">
              <text class="feedback-model">{{ fb.model }}</text>
              <view class="feedback-token-wrap">
                <uni-icons type="fire-filled" size="12" color="#E45C1A" />
                <text class="feedback-token">{{ fb.totalToken }}</text>
              </view>
            </view>

            <text class="feedback-comment">{{ fb.comment }}</text>
          </view>

          <view v-if="authorFeedbacks.length === 0" class="empty-box card-shadow">
            <text class="empty-title">反馈还在积累中</text>
            <text class="empty-desc">后续会展示复现反馈与模型表现。</text>
          </view>
        </view>

        <view class="scroll-bottom" />
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { getCreatorProfile, getSkillDetail, getSkillList, copySkill as copySkillApi, followCreator, unfollowCreator } from '@/api/skill'
import { useUserStore } from '@/stores'
import { requireLogin } from '@/utils/auth-guard'

const TABS = [
  { key: 'skills', label: 'Skill' },
  { key: 'feedbacks', label: '反馈' },
]

const isFollowing = ref(false)
const activeTab = ref('skills')
const userStore = useUserStore()

const author = reactive({
  name: '',
  color: '#5B5BD6',
  bio: '',
  tags: [] as string[],
  totalCopies: '--',
  skillCount: '--',
  avgSuccessRate: '--',
  followers: '0',
})

const authorInitial = computed(() => {
  const name = `${author.name || '创作者'}`.trim()
  return name ? name[0] : '创'
})

const authorSkills = ref<Array<{
  id: string
  title: string
  scene: string
  time: string
  avgToken: string
  successRate: string
  copyCount: string
  modelName: string
}>>([])

const normalizeUsageModelName = (value: unknown): string => {
  const modelName = `${value ?? ''}`.trim()
  if (!modelName || modelName === '--' || modelName === '未知模型') return ''
  return modelName
}

const normalizePlainText = (value: unknown) => `${value ?? ''}`
  .replace(/<[^>]*>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

// 反馈暂无公开接口，保留空列表
const authorFeedbacks = ref<Array<{
  id: string
  skillTitle: string
  model: string
  totalToken: string
  status: string
  comment: string
}>>([])

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

const formatRelativeTime = (time: string | null | undefined) => {
  if (!time) return '--'
  const date = new Date(time)
  if (Number.isNaN(date.getTime())) return '--'
  const diff = Date.now() - date.getTime()
  const day = 24 * 60 * 60 * 1000
  if (diff < day) return '今天'
  if (diff < 2 * day) return '1天前'
  if (diff < 7 * day) return `${Math.floor(diff / day)}天前`
  return `${Math.floor(diff / (7 * day))}周前`
}

const loadAuthorData = async (userId: number) => {
  try {
    const profile = await getCreatorProfile(userId)
    author.name = profile.nickname || '未知用户'
    author.color = profile.displayColor || '#5B5BD6'
    author.bio = profile.bio || ''
    author.tags = profile.bio ? ['创作者'] : []
    author.totalCopies = formatCount(profile.totalCopyCount)
    author.skillCount = formatCount(profile.publishedSkillCount)
    author.avgSuccessRate = formatRate(profile.avgSuccessRate)
    author.followers = formatCount(profile.followerCount)
    isFollowing.value = profile.isFollowing ?? false
  } catch {
    uni.showToast({ title: '加载用户信息失败', icon: 'none' })
  }

  try {
    const data = await getSkillList({ creatorId: userId, page: 1, pageSize: 20 })
    const list = Array.isArray(data?.list) ? data.list : []
    authorSkills.value = list.map((item: any) => ({
      id: `${item.id}`,
      title: item.title || '未命名 Skill',
      scene: item.scene || '其他',
      time: formatRelativeTime(item.publishAt || item.updatedAt),
      avgToken: formatToken(item.avgTotalTokens),
      successRate: formatRate(item.successRate),
      copyCount: formatCount(item.copyCount),
      modelName: normalizeUsageModelName(item.modelName),
    }))
  } catch {
    uni.showToast({ title: '加载 Skill 列表失败', icon: 'none' })
  }
}

onLoad((query: any) => {
  const userId = Number(query?.id)
  if (!userId || !Number.isInteger(userId) || userId <= 0) {
    uni.showToast({ title: '用户不存在', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
    return
  }
  currentUserId.value = userId
  loadAuthorData(userId)
})

const copySkill = async (skill: any) => {
  if (!requireLogin(userStore.token, '复制 Skill')) return
  let copyText = ''
  try {
    const detail = await getSkillDetail(skill?.id)
    copyText = normalizePlainText(detail?.content?.fullPrompt)
  } catch {}
  if (!copyText) copyText = normalizePlainText(skill?.title)
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
    const modelName = normalizeUsageModelName(skill?.modelName)
    await copySkillApi(
      skill.id,
      modelName
        ? { sourceChannel: 'author', usage: { modelName } }
        : { sourceChannel: 'author' },
    )
    uni.showToast({ title: '已复制 Skill', icon: 'success' })
  } catch {}
}

const toSkill = (id: string) => {
  uni.navigateTo({ url: `/pages/detail/skill?id=${id}` })
}

const followLoading = ref(false)
const currentUserId = ref(0)

const toggleFollow = async () => {
  if (!requireLogin(userStore.token, '关注')) return
  if (followLoading.value) return

  const nextFollowing = !isFollowing.value
  // 乐观更新
  isFollowing.value = nextFollowing
  const prevCount = Number(author.followers.replace('k', '')) || 0
  author.followers = formatCount(nextFollowing ? prevCount + 1 : Math.max(0, prevCount - 1))

  followLoading.value = true
  try {
    const res = nextFollowing
      ? await followCreator(currentUserId.value)
      : await unfollowCreator(currentUserId.value)
    isFollowing.value = res.isFollowing
    uni.showToast({ title: res.isFollowing ? '已关注' : '已取消关注', icon: 'none' })
  } catch {
    // 回滚
    isFollowing.value = !nextFollowing
    author.followers = formatCount(nextFollowing ? Math.max(0, prevCount - 1) : prevCount + 1)
    uni.showToast({ title: '操作失败，请重试', icon: 'none' })
  } finally {
    followLoading.value = false
  }
}

const goBack = () => {
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
.author-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-secondary);
}

.profile-hero {
  position: relative;
  flex-shrink: 0;
  padding-top: constant(safe-area-inset-top);
  padding-top: env(safe-area-inset-top);
  padding-bottom: 28rpx;
  overflow: hidden;
}

.cover-bg {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 320rpx;
  background:
    radial-gradient(circle at 16% 24%, rgba(255, 183, 116, 0.42) 0%, rgba(255, 183, 116, 0) 52%),
    radial-gradient(circle at 82% 14%, rgba(107, 203, 166, 0.34) 0%, rgba(107, 203, 166, 0) 48%),
    linear-gradient(138deg, #1c3856 0%, #245063 52%, #2f435f 100%);
}

.cover-spot {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}

.cover-spot-left {
  width: 260rpx;
  height: 260rpx;
  left: -50rpx;
  top: 112rpx;
  background: radial-gradient(circle, rgba(255, 138, 76, 0.38) 0%, rgba(255, 138, 76, 0) 72%);
}

.cover-spot-right {
  width: 320rpx;
  height: 320rpx;
  right: -84rpx;
  top: -68rpx;
  background: radial-gradient(circle, rgba(80, 227, 194, 0.32) 0%, rgba(80, 227, 194, 0) 72%);
}

.hero-top {
  position: relative;
  z-index: 3;
  padding: 16rpx 24rpx 0;
}

.back-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  border: 1rpx solid rgba(255, 255, 255, 0.24);
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-card {
  position: relative;
  z-index: 3;
  margin: 20rpx 20rpx 0;
  border-radius: 26rpx;
  padding: 22rpx;
  background: rgba(255, 255, 255, 0.92);
  border: 1rpx solid rgba(255, 255, 255, 0.38);
}

.hero-row {
  display: flex;
  align-items: flex-end;
  gap: 16rpx;
}

.hero-avatar {
  width: 116rpx;
  height: 116rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(255, 255, 255, 0.94);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(17, 32, 52, 0.24);
}

.hero-avatar-text {
  font-size: 46rpx;
  font-weight: 800;
  color: #fff;
}

.hero-info {
  flex: 1;
  min-width: 0;
}

.hero-name {
  display: block;
  font-size: 36rpx;
  font-weight: 800;
  color: var(--text-primary);
}

.hero-bio {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  line-height: 1.52;
  color: var(--text-secondary);
}

.hero-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-top: 10rpx;
}

.hero-tag {
  border-radius: 999rpx;
  padding: 5rpx 12rpx;
  background: var(--primary-light);
}

.hero-tag-text {
  font-size: 18rpx;
  color: var(--primary-color);
}

.follow-btn {
  flex-shrink: 0;
  height: 64rpx;
  border-radius: 999rpx;
  padding: 0 28rpx;
  margin-bottom: 6rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--orange-gradient);
  box-shadow: 0 8rpx 18rpx rgba(228, 92, 26, 0.24);
}

.follow-btn.following {
  background: var(--primary-light);
  border: 1rpx solid var(--primary-border);
  box-shadow: none;
}

.follow-btn.loading {
  opacity: 0.6;
}

.follow-text {
  font-size: 24rpx;
  font-weight: 700;
  color: #fff;
}

.follow-btn.following .follow-text {
  color: var(--primary-color);
}

.author-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0 20rpx 0;
}

.stats-card {
  border-radius: 22rpx;
  padding: 12rpx 0;
  display: flex;
  align-items: center;
  background: var(--card-bg);
}

.stat-item {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  padding: 10rpx 0;
}

.stat-item + .stat-item {
  border-left: 1rpx solid var(--border-color);
}

.stat-number {
  font-size: 32rpx;
  line-height: 1;
  font-weight: 800;
  color: var(--text-primary);
}

.stat-copy .stat-number {
  color: var(--orange-color);
}

.stat-rate .stat-number {
  color: var(--green-color);
}

.stat-label {
  font-size: 20rpx;
  color: var(--text-tertiary);
}

.tabs-wrap {
  margin-top: 16rpx;
  display: flex;
  align-items: stretch;
  background: var(--card-bg);
  border-radius: 18rpx 18rpx 0 0;
  border-bottom: 1rpx solid var(--border-color);
}

.tab-item {
  flex: 1;
  height: 80rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  gap: 0;
}

.tab-indicator {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 4rpx;
  border-radius: 999rpx;
  background: var(--orange-color);
  transition: width 0.2s ease;
}

.tab-item.active .tab-indicator {
  width: 40rpx;
}

.tab-text {
  font-size: 27rpx;
  font-weight: 600;
  color: var(--text-tertiary);
}

.tab-item.active .tab-text {
  color: var(--text-primary);
  font-weight: 700;
}

.content-scroll {
  flex: 1;
  min-height: 0;
  background: var(--card-bg);
  border-radius: 0 0 18rpx 18rpx;
  margin-bottom: 14rpx;
}

.skills-list,
.feedbacks-list {
  padding: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.skill-card,
.feedback-card,
.empty-box {
  border-radius: 22rpx;
  padding: 20rpx;
  background: var(--card-bg);
}

.skill-head,
.feedback-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10rpx;
}

.skill-scene {
  border-radius: 999rpx;
  background: var(--accent-light);
  padding: 5rpx 12rpx;
}

.skill-scene-text {
  font-size: 18rpx;
  font-weight: 700;
  color: var(--orange-color);
}

.skill-time {
  font-size: 20rpx;
  color: var(--text-tertiary);
}

.skill-title {
  display: block;
  margin-top: 12rpx;
  font-size: 29rpx;
  line-height: 1.45;
  font-weight: 800;
  color: var(--text-primary);
}

.skill-model {
  display: block;
  margin-top: 8rpx;
  font-size: 20rpx;
  color: var(--text-gray);
}

.skill-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-top: 14rpx;
}

.meta-chip {
  display: flex;
  align-items: center;
  gap: 6rpx;
  border-radius: 10rpx;
  padding: 8rpx 12rpx;
  background: rgba(26, 26, 26, 0.06);
}

.chip-token {
  background: var(--accent-light);
}

.chip-rate {
  background: rgba(47, 138, 87, 0.12);
}

.meta-chip-text {
  font-size: 20rpx;
  font-weight: 600;
  color: var(--text-gray);
}

.chip-token .meta-chip-text {
  color: var(--orange-color);
}

.chip-rate .meta-chip-text {
  color: var(--green-color);
}

.copy-btn {
  margin-top: 16rpx;
  height: 72rpx;
  border-radius: 14rpx;
  background: var(--orange-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
}

.copy-btn-text {
  font-size: 25rpx;
  font-weight: 700;
  color: #fff;
}

.feedback-title {
  flex: 1;
  min-width: 0;
  font-size: 26rpx;
  font-weight: 700;
  color: var(--text-primary);
}

.feedback-status {
  flex-shrink: 0;
  border-radius: 999rpx;
  padding: 6rpx 16rpx;
}

.status-success {
  background: rgba(47, 138, 87, 0.12);
  color: var(--green-color);
}

.status-normal {
  background: rgba(94, 115, 138, 0.12);
  color: var(--blue-color);
}

.feedback-status-text {
  font-size: 20rpx;
  font-weight: 700;
}

.feedback-meta {
  margin-top: 12rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.feedback-model {
  font-size: 20rpx;
  color: var(--text-tertiary);
}

.feedback-token-wrap {
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.feedback-token {
  font-size: 22rpx;
  font-weight: 700;
  color: var(--orange-color);
}

.feedback-comment {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: var(--text-secondary);
}

.empty-box {
  border: 1rpx dashed var(--border-color);
  padding: 38rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.empty-title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-primary);
}

.empty-desc {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: var(--text-tertiary);
}

.scroll-bottom {
  height: calc(52rpx + env(safe-area-inset-bottom));
}

/* #ifdef H5 */
.profile-hero {
  padding-top: var(--h5-safe-area-inset-top, 0px) !important;
}
/* #endif */

@supports not (gap: 1px) {
  .hero-row > * + * { margin-left: 16rpx; }
  .hero-tags > * + * { margin-left: 8rpx; }
  .tabs-wrap > * + * { margin-left: 8rpx; }
  .skills-list > * + * { margin-top: 14rpx; }
  .feedbacks-list > * + * { margin-top: 14rpx; }
  .skill-meta > * + * { margin-left: 10rpx; }
  .feedback-meta > * + * { margin-left: 16rpx; }
}
</style>
