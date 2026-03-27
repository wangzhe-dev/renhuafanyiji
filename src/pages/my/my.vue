<template>
  <scroll-view class="page" scroll-y :show-scrollbar="false">
    <view class="section profile-section">
      <view class="profile-card card-shadow">
        <!-- 未登录 -->
        <view v-if="!isLoggedIn" class="pc-row pc-guest" @tap="goLogin">
          <view class="avatar-wrap">
            <view class="avatar avatar-guest">
              <uni-icons type="person" size="40" color="#C8CBD4" />
            </view>
          </view>
          <view class="pc-info">
            <text class="pc-name">登录 / 注册</text>
            <text class="pc-bio">登录后可查看完整创作数据与历史记录</text>
            <view class="pc-tags">
              <text class="pc-tag pc-tag-cta">立即登录</text>
            </view>
          </view>
          <uni-icons type="right" size="14" color="#C8CBD4" />
        </view>

        <!-- 已登录 -->
        <view v-else class="pc-row">
          <view class="avatar-wrap">
            <view class="avatar">
              <text class="avatar-t">{{ profile.name[0] || '我' }}</text>
            </view>
            <view class="lv-badge">Lv.4</view>
          </view>
          <view class="pc-info">
            <text class="pc-name">{{ profile.name }}</text>
            <text class="pc-bio">{{ profile.bio }}</text>
            <view class="pc-tags">
              <text v-for="tag in profile.tags" :key="tag" class="pc-tag">{{ tag }}</text>
            </view>
          </view>
          <view class="edit-btn" @tap="editProfile">
            <uni-icons type="compose" size="17" color="#9CA3AF" />
          </view>
        </view>

        <view class="stats-bar" :class="{ 'stats-dim': !isLoggedIn }">
          <view class="stat-item">
            <text class="sv">{{ isLoggedIn ? profile.publishedSkillCount : '--' }}</text>
            <text class="sl">发布 Skill</text>
          </view>
          <view class="stat-div" />
          <view class="stat-item">
            <text class="sv orange">{{ isLoggedIn ? profile.totalCopyCount : '--' }}</text>
            <text class="sl">被复制</text>
          </view>
          <view class="stat-div" />
          <view class="stat-item">
            <text class="sv green">{{ isLoggedIn ? profile.avgSuccessRate : '--' }}</text>
            <text class="sl">平均复现率</text>
          </view>
        </view>

        <view v-if="isLoggedIn" class="quick-actions-wrap">
          <view class="qa-card qa-card-publish" @tap="toPublishPage">
            <view class="qa-card-deco" />
            <view class="qa-card-icon qa-card-icon-publish">
              <uni-icons type="plusempty" size="20" color="#fff" />
            </view>
            <view class="qa-card-body">
              <text class="qa-card-title">发布新 Skill</text>
              <text class="qa-card-desc">沉淀可复用经验，帮助更多人</text>
            </view>
            <view class="qa-card-arrow qa-card-arrow-publish">
              <uni-icons type="right" size="12" color="#E45C1A" />
            </view>
          </view>

          <view class="qa-card qa-card-data" @tap="toMyDataCenterHome">
            <view class="qa-card-deco" />
            <view class="qa-card-icon qa-card-icon-data">
              <uni-icons type="bars" size="20" color="#fff" />
            </view>
            <view class="qa-card-body">
              <text class="qa-card-title">我的数据中心</text>
              <text class="qa-card-desc">查看发布、收藏、点赞、复制</text>
            </view>
            <view class="qa-card-arrow qa-card-arrow-data">
              <uni-icons type="right" size="12" color="#5B5BD6" />
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-head">
        <text class="section-title">我的数据</text>
        <text class="section-sub">创作轨迹与互动结果</text>
      </view>

      <view v-if="!isLoggedIn" class="guest-block card-shadow" @tap="goLogin">
        <view class="gb-inner">
          <text class="gb-icon">📊</text>
          <text class="gb-text">登录后查看发布、收藏、点赞、复制记录</text>
          <view class="gb-btn">去登录</view>
        </view>
      </view>

      <view v-else class="data-grid">
        <view class="data-grid-item card-shadow" @tap="toMyDataCenter('publish')">
          <view class="dgi-icon dgi-icon-publish">
            <uni-icons type="compose" size="18" color="#E45C1A" />
          </view>
          <text class="dgi-title">发布</text>
          <text class="dgi-count">{{ dataSummary.published }}</text>
          <text class="dgi-sub">我发布的 Skill</text>
        </view>

        <view class="data-grid-item card-shadow" @tap="toMyDataCenter('favorite')">
          <view class="dgi-icon dgi-icon-favorite">
            <uni-icons type="heart" size="18" color="#5B5BD6" />
          </view>
          <text class="dgi-title">收藏</text>
          <text class="dgi-count">{{ dataSummary.favorite }}</text>
          <text class="dgi-sub">收藏的优质内容</text>
        </view>

        <view class="data-grid-item card-shadow" @tap="toMyDataCenter('like')">
          <view class="dgi-icon dgi-icon-like">
            <uni-icons type="chat" size="18" color="#2F8A57" />
          </view>
          <text class="dgi-title">点赞</text>
          <text class="dgi-count">{{ dataSummary.like }}</text>
          <text class="dgi-sub">点赞过的动态</text>
        </view>

        <view class="data-grid-item card-shadow" @tap="toMyDataCenter('copy')">
          <view class="dgi-icon dgi-icon-copy">
            <uni-icons type="paperplane" size="18" color="#0B8B8C" />
          </view>
          <text class="dgi-title">复制</text>
          <text class="dgi-count">{{ dataSummary.copy }}</text>
          <text class="dgi-sub">复制使用记录</text>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-head">
        <text class="section-title">设置与服务</text>
      </view>

      <view class="settings-card card-shadow">
        <view class="settings-row" @tap="clearCache">
          <view class="settings-icon-box">
            <uni-icons type="trash" color="#9CA3AF" size="17" />
          </view>
          <text class="settings-label">清除缓存</text>
          <text class="settings-hint">{{ cacheSize }}</text>
          <uni-icons type="right" size="13" color="#C8CBD4" />
        </view>

        <view class="settings-row" @tap="showAbout">
          <view class="settings-icon-box">
            <uni-icons type="info-filled" color="#9CA3AF" size="17" />
          </view>
          <text class="settings-label">关于烧不起</text>
          <text class="settings-hint">v{{ appVersionLabel }}</text>
          <uni-icons type="right" size="13" color="#C8CBD4" />
        </view>

        <view class="settings-row" @tap="toFeedback">
          <view class="settings-icon-box settings-icon-feedback">
            <uni-icons type="chat" color="#5B5BD6" size="17" />
          </view>
          <text class="settings-label">意见反馈</text>
          <uni-icons type="right" size="13" color="#C8CBD4" />
        </view>

        <view class="settings-row" @tap="showCoopPopup = true">
          <view class="settings-icon-box settings-icon-coop">
            <uni-icons type="heart" color="#FF7A45" size="17" />
          </view>
          <text class="settings-label">商务合作</text>
          <uni-icons type="right" size="13" color="#C8CBD4" />
        </view>

        <view v-if="!isLoggedIn" class="settings-row last login-row" @tap="goLogin">
          <view class="settings-icon-box settings-icon-login">
            <uni-icons type="person" color="#5B5BD6" size="17" />
          </view>
          <text class="settings-label login-label">登录 / 注册</text>
          <uni-icons type="right" size="13" color="#5B5BD6" />
        </view>

        <view v-else class="settings-row last logout-row" @tap="logoutConfirm">
          <view class="settings-icon-box">
            <uni-icons type="undo" color="#E45C1A" size="17" />
          </view>
          <text class="settings-label logout-label">退出登录</text>
          <uni-icons type="right" size="13" color="#EABAA7" />
        </view>
      </view>
    </view>

    <view class="page-bottom" />
  </scroll-view>

  <view v-if="showCoopPopup" class="popup-mask" @tap="showCoopPopup = false">
    <view class="popup-sheet" @tap.stop>
      <view class="popup-handle" />
      <text class="popup-title">商务合作</text>
      <text class="popup-subtitle">欢迎与我们合作，点击可一键复制</text>

      <view class="contact-list">
        <view class="contact-item" @tap="copyContact('1320100598@qq.com', '邮箱')">
          <view class="contact-icon-box contact-icon-email">
            <uni-icons class="contact-icon" type="email-filled" size="24" color="#5B5BD6" />
          </view>
          <view class="contact-info">
            <text class="contact-type">邮箱</text>
            <text class="contact-value">1320100598@qq.com</text>
          </view>
          <view class="copy-badge">复制</view>
        </view>

        <view class="contact-item" @tap="copyContact('13701085362', '手机号')">
          <view class="contact-icon-box contact-icon-phone">
            <uni-icons class="contact-icon" type="phone-filled" size="24" color="#2F8A57" />
          </view>
          <view class="contact-info">
            <text class="contact-type">手机</text>
            <text class="contact-value">13701085362</text>
          </view>
          <view class="copy-badge">复制</view>
        </view>

        <view class="contact-item" @tap="copyContact('wa1320100598', '微信号')">
          <view class="contact-icon-box contact-icon-wechat">
            <uni-icons class="contact-icon" type="weixin" size="24" color="#FF7A45" />
          </view>
          <view class="contact-info">
            <text class="contact-type">微信</text>
            <text class="contact-value">wa1320100598</text>
          </view>
          <view class="copy-badge">复制</view>
        </view>
      </view>

      <view class="popup-close-btn" @tap="showCoopPopup = false">
        <text class="popup-close-text">我知道了</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { getMyCopies, getMyFavorites, getMyLikes, getMyProfile, getMySummary } from '@/api/me'
