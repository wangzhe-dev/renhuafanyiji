<template>
  <view class="page">
    <!-- 红色光晕装饰 -->
    <view class="glow-bg" />

    <!-- 顶部品牌区 -->
    <view class="brand">
      <view class="brand-row">
        <view class="brand-logo">🔍</view>
        <text class="brand-name">人话翻译机</text>
      </view>
      <text class="brand-slogan">粘贴话术，一键看穿真相</text>
    </view>

    <!-- 场景选择栏 -->
    <scroll-view class="scene-bar" scroll-x enable-flex :show-scrollbar="false">
      <view
        v-for="(scene, idx) in scenes"
        :key="scene.id"
        class="scene-pill"
        :class="{
          'scene-pill--active': currentScene === idx,
          'scene-pill--green': currentScene === idx && scene.id === 'reverse'
        }"
        @tap="currentScene = idx"
      >
        {{ scene.icon }} {{ scene.label }}
      </view>
    </scroll-view>

    <!-- 文本输入区 -->
    <view class="input-card" :class="{ 'input-card--focus': isFocused }">
      <textarea
        v-model="inputText"
        class="input-textarea"
        :placeholder="currentSceneConfig.placeholder"
        placeholder-class="input-placeholder"
        :maxlength="500"
        auto-height
        @focus="isFocused = true"
        @blur="isFocused = false"
      />
      <view class="input-divider" />
      <view class="input-actions">
        <text class="input-count">{{ inputText.length }}/500</text>
        <view class="input-btns">
          <view class="btn-paste" @tap="handlePaste">📋 粘贴</view>
          <view
            class="btn-translate"
            :class="{
              'btn-translate--disabled': !hasInputText || isLoading,
              'btn-translate--green': currentSceneConfig.id === 'reverse'
            }"
            @tap="handleTranslate"
          >
            {{ currentSceneConfig.id === 'reverse' ? '✨ 上妆' : '🔍 翻译人话' }}
          </view>
        </view>
      </view>
    </view>

    <!-- 加载态 -->
    <view v-if="isLoading" class="loading">
      <text class="loading-main">
        {{ currentSceneConfig.id === 'reverse' ? '✨ 正在疯狂上妆…' : '🔍 正在粉碎话术…' }}
      </text>
      <text class="loading-sub">AI 正在扒开 {{ loadingLayers }} 层包装</text>
    </view>

    <!-- 翻译结果区 -->
    <view v-if="result && !isLoading" class="result" :class="{ 'result--show': showResult }">
      <!-- 妆感浓度仪表 -->
      <view class="meter-card">
        <view class="meter-left">
          <text class="meter-label">
            {{ currentSceneConfig.id === 'reverse' ? '💄 上妆浓度' : '💄 妆感浓度' }}
          </text>
          <view class="meter-track">
            <view class="meter-fill" :style="{ width: animatedScore + '%' }" />
          </view>
          <view class="meter-scale">
            <text class="meter-scale-item">素颜</text>
            <text class="meter-scale-item">淡妆</text>
            <text class="meter-scale-item">浓妆</text>
            <text class="meter-scale-item">整容</text>
          </view>
        </view>
        <view class="meter-right">
          <view class="meter-score-row">
            <text class="meter-score">{{ result.score }}</text>
            <text class="meter-percent">%</text>
          </view>
          <text class="meter-verdict">{{ result.verdict }}</text>
        </view>
      </view>

      <!-- 翻译结果卡片 -->
      <view class="result-card">
        <!-- 原文 -->
        <view class="result-section">
          <view class="result-label">
            <view class="dot dot--red" />
            <text class="result-label-text result-label-text--red">
              {{ currentSceneConfig.id === 'reverse' ? '原文 · 大白话' : '原文 · 话术版' }}
            </text>
          </view>
          <text class="result-original">{{ inputText }}</text>
        </view>

        <!-- 人话翻译 -->
        <view class="result-section result-section--green-bg">
          <view class="result-label">
            <view class="dot dot--green" />
            <text class="result-label-text result-label-text--green">
              {{ currentSceneConfig.id === 'reverse' ? '上妆 · 高大上版' : '人话 · 真实含义' }}
            </text>
          </view>
          <text class="result-human">{{ result.humanText }}</text>
        </view>

        <!-- 逐句拆解 -->
        <view class="result-section">
          <view class="result-label">
            <text class="result-label-text result-label-text--gray">🔬 逐句拆解</text>
          </view>
          <view
            v-for="(item, idx) in result.breakdown"
            :key="idx"
            class="breakdown-row"
            :class="{ 'breakdown-row--border': idx > 0 }"
          >
            <text class="breakdown-from">{{ item.from }}</text>
            <text class="breakdown-arrow">→</text>
            <text class="breakdown-to">{{ item.to }}</text>
          </view>
        </view>

        <!-- 操作按钮 -->
        <view class="action-bar">
          <view class="action-btn" @tap="handleShare">📤 分享</view>
          <view class="action-btn" @tap="handleCopy">📋 复制</view>
          <view class="action-btn action-btn--primary" @tap="handleReset">再译一条</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { onShareAppMessage } from '@dcloudio/uni-app'
