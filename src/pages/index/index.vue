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
            :class="{ 'scene-pill--active': currentScene === idx }"
            @tap="handleSceneChange(idx)"
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
          <view
            class="btn-translate"
            :class="{ 'btn-translate--disabled': !hasInputText || isLoading }"
            @tap="handleTranslate"
          >
            🔍 翻译人话
          </view>
        </view>
      </view>
    </view>

    <!-- 加载态 -->
    <view v-if="isLoading" class="loading">
      <text class="loading-main">🔍 正在粉碎话术…</text>
      <text class="loading-sub">AI 正在扒开 {{ loadingLayers }} 层包装</text>
    </view>

    <!-- 翻译结果区 -->
    <view v-if="result && !isLoading" class="result" :class="{ 'result--show': showResult }">
      <view class="result-card">
        <!-- 顶部细线装饰 -->
        <view class="result-topline" />

        <!-- 原文 -->
        <view class="result-section">
          <view class="section-tag section-tag--warm">
            <view class="section-tag__dot" />
            <text class="section-tag__text">原文 · 话术版</text>
          </view>
          <view class="original-quote">
            <text class="original-quote__text">{{ inputText }}</text>
          </view>
        </view>

        <!-- 揭示分割线 -->
        <view class="reveal-divider">
          <view class="reveal-divider__line" />
          <view class="reveal-divider__badge">
            <view class="reveal-divider__arrow" />
            <text class="reveal-divider__text">真相揭示</text>
          </view>
          <view class="reveal-divider__line" />
        </view>

        <!-- 人话翻译 -->
        <view class="result-section result-section--truth">
          <view class="truth-list">
            <view
              v-for="(item, idx) in resultSummaryPoints"
              :key="idx"
              class="truth-card"
            >
              <view class="truth-card__badge">{{ idx + 1 }}</view>
              <text class="truth-card__text">{{ item }}</text>
            </view>
          </view>
        </view>

        <!-- 逐句拆解 -->
        <view v-if="result.breakdown.length" class="result-section">
          <view class="section-tag section-tag--muted">
            <view class="section-tag__dot section-tag__dot--muted" />
            <text class="section-tag__text section-tag__text--muted">关键词拆解</text>
          </view>
          <view class="breakdown-grid">
            <view
              v-for="(item, idx) in result.breakdown"
              :key="idx"
              class="breakdown-card"
            >
              <text class="breakdown-card__from">{{ item.from }}</text>
              <text class="breakdown-card__arrow">→</text>
              <text class="breakdown-card__to">{{ item.to }}</text>
            </view>
          </view>
        </view>

        <!-- 操作按钮 -->
        <view class="action-bar">
          <view class="action-btn action-btn--glass" @tap="handleCopy">
            <view class="action-icon action-icon--copy" />
            <text class="action-btn__label">复制</text>
          </view>
          <view class="action-btn action-btn--primary" @tap="handleReset">
            <text class="action-btn__label">再译一条</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { scenes, type TranslationResult } from '@/config/scenes'
import { requestTranslation } from '@/utils/cloudbase'
import { normalizeTranslationResult } from '@/utils/translate'
import { computed, nextTick, ref } from 'vue'

// --- 状态 ---
const currentScene = ref(0)
const inputText = ref('')
const isFocused = ref(false)
const isLoading = ref(false)
const result = ref<TranslationResult | null>(null)
const showResult = ref(false)
const requestToken = ref(0)

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

function clearResultState() {
  result.value = null
  showResult.value = false
}

function handleSceneChange(idx: number) {
  if (currentScene.value === idx) return

  currentScene.value = idx
  inputText.value = ''
  requestToken.value += 1
  isLoading.value = false
  clearResultState()
}

// --- 翻译 ---
async function handleTranslate() {
  if (!hasInputText.value) {
    uni.showToast({ title: '先输入要翻译的内容', icon: 'none' })
    return
  }
  if (isLoading.value) return

  const sceneConfig = currentSceneConfig.value
  const sourceText = inputText.value
  const currentRequestToken = requestToken.value + 1
  requestToken.value = currentRequestToken
  isLoading.value = true
  clearResultState()

  try {
    console.log('[translate] start', {
      sceneId: sceneConfig.id,
      inputLength: sourceText.trim().length
    })
    const rawText = await requestTranslation(
      sceneConfig.systemPrompt,
      sourceText,
      sceneConfig.id,
      sceneConfig.temperature
    )
    if (requestToken.value !== currentRequestToken) return

    const data = normalizeTranslationResult(rawText)

    if (data && data.humanText) {
      result.value = {
        humanText: data.humanText,
        breakdown: Array.isArray(data.breakdown) ? data.breakdown : []
      }

      await nextTick()
      if (requestToken.value !== currentRequestToken) return
      showResult.value = true
    } else {
      uni.showToast({ title: 'AI 返回格式不对，请重试一次', icon: 'none', duration: 2500 })
    }
  } catch (error) {
    if (requestToken.value !== currentRequestToken) return
    console.error('cloudbase ai failed:', error)
    uni.showToast({ title: getReadableErrorMessage(error), icon: 'none', duration: 3000 })
  } finally {
    if (requestToken.value === currentRequestToken) {
      isLoading.value = false
    }
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

// --- 再译一条 ---
function handleReset() {
  inputText.value = ''
  clearResultState()
  uni.pageScrollTo({ scrollTop: 0, duration: 300 })
}
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
  transform: translateY(28rpx);
  transition: opacity 0.55s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.55s cubic-bezier(0.16, 1, 0.3, 1);
}
.result--show {
  opacity: 1;
  transform: translateY(0);
}

// 翻译结果卡片
.result-card {
  background: rgba(255, 255, 255, 0.92);
  border: 1rpx solid rgba(255, 255, 255, 0.6);
  border-radius: 32rpx;
  overflow: hidden;
  box-shadow:
    0 2rpx 4rpx rgba(0, 0, 0, 0.02),
    0 8rpx 20rpx rgba(133, 88, 58, 0.06),
    0 28rpx 56rpx rgba(133, 88, 58, 0.09);
}

// 顶部细线
.result-topline {
  height: 2rpx;
  background: linear-gradient(90deg, transparent, rgba($red, 0.2), transparent);
}

// 区块标签
.section-tag {
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  padding: 8rpx 22rpx;
  border-radius: 20rpx;
  margin-bottom: 20rpx;
}
.section-tag--warm {
  background: rgba($red, 0.07);
}
.section-tag--muted {
  background: rgba(60, 36, 28, 0.04);
}
.section-tag__dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background: $red;
}
.section-tag__dot--muted {
  background: $text-weak;
}
.section-tag__text {
  font-size: 22rpx;
  font-weight: 600;
  color: $red;
  letter-spacing: 1rpx;
}
.section-tag__text--muted {
  color: $text-secondary;
}