import appManifest from '@/manifest.json'
import { useUserStore } from '@/stores'
import { checkAppUpdate, getCurrentAppVersionLabel } from '@/utils/app-update'
import { getCurrentInstance } from 'vue'

const instance = getCurrentInstance()
const userStore = useUserStore()
const isLoggedIn = computed(() => !!userStore.token)

const profile = reactive({
  name: '我',
  bio: '不断验证Skill，不断分享经验',
  tags: ['Skill'],
  publishedSkillCount: '0',
  totalCopyCount: '0',
  avgSuccessRate: '--'
})

const dataSummary = reactive({
  published: '--',
  favorite: '--',
  like: '--',
  copy: '--'
})

const appVersionLabel = ref(String(appManifest.versionName || '1.0.0'))

const resetProfile = () => {
  profile.name = '我'
  profile.bio = '不断验证Skill，不断分享经验'
  profile.tags = ['Skill']
  profile.publishedSkillCount = '0'
  profile.totalCopyCount = '0'
  profile.avgSuccessRate = '--'
}

const resetSummary = (value = '--') => {
  dataSummary.published = value
  dataSummary.favorite = value
  dataSummary.like = value
  dataSummary.copy = value
}

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

const loadLegacySummary = async () => {
  const [favoriteData, likeData, copyData] = await Promise.all([
    getMyFavorites({ page: 1, pageSize: 1 }).catch(() => null),
    getMyLikes({ page: 1, pageSize: 1 }).catch(() => null),
    getMyCopies({ page: 1, pageSize: 1 }).catch(() => null)
  ])

  if (favoriteData) dataSummary.favorite = formatCount(Number(favoriteData.pagination?.total ?? 0))
  if (likeData) dataSummary.like = formatCount(Number(likeData.pagination?.total ?? 0))
  if (copyData) dataSummary.copy = formatCount(Number(copyData.pagination?.total ?? 0))
}