import { scenes, type TranslationResult } from '@/config/scenes'
import { requestTranslation } from '@/utils/cloudbase'
import { normalizeTranslationResult } from '@/utils/translate'

// --- 状态 ---
const currentScene = ref(0)
const inputText = ref('')
const isFocused = ref(false)
const isLoading = ref(false)
const result = ref<TranslationResult | null>(null)
const showResult = ref(false)
const animatedScore = ref(0)

const currentSceneConfig = computed(() => scenes[currentScene.value])
const hasInputText = computed(() => inputText.value.trim().length > 0)
const loadingLayers = computed(() => Math.max(3, Math.floor(inputText.value.length / 10)))

function getReadableErrorMessage(error: any) {
  const message = `${error?.errMsg || error?.message || ''}`

  if (!message) {
    return '调用失败，请重试'
  }

  if (/publishable key|accesskey|access key/i.test(message)) {
    return 'CloudBase accessKey 无效，请检查 src/config/cloud.ts'
  }

  if (/signInWithOpenId|wx api undefined|login/i.test(message)) {
    return 'CloudBase 登录失败，请确认在微信开发者工具里运行并且环境配置正确'
  }

  if (/permission|unauthorized|forbidden/i.test(message)) {
    return 'CloudBase 权限不足，请检查 API Key、环境权限和 AI 开通状态'
  }

  if (/timeout|超时/i.test(message)) {
    return '模型响应超时，请重试一次'
  }

  if (/domain|url not in domain list|合法域名/i.test(message)) {
    return '请求域名未配置，请把 CloudBase 域名加入小程序 request 合法域名'
  }

  if (/AI\+ 请求出错|model|hunyuan|resource_exhausted/i.test(message)) {
    return 'AI 调用失败，请确认 AI 能力、模型权限和额度已开通'
  }

  return `调用失败：${message.slice(0, 120)}`
}

// --- 粘贴 ---
function handlePaste() {
  uni.getClipboardData({
    success: (res) => {
      if (res.data) {
        inputText.value = res.data.slice(0, 500)
      }
    }
  })
}

// --- 翻译 ---
async function handleTranslate() {
  if (!hasInputText.value) {
    uni.showToast({ title: '先输入要翻译的内容', icon: 'none' })
    return
  }
  if (isLoading.value) return

  isLoading.value = true
  result.value = null
  showResult.value = false
  animatedScore.value = 0

  try {
    console.log('[translate] start', {
      sceneId: currentSceneConfig.value.id,
      inputLength: inputText.value.trim().length
    })
    const rawText = await requestTranslation(
      currentSceneConfig.value.systemPrompt,
      inputText.value,
      currentSceneConfig.value.id,
      currentSceneConfig.value.temperature
    )
    const data = normalizeTranslationResult(rawText)

    if (data && data.humanText) {
      result.value = {
        humanText: data.humanText,
        score: Math.min(100, Math.max(0, Number(data.score) || 50)),
        verdict: data.verdict || '未知浓度',
        breakdown: Array.isArray(data.breakdown) ? data.breakdown : []
      }

      await nextTick()
      showResult.value = true

      // 进度条动画
      setTimeout(() => {
        animatedScore.value = result.value!.score
      }, 100)
    } else {
      uni.showToast({ title: 'AI 返回格式不对，请重试一次', icon: 'none', duration: 2500 })
    }
  } catch (error) {
    console.error('cloudbase ai failed:', error)
    uni.showToast({ title: getReadableErrorMessage(error), icon: 'none', duration: 3000 })
  } finally {
    isLoading.value = false
  }
}

