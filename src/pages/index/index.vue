<template>
  <view class="page">
    <!-- 红色光晕装饰 -->
    <view class="glow-bg" />

    <!-- 顶部品牌区 -->
    <view class="brand">
      <text class="brand-title">黑话“专家”</text>
    </view>

    <!-- 场景选择栏 -->
    <view class="scene-bar-wrap">
      <scroll-view
        class="scene-bar"
        scroll-x
        :show-scrollbar="false"
        :scroll-into-view="activeScenePillId"
        scroll-with-animation
      >
        <view class="scene-bar-track">
          <view
            v-for="(scene, idx) in scenes"
            :id="`scene-pill-${scene.id}`"
            :key="scene.id"
            class="scene-pill"
            :class="{
              'scene-pill--active': currentScene === idx,
              'scene-pill--green': currentScene === idx && scene.id === 'reverse'
            }"
            @tap="currentScene = idx"
          >
            <text class="scene-pill__icon">{{ scene.icon }}</text>
            <text class="scene-pill__label">{{ scene.label }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

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
          <view class="result-original-box">
            <text class="result-original">{{ inputText }}</text>
          </view>
        </view>

        <!-- 人话翻译 -->
        <view class="result-section result-section--green-bg">
          <view class="result-label">
            <view class="dot dot--green" />
            <text class="result-label-text result-label-text--green">
              {{ currentSceneConfig.id === 'reverse' ? '上妆 · 拆开看' : '真实意思 · 拆开看' }}
            </text>
          </view>
          <view class="truth-list">
            <view v-for="(item, idx) in resultSummaryPoints" :key="idx" class="truth-item">
              <view class="truth-index">{{ idx + 1 }}</view>
              <text class="truth-text">{{ item }}</text>
            </view>
          </view>
        </view>

        <!-- 逐句拆解 -->
        <view v-if="result.breakdown.length" class="result-section">
          <view class="result-label">
            <text class="result-label-text result-label-text--gray">🔬 关键词拆解</text>
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
import { scenes, type TranslationResult } from '@/config/scenes'
import { requestTranslation } from '@/utils/cloudbase'
import { normalizeTranslationResult } from '@/utils/translate'
import { onShareAppMessage } from '@dcloudio/uni-app'
import { computed, nextTick, ref } from 'vue'

// --- 状态 ---
const currentScene = ref(0)
const inputText = ref('')
const isFocused = ref(false)
const isLoading = ref(false)
const result = ref<TranslationResult | null>(null)
const showResult = ref(false)

const currentSceneConfig = computed(() => scenes[currentScene.value])
const activeScenePillId = computed(() => `scene-pill-${currentSceneConfig.value.id}`)
const hasInputText = computed(() => inputText.value.trim().length > 0)
const loadingLayers = computed(() => Math.max(3, Math.floor(inputText.value.length / 10)))
const resultSummaryPoints = computed(() => {
  if (!result.value) return []

  const directPoints = splitHumanTextIntoPoints(result.value.humanText)
  if (directPoints.length > 1) return directPoints

  const breakdownPoints = result.value.breakdown
    .map((item) => item.to.trim())
    .filter(Boolean)

  return breakdownPoints.length ? breakdownPoints : directPoints
})

function splitHumanTextIntoPoints(text: string) {
  const normalized = text
    .replace(/\r/g, '\n')
    .replace(/[\t ]+/g, ' ')
    .trim()

  if (!normalized) return []

  const numberedLines = normalized
    .split(/\n+/)
    .map((item) => item.replace(/^\s*\d+\s*[.:：、)\-]\s*/, '').trim())
    .filter(Boolean)

  if (numberedLines.length > 1) {
    return numberedLines.slice(0, 6)
  }

  const sentenceParts = normalized
    .replace(/[；;。！？?!]/g, '，')
    .split(/[，,]/)
    .map((item) => item.trim())
    .filter(Boolean)

  if (sentenceParts.length > 1) {
    return sentenceParts.slice(0, 6)
  }

  return [normalized]
}

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
        breakdown: Array.isArray(data.breakdown) ? data.breakdown : []
      }

      await nextTick()
      showResult.value = true
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
  const summary = resultSummaryPoints.value.length
    ? resultSummaryPoints.value.map((item, idx) => `${idx + 1}. ${item}`).join('\n')
    : result.value.humanText
  const text = `【黑话“专家”】\n原文：${inputText.value}\n真实意思：\n${summary}`
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
  uni.pageScrollTo({ scrollTop: 0, duration: 300 })
}

// --- 小程序分享 ---
onShareAppMessage(() => {
  return {
    title: '黑话“专家”帮你翻译这段话',
    path: '/pages/index/index'
  }
})
</script>

<style lang="scss">
// 设计 token
$bg: #fff7f1;
$card: rgba(255, 255, 255, 0.9);
$border: #f1d8c8;
$text: #3c241c;
$text-secondary: #7b6257;
$text-weak: #b79d90;
$red: #ff6b4a;
$orange: #ffb36b;
$green: #18b57c;
$radius-lg: 28rpx;
$radius-sm: 20rpx;
$radius-pill: 40rpx;