const loadMyData = async () => {
  if (!userStore.token) {
    resetProfile()
    resetSummary()
    return
  }

  resetSummary()

  const [me, summary] = await Promise.all([
    getMyProfile().catch(() => null),
    getMySummary().catch(() => null)
  ])

  if (me) {
    profile.name = me.nickname || '我'
    profile.bio = me.bio || '不断验证Skill，不断分享经验'
    profile.tags = me.bio ? ['创作者'] : ['Skill']
    profile.publishedSkillCount = formatCount(me.publishedSkillCount)
    profile.totalCopyCount = formatCount(me.totalCopyCount)
    profile.avgSuccessRate = formatRate(me.avgSuccessRate)
  }

  if (summary) {
    dataSummary.published = formatCount(summary.publishedCount)
    dataSummary.favorite = formatCount(summary.favoriteCount)
    dataSummary.like = formatCount(summary.likeCount)
    dataSummary.copy = formatCount(summary.copyCount)
    return
  }

  if (me) {
    dataSummary.published = formatCount(me.publishedSkillCount)
  }
  await loadLegacySummary()
}

onShow(() => {
  // #ifdef MP-WEIXIN
  uni.getTabBar(instance?.proxy)?.setData({ selected: 2 })
  // #endif
  void loadMyData()
})