// --- 复制 ---
function handleCopy() {
  if (!result.value) return
  const text = `【人话翻译机】\n原文：${inputText.value}\n人话：${result.value.humanText}\n妆感浓度：${result.value.score}%`
  uni.setClipboardData({
    data: text,
    success: () => uni.showToast({ title: '已复制', icon: 'success' })
  })
}

// --- 分享 ---
function handleShare() {
  uni.showToast({ title: '请点击右上角分享', icon: 'none' })
}

// --- 再译一条 ---
function handleReset() {
  inputText.value = ''
  result.value = null
  showResult.value = false
  animatedScore.value = 0
  uni.pageScrollTo({ scrollTop: 0, duration: 300 })
}

// --- 小程序分享 ---
onShareAppMessage(() => {
  const score = result.value?.score ?? 0
  return {
    title: `这段话的妆感浓度居然有${score}%！`,
    path: '/pages/index/index'
  }
})
</script>

<style lang="scss">
// 设计 token
$bg: #0a0a0f;
$card: #13131a;
$border: #2a2a3a;
$text: #e8e8f0;
$text-secondary: #6a6a80;
$text-weak: #4a4a5e;
$red: #ff4d4d;
$orange: #ff9100;
$green: #00e676;
$radius-lg: 28rpx;
$radius-sm: 20rpx;
$radius-pill: 40rpx;

.page {
  min-height: 100vh;
  background: $bg;
  padding: 0 0 80rpx;
  position: relative;
  overflow: hidden;
}

// --- 光晕 ---
.glow-bg {
  position: absolute;
  top: -60rpx;
  left: -60rpx;
  width: 260rpx;
  height: 260rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba($red, 0.25) 0%, transparent 70%);
  pointer-events: none;
}