.result-section {
  padding: 32rpx 36rpx;
}
.result-section--truth {
  padding-top: 0;
}

// 原文引用样式
.original-quote {
  padding: 24rpx 28rpx;
  background: linear-gradient(135deg, rgba($red, 0.03), rgba($orange, 0.02));
  border-radius: 20rpx;
}
.original-quote__text {
  font-size: 26rpx;
  color: $text-secondary;
  line-height: 1.75;
  word-break: break-all;
  opacity: 0.75;
}

// 揭示分割线
.reveal-divider {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 4rpx 36rpx 16rpx;
}
.reveal-divider__line {
  flex: 1;
  height: 1rpx;
  background: linear-gradient(90deg, transparent, rgba($green, 0.25), transparent);
}
.reveal-divider__badge {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 10rpx 28rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, rgba($green, 0.1), rgba($green, 0.04));
  border: 1rpx solid rgba($green, 0.15);
}
.reveal-divider__arrow {
  width: 0;
  height: 0;
  border-left: 8rpx solid transparent;
  border-right: 8rpx solid transparent;
  border-top: 10rpx solid $green;
  flex-shrink: 0;
}
.reveal-divider__text {
  font-size: 22rpx;
  font-weight: 700;
  color: $green;
  letter-spacing: 1rpx;
}

// 真相卡片
.truth-list {
  display: grid;
  gap: 16rpx;
}
.truth-card {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
  padding: 26rpx 28rpx;
  background: linear-gradient(135deg, rgba($green, 0.06), rgba($green, 0.015));
  border: 1rpx solid rgba($green, 0.12);
  border-radius: 24rpx;
}
.truth-card__badge {
  width: 52rpx;
  height: 52rpx;
  flex-shrink: 0;
  border-radius: 16rpx;
  background: linear-gradient(135deg, $green, rgba($green, 0.72));
  color: #fff;
  font-size: 24rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6rpx 18rpx rgba($green, 0.28);
}
.truth-card__text {
  flex: 1;
  font-size: 30rpx;
  line-height: 1.65;
  color: $text;
  font-weight: 700;
  padding-top: 6rpx;
}

// 关键词拆解
.breakdown-grid {
  display: grid;
  gap: 14rpx;
}
.breakdown-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  column-gap: 16rpx;
  padding: 22rpx 24rpx;
  background: rgba(255, 255, 255, 0.55);
  border: 1rpx solid rgba(60, 36, 28, 0.05);
  border-radius: 20rpx;
}
.breakdown-card__from {
  min-width: 0;
  font-size: 25rpx;
  color: $text-secondary;
  text-decoration: line-through;
  text-decoration-color: rgba($red, 0.3);
  text-align: left;
}
.breakdown-card__arrow {
  font-size: 24rpx;
  color: $text-weak;
  flex-shrink: 0;
}
.breakdown-card__to {
  min-width: 0;
  font-size: 25rpx;
  color: $green;
  font-weight: 600;
  text-align: left;
}

// 操作按钮
.action-bar {
  display: flex;
  gap: 16rpx;
  padding: 24rpx 36rpx 28rpx;
  border-top: 1rpx solid rgba(60, 36, 28, 0.05);
}
.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  font-size: 26rpx;
  padding: 24rpx 0;
  border-radius: 20rpx;
  font-weight: 500;
}
.action-btn__label {
  line-height: 1;
}
.action-btn--glass {
  color: $text-secondary;
  background: rgba(255, 255, 255, 0.6);
  border: 1rpx solid rgba(60, 36, 28, 0.07);
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.02);
}
.action-btn--primary {
  color: #fff;
  background: linear-gradient(135deg, $red, $orange);
  border: none;
  font-weight: 700;
  box-shadow:
    0 8rpx 20rpx rgba($red, 0.3),
    0 2rpx 6rpx rgba($red, 0.15);
}

// 纯 CSS 图标
.action-icon {
  width: 28rpx;
  height: 28rpx;
  position: relative;
  flex-shrink: 0;
}
.action-icon--copy {
  width: 20rpx;
  height: 24rpx;
  border: 3rpx solid $text-secondary;
  border-radius: 4rpx;
  margin-top: 6rpx;
  &::before {
    content: '';
    position: absolute;
    top: -8rpx;
    left: 8rpx;
    width: 20rpx;
    height: 24rpx;
    border: 3rpx solid $text-secondary;
    border-radius: 4rpx;
    background: rgba(255, 255, 255, 0.8);
  }
}
</style>