watch(isLoggedIn, (val) => {
  if (val) {
    void loadMyData()
    return
  }
  resetProfile()
  resetSummary()
})

const cacheSize = ref('计算中...')
onMounted(() => {
  uni.getStorageInfo({
    success: (res) => {
      const kb = res.currentSize
      cacheSize.value = kb < 1024 ? `${kb} KB` : `${(kb / 1024).toFixed(1)} MB`
    },
    fail: () => {
      cacheSize.value = ''
    }
  })

  // #ifdef APP-PLUS
  appVersionLabel.value = getCurrentAppVersionLabel()
  // #endif
})

const goLogin = () => {
  uni.navigateTo({ url: '/pages/login/index' })
}

const toPublishPage = () => {
  uni.switchTab({ url: '/pages/publish/index' })
}

const toMyDataCenterHome = () => {
  uni.navigateTo({ url: '/pages/my/data' })
}

const toMyDataCenter = (tab: 'publish' | 'favorite' | 'like' | 'copy') => {
  uni.navigateTo({ url: `/pages/my/data?tab=${tab}` })
}

const editProfile = () => {
  uni.showToast({ title: '编辑资料开发中', icon: 'none' })
}

const toFeedback = () => {
  uni.navigateTo({ url: '/pages/feedback/index' })
}

const showCoopPopup = ref(false)
const copyContact = (text: string, label: string) => {
  showCoopPopup.value = false
  uni.setClipboardData({
    data: text,
    success: () => {
      uni.showToast({ title: `${label}已复制`, icon: 'success' })
    },
    fail: () => {
      uni.showToast({ title: '复制失败，请重试', icon: 'none' })
    }
  })
}

const clearCache = () => {
  uni.showModal({
    title: '清除缓存',
    content: '确定要清除本地缓存吗？',
    confirmColor: '#E45C1A',
    success: ({ confirm }) => {
      if (!confirm) return
      uni.clearStorageSync()
      cacheSize.value = '0 KB'
      uni.showToast({ title: '缓存已清除', icon: 'success' })
    }
  })
}

const showAbout = () => {
  let appPlusMode = false
  // #ifdef APP-PLUS
  appPlusMode = true
  // #endif

  if (appPlusMode) {
    uni.showModal({
      title: '烧不起',
      content: `版本 v${appVersionLabel.value}\n\n记录 AI 消耗，共享高效 Skill。\n\n© 2025 烧不起团队`,
      showCancel: true,
      cancelText: '知道了',
      confirmText: '检查更新',
      confirmColor: '#5B5BD6',
      success: ({ confirm }) => {
        if (confirm) void checkAppUpdate({ manual: true })
      }
    })
    return
  }

  uni.showModal({
    title: '烧不起',
    content: `版本 v${appVersionLabel.value}\n\n记录 AI 消耗，共享高效 Skill。\n\n© 2025 烧不起团队`,
    showCancel: false,
    confirmText: '知道了',
    confirmColor: '#5B5BD6'
  })
}

const logoutConfirm = () => {
  uni.showModal({
    title: '退出登录',
    content: '确定要退出当前账号吗？',
    confirmText: '退出',
    confirmColor: '#E45C1A',
    success: ({ confirm }) => {
      if (!confirm) return
      userStore.logout()
    }
  })
}
</script>

<style lang="scss" scoped>
.page {
  height: 100%;
  background: var(--bg-secondary);
}

.section {
  padding: 0 24rpx 20rpx;
}

.profile-section {
  padding-top: calc(constant(safe-area-inset-top) + 16rpx);
  padding-top: calc(env(safe-area-inset-top) + 16rpx);
}

/* #ifdef H5 */
.profile-section {
  padding-top: calc(var(--h5-safe-area-inset-top, 0px) + 16rpx);
}

/* #endif */

.profile-card {
  border-radius: 28rpx;
  padding: 24rpx;
}

.pc-row {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
}

.pc-guest {
  align-items: center;

  &:active {
    opacity: 0.75;
  }
}

.avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: var(--primary-color);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6rpx 20rpx var(--primary-shadow);
}

.avatar-t {
  font-size: 40rpx;
  color: #fff;
  font-weight: 800;
}

.avatar-guest {
  background: var(--bg-secondary);
  box-shadow: none;
  border: 2rpx solid var(--border-light);
}