.page {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba($red, 0.16) 0, transparent 28%),
    linear-gradient(180deg, #fffaf6 0%, $bg 42%, #fff2e8 100%);
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
  background: radial-gradient(circle, rgba($red, 0.18) 0%, transparent 70%);
  pointer-events: none;
}

// --- 品牌区 ---
.brand {
  padding: 100rpx 40rpx 0;
}
.brand-title {
  font-size: 40rpx;
  font-weight: 900;
  background: linear-gradient(90deg, $red, $orange);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

// --- 场景选择 ---
.scene-bar-wrap {
  margin-top: 36rpx;
  padding: 0 40rpx;
}
.scene-bar {
  width: 100%;
}
.scene-bar-track {
  display: inline-flex;
  align-items: center;
  gap: 16rpx;
  padding: 10rpx 40rpx 10rpx 0;
}
.scene-pill {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 18rpx 28rpx;
  border-radius: $radius-pill;
  background: $card;
  border: 2rpx solid $border;
  font-size: 26rpx;
  color: $text-secondary;
  box-shadow: 0 12rpx 28rpx rgba(133, 88, 58, 0.06);
  white-space: nowrap;
  flex-shrink: 0;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}
.scene-pill--active {
  background: rgba($red, 0.1);
  border-color: $red;
  color: $red;
  font-weight: 600;
  transform: translateY(-2rpx);
  box-shadow: 0 16rpx 32rpx rgba($red, 0.14);
}
.scene-pill--green {
  background: rgba($green, 0.1);
  border-color: $green;
  color: $green;
  box-shadow: 0 16rpx 32rpx rgba($green, 0.14);
}
.scene-pill__icon {
  font-size: 28rpx;
  line-height: 1;
}
.scene-pill__label {
  line-height: 1.2;
}

// --- 输入区 ---
.input-card {
  margin: 28rpx 40rpx 0;
  background: $card;
  border: 2rpx solid $border;
  border-radius: $radius-lg;
  padding: 28rpx 32rpx;
  transition: border-color 0.3s, box-shadow 0.3s;
  box-shadow: 0 20rpx 44rpx rgba(133, 88, 58, 0.08);
}
.input-card--focus {
  border-color: $red;
  box-shadow: 0 0 0 6rpx rgba($red, 0.08), 0 20rpx 44rpx rgba(133, 88, 58, 0.1);
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
  background: rgba(255, 255, 255, 0.72);
  border: 2rpx solid $border;
  border-radius: $radius-pill;
}
.btn-translate {
  font-size: 26rpx;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(90deg, $red, $orange);
  padding: 16rpx 32rpx;
  border-radius: $radius-pill;
  box-shadow: 0 10rpx 24rpx rgba($red, 0.24);
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

// 翻译结果卡片
.result-card {
  background: $card;
  border: 2rpx solid $border;
  border-radius: $radius-lg;
  overflow: hidden;
  box-shadow: 0 18rpx 40rpx rgba(133, 88, 58, 0.08);
}
.result-section {
  padding: 32rpx 36rpx;
  border-top: 2rpx solid $border;
  &:first-child {
    border-top: none;
  }
}
.result-section--green-bg {
  background: rgba($green, 0.06);
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
.result-original-box {
  min-height: 160rpx;
  max-height: 360rpx;
  overflow-y: auto;
  padding: 24rpx 26rpx;
  background: rgba($red, 0.04);
  border: 2rpx solid rgba($red, 0.1);
  border-radius: 24rpx;
  box-sizing: border-box;
}
.result-original {
  display: block;
  font-size: 26rpx;
  color: $text-secondary;
  text-decoration: line-through;
  text-decoration-color: rgba($red, 0.25);
  line-height: 1.7;
  word-break: break-all;
}
.truth-list {
  display: grid;
  gap: 18rpx;
}
.truth-item {
  display: flex;
  align-items: flex-start;
  gap: 18rpx;
  padding: 22rpx 24rpx;
  background: rgba(255, 255, 255, 0.74);
  border: 2rpx solid rgba($green, 0.16);
  border-radius: 24rpx;
  box-shadow: 0 14rpx 30rpx rgba(24, 181, 124, 0.08);
}
.truth-index {
  width: 56rpx;
  height: 56rpx;
  flex-shrink: 0;
  border-radius: 18rpx;
  background: linear-gradient(180deg, rgba($green, 0.18), rgba($green, 0.06));
  color: $green;
  font-size: 26rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}
.truth-text {
  flex: 1;
  font-size: 30rpx;
  line-height: 1.65;
  color: $text;
  font-weight: 700;
}

// 逐句拆解
.breakdown-row {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
}
.breakdown-row--border {
  border-top: 2rpx solid rgba(60, 36, 28, 0.06);
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
  background: rgba(255, 255, 255, 0.76);
  border: 2rpx solid $border;
  border-radius: $radius-sm;
  padding: 22rpx 0;
}
.action-btn--primary {
  color: #fff;
  background: linear-gradient(90deg, $red, $orange);
  border: none;
  box-shadow: 0 10rpx 24rpx rgba($red, 0.24);
}
</style>