// --- 品牌区 ---
.brand {
  padding: 100rpx 40rpx 0;
}
.brand-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.brand-logo {
  width: 72rpx;
  height: 72rpx;
  border-radius: 16rpx;
  background: linear-gradient(135deg, $red, $orange);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
}
.brand-name {
  font-size: 40rpx;
  font-weight: 900;
  background: linear-gradient(90deg, $red, $orange);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.brand-slogan {
  display: block;
  font-size: 24rpx;
  color: $text-secondary;
  margin-top: 8rpx;
  padding-left: 88rpx;
}

// --- 场景选择 ---
.scene-bar {
  white-space: nowrap;
  margin-top: 36rpx;
  padding: 0 40rpx;
}
.scene-pill {
  display: inline-flex;
  align-items: center;
  padding: 16rpx 28rpx;
  margin-right: 16rpx;
  border-radius: $radius-pill;
  background: $card;
  border: 2rpx solid $border;
  font-size: 26rpx;
  color: $text-secondary;
}
.scene-pill--active {
  background: rgba($red, 0.12);
  border-color: $red;
  color: $red;
  font-weight: 600;
}
.scene-pill--green {
  background: rgba($green, 0.10);
  border-color: $green;
  color: $green;
}

// --- 输入区 ---
.input-card {
  margin: 28rpx 40rpx 0;
  background: $card;
  border: 2rpx solid $border;
  border-radius: $radius-lg;
  padding: 28rpx 32rpx;
  transition: border-color 0.3s, box-shadow 0.3s;
}
.input-card--focus {
  border-color: $red;
  box-shadow: 0 0 6rpx rgba($red, 0.3);
}
.input-textarea {
  width: 100%;
  min-height: 160rpx;
  font-size: 30rpx;
  line-height: 1.7;
  color: $text;
  background: transparent;
}
.input-placeholder {
  color: $text-weak;
}
.input-divider {
  height: 1px;
  background: $border;
  margin: 20rpx 0;
}
.input-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.input-count {
  font-size: 22rpx;
  color: $text-weak;
}
.input-btns {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.btn-paste {
  font-size: 24rpx;
  color: $text-secondary;
  padding: 10rpx 20rpx;
}
.btn-translate {
  font-size: 26rpx;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(90deg, $red, $orange);
  padding: 16rpx 32rpx;
  border-radius: $radius-pill;
  box-shadow: 0 4rpx 16rpx rgba($red, 0.35);
}
.btn-translate--disabled {
  opacity: 0.4;
}
.btn-translate--green {
  background: linear-gradient(90deg, #00c853, $green);
  box-shadow: 0 4rpx 16rpx rgba($green, 0.35);
}

// --- 加载态 ---
.loading {
  text-align: center;
  margin-top: 48rpx;
}
.loading-main {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: $red;
  animation: breath 1.4s ease-in-out infinite;
}
.loading-sub {
  display: block;
  font-size: 24rpx;
  color: $text-secondary;
  margin-top: 12rpx;
}
@keyframes breath {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

// --- 结果区 ---
.result {
  margin: 36rpx 40rpx 0;
  opacity: 0;
  transform: translateY(18rpx);
  transition: opacity 0.45s ease, transform 0.45s ease;
}
.result--show {
  opacity: 1;
  transform: translateY(0);
}

// 妆感浓度仪表
.meter-card {
  display: flex;
  align-items: center;
  background: $card;
  border: 2rpx solid $border;
  border-radius: $radius-lg;
  padding: 32rpx 36rpx;
  margin-bottom: 24rpx;
}
.meter-left {
  flex: 1;
  margin-right: 32rpx;
}
.meter-label {
  font-size: 22rpx;
  color: $text-secondary;
}
.meter-track {
  height: 12rpx;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6rpx;
  margin-top: 16rpx;
  overflow: hidden;
}
.meter-fill {
  height: 100%;
  background: linear-gradient(90deg, $red, $orange);
  border-radius: 6rpx;
  box-shadow: 0 0 8rpx rgba($red, 0.5);
  transition: width 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.meter-scale {
  display: flex;
  justify-content: space-between;
  margin-top: 10rpx;
}
.meter-scale-item {
  font-size: 18rpx;
  color: $text-weak;
}
.meter-right {
  text-align: center;
}
.meter-score-row {
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.meter-score {
  font-size: 72rpx;
  font-weight: 900;
  background: linear-gradient(180deg, $red, $orange);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1;
}
.meter-percent {
  font-size: 28rpx;
  color: $text-secondary;
  margin-bottom: 8rpx;
}
.meter-verdict {
  font-size: 22rpx;
  color: $red;
  font-weight: 600;
  margin-top: 8rpx;
}

// 翻译结果卡片
.result-card {
  background: $card;
  border: 2rpx solid $border;
  border-radius: $radius-lg;
  overflow: hidden;
}
.result-section {
  padding: 32rpx 36rpx;
  border-top: 2rpx solid $border;
  &:first-child {
    border-top: none;
  }
}
.result-section--green-bg {
  background: rgba($green, 0.03);
}
.result-label {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
}
.dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
}
.dot--red {
  background: $red;
}
.dot--green {
  background: $green;
}
.result-label-text {
  font-size: 20rpx;
}
.result-label-text--red {
  color: $red;
}
.result-label-text--green {
  color: $green;
}
.result-label-text--gray {
  color: $text-secondary;
}
.result-original {
  font-size: 26rpx;
  color: $text-secondary;
  text-decoration: line-through;
  text-decoration-color: rgba($red, 0.25);
  line-height: 1.7;
}
.result-human {
  font-size: 32rpx;
  font-weight: 700;
  color: $text;
  line-height: 1.7;
}

// 逐句拆解
.breakdown-row {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
}
.breakdown-row--border {
  border-top: 2rpx solid rgba(255, 255, 255, 0.03);
}
.breakdown-from {
  font-size: 26rpx;
  color: $text-secondary;
  text-decoration: line-through;
  flex-shrink: 0;
  max-width: 40%;
}
.breakdown-arrow {
  font-size: 24rpx;
  color: $text-weak;
  margin: 0 16rpx;
  flex-shrink: 0;
}
.breakdown-to {
  font-size: 26rpx;
  color: $green;
  font-weight: 600;
  flex: 1;
}

// 操作按钮
.action-bar {
  display: flex;
  gap: 20rpx;
  padding: 28rpx 36rpx;
  border-top: 2rpx solid $border;
}
.action-btn {
  flex: 1;
  text-align: center;
  font-size: 26rpx;
  color: $text-secondary;
  background: #1a1a24;
  border: 2rpx solid $border;
  border-radius: $radius-sm;
  padding: 22rpx 0;
}
.action-btn--primary {
  color: #fff;
  background: linear-gradient(90deg, $red, $orange);
  border: none;
  box-shadow: 0 4rpx 16rpx rgba($red, 0.35);
}
</style>