.lv-badge {
  position: absolute;
  bottom: -4rpx;
  right: -6rpx;
  font-size: 17rpx;
  font-weight: 700;
  color: var(--accent-color);
  background: var(--accent-bg);
  border: 2rpx solid var(--accent-border);
  padding: 2rpx 10rpx;
  border-radius: 100rpx;
}

.pc-info {
  flex: 1;
  min-width: 0;
  padding-top: 4rpx;
}

.pc-name {
  display: block;
  font-size: 34rpx;
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: 8rpx;
}

.pc-bio {
  display: block;
  font-size: 24rpx;
  color: var(--text-gray);
  line-height: 1.5;
  margin-bottom: 12rpx;
}

.pc-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.pc-tag {
  font-size: 18rpx;
  color: var(--primary-color);
  font-weight: 500;
  background: var(--primary-light);
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
}

.pc-tag-cta {
  color: var(--accent-color);
  background: var(--accent-light);
  font-weight: 600;
}

.edit-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 16rpx;
  background: rgba(0, 0, 0, 0.04);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &:active {
    background: rgba(0, 0, 0, 0.08);
  }
}

.stats-bar {
  display: flex;
  align-items: center;
  padding: 20rpx 0 0;
  margin-top: 20rpx;
  border-top: 1rpx solid var(--border-color-light);

  &.stats-dim {
    opacity: 0.35;
    pointer-events: none;
  }
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}

.sv {
  font-size: 32rpx;
  font-weight: 900;
  color: var(--text-primary);
}

.sv.orange {
  color: var(--orange-color);
}

.sv.green {
  color: var(--green-color);
}

.sl {
  font-size: 20rpx;
  color: var(--text-muted);
}

.stat-div {
  width: 1rpx;
  height: 36rpx;
  background: var(--border-color-light);
}

.quick-actions-wrap {
  margin-top: 24rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid var(--border-color-light);
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.qa-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 22rpx 20rpx;
  border-radius: 20rpx;
  overflow: hidden;
  transition: transform 0.15s ease;

  &:active {
    transform: scale(0.97);
    opacity: 0.88;
  }
}

.qa-card-deco {
  position: absolute;
  top: -40rpx;
  right: -30rpx;
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  opacity: 0.12;
  pointer-events: none;
}

.qa-card-publish {
  background: linear-gradient(135deg, rgba(228, 92, 26, 0.10) 0%, rgba(228, 92, 26, 0.04) 100%);
  border: 1rpx solid rgba(228, 92, 26, 0.18);

  .qa-card-deco {
    background: radial-gradient(circle, #E45C1A 0%, transparent 70%);
  }
}

.qa-card-data {
  background: linear-gradient(135deg, rgba(91, 91, 214, 0.10) 0%, rgba(91, 91, 214, 0.04) 100%);
  border: 1rpx solid rgba(91, 91, 214, 0.18);

  .qa-card-deco {
    background: radial-gradient(circle, #5B5BD6 0%, transparent 70%);
  }
}

.qa-card-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.qa-card-icon-publish {
  background: linear-gradient(145deg, #F27A3A, #E45C1A);
  box-shadow: 0 6rpx 16rpx rgba(228, 92, 26, 0.30);
}

.qa-card-icon-data {
  background: linear-gradient(145deg, #7B7BE8, #5B5BD6);
  box-shadow: 0 6rpx 16rpx rgba(91, 91, 214, 0.30);
}

.qa-card-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.qa-card-title {
  font-size: 27rpx;
  color: var(--text-primary);
  font-weight: 700;
  line-height: 1.3;
}

.qa-card-desc {
  font-size: 22rpx;
  color: var(--text-muted);
  line-height: 1.4;
}

.qa-card-arrow {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.qa-card-arrow-publish {
  background: rgba(228, 92, 26, 0.12);
}

.qa-card-arrow-data {
  background: rgba(91, 91, 214, 0.12);
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6rpx 4rpx 14rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-primary);
}

.section-sub {
  font-size: 22rpx;
  color: var(--text-muted);
}

.guest-block {
  border-radius: 24rpx;
  border: 1rpx dashed var(--primary-border);

  &:active {
    background: var(--primary-bg);
  }
}

.gb-inner {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 28rpx 24rpx;
}

.gb-icon {
  font-size: 36rpx;
  flex-shrink: 0;
}

.gb-text {
  flex: 1;
  font-size: 25rpx;
  color: var(--text-muted);
}

.gb-btn {
  font-size: 24rpx;
  color: var(--primary-color);
  font-weight: 600;
  background: var(--primary-light);
  padding: 8rpx 20rpx;
  border-radius: 100rpx;
  flex-shrink: 0;
}

.data-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14rpx;
}

.data-grid-item {
  min-height: 210rpx;
  border-radius: 22rpx;
  padding: 20rpx 18rpx;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8rpx;

  &:active {
    background: var(--primary-bg);
  }
}

.dgi-icon {
  width: 50rpx;
  height: 50rpx;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dgi-icon-publish {
  background: rgba(228, 92, 26, 0.12);
}

.dgi-icon-favorite {
  background: var(--primary-light-12);
}

.dgi-icon-like {
  background: rgba(47, 138, 87, 0.12);
}

.dgi-icon-copy {
  background: var(--teal-light);
}

.dgi-title {
  font-size: 24rpx;
  color: var(--text-muted);
}

.dgi-count {
  font-size: 36rpx;
  color: var(--text-primary);
  font-weight: 800;
  line-height: 1.1;
}

.dgi-sub {
  margin-top: auto;
  font-size: 21rpx;
  color: var(--text-gray);
  line-height: 1.35;
}

.settings-card {
  border-radius: 24rpx;
  overflow: hidden;
}

.settings-row {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 24rpx 20rpx;
  border-bottom: 1rpx solid var(--border-color-light);

  &.last {
    border-bottom: none;
  }

  &:active {
    background: var(--primary-bg);
  }
}

.settings-icon-box {
  width: 52rpx;
  height: 52rpx;
  border-radius: 14rpx;
  background: rgba(0, 0, 0, 0.04);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.settings-icon-login,
.settings-icon-feedback {
  background: var(--primary-light);
}

.settings-icon-coop {
  background: var(--accent-light);
}

.settings-label {
  flex: 1;
  font-size: 28rpx;
  color: var(--text-primary);
  font-weight: 500;
}

.settings-hint {
  font-size: 24rpx;
  color: var(--text-muted);
  margin-right: 6rpx;
}

.logout-row {
  background: rgba(228, 92, 26, 0.04);
}

.logout-label {
  color: var(--orange-color) !important;
  font-weight: 600;
}

.login-row {
  background: rgba(91, 91, 214, 0.03);
}

.login-label {
  color: var(--primary-color) !important;
  font-weight: 600;
}

.page-bottom {
  height: calc(80rpx + env(safe-area-inset-bottom));
}

.popup-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
}

.popup-sheet {
  width: 100%;
  background: var(--card-bg);
  border-radius: 32rpx 32rpx 0 0;
  padding: 0 32rpx calc(40rpx + env(safe-area-inset-bottom));
}

.popup-handle {
  width: 72rpx;
  height: 8rpx;
  background: var(--border-light);
  border-radius: 100rpx;
  margin: 20rpx auto 32rpx;
}

.popup-title {
  display: block;
  font-size: 34rpx;
  font-weight: 800;
  color: var(--text-primary);
  text-align: center;
  margin-bottom: 8rpx;
}

.popup-subtitle {
  display: block;
  font-size: 24rpx;
  color: var(--text-muted);
  text-align: center;
  margin-bottom: 32rpx;
}

.contact-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-bottom: 32rpx;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  background: var(--bg-secondary);
  border-radius: 20rpx;

  &:active {
    background: var(--primary-bg);
  }
}

.contact-icon-box {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.contact-icon-email {
  background: var(--primary-light-10);
}

.contact-icon-phone {
  background: rgba(47, 138, 87, 0.1);
}

.contact-icon-wechat {
  background: var(--accent-light);
}

.contact-icon {
  line-height: 1;
}

.contact-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.contact-type {
  font-size: 22rpx;
  color: var(--text-muted);
}

.contact-value {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--text-primary);
}

.copy-badge {
  font-size: 22rpx;
  color: var(--primary-color);
  font-weight: 600;
  background: var(--primary-light);
  padding: 8rpx 20rpx;
  border-radius: 100rpx;
  flex-shrink: 0;
}

.popup-close-btn {
  height: 88rpx;
  background: var(--bg-secondary);
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  &:active {
    background: #EDEEF0;
  }
}

.popup-close-text {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--text-gray);
}
</style>
