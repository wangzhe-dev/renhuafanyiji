import { defineStore } from 'pinia'

export type GuideLayer = 'sw_update' | 'onboarding' | 'a2hs' | 'banner'

const LAYER_PRIORITY: Record<GuideLayer, number> = {
  sw_update: 400,
  onboarding: 300,
  a2hs: 200,
  banner: 100,
}

const ROUTE_STABLE_DELAY_MS = 2000
const MODAL_COOLDOWN_MS = 1200
const ONBOARDING_RESHOW_AFTER_MS = 24 * 60 * 60 * 1000
const BANNER_RESHOW_AFTER_MS = 30 * 24 * 60 * 60 * 1000
const A2HS_RETRY_AFTER_MS = 7 * 24 * 60 * 60 * 1000
const A2HS_MAX_DISMISS = 3

const uniqueLayers = (layers: GuideLayer[]) => Array.from(new Set(layers))

export const useGuideStore = defineStore(
  'guide',
  () => {
    let flushTimer: ReturnType<typeof setTimeout> | null = null

    const activeLayer = ref<GuideLayer | ''>('')
    const pendingLayers = ref<GuideLayer[]>([])

    const routeStableAt = ref(0)

    const onboardingDone = ref(false)
    const onboardingSkippedAt = ref(0)

    const bannerDismissedAt = ref(0)

    const firstSkillCopyAt = ref(0)

    const a2hsDismissCount = ref(0)
    const a2hsNextEligibleAt = ref(0)
    const a2hsAcceptedAt = ref(0)

    const lastModalClosedAt = ref(0)

    const isGlobalGateReady = () => {
      const now = Date.now()
      if (routeStableAt.value > now) return false
      if (lastModalClosedAt.value > 0 && now - lastModalClosedAt.value < MODAL_COOLDOWN_MS) return false
      return true
    }

    const clearFlushTimer = () => {
      if (!flushTimer) return
      clearTimeout(flushTimer)
      flushTimer = null
    }

    const scheduleFlush = () => {
      const now = Date.now()
      const routeWait = Math.max(routeStableAt.value - now, 0)
      const cooldownWait = lastModalClosedAt.value > 0
        ? Math.max(MODAL_COOLDOWN_MS - (now - lastModalClosedAt.value), 0)
        : 0
      const waitMs = Math.max(routeWait, cooldownWait)

      if (waitMs <= 0) {
        clearFlushTimer()
        return
      }

      clearFlushTimer()
      flushTimer = setTimeout(() => {
        flushTimer = null
        flushLayerQueue()
      }, waitMs + 8)
    }

    const removePendingLayer = (layer: GuideLayer) => {
      pendingLayers.value = pendingLayers.value.filter((item) => item !== layer)
    }

    const pickNextLayer = (): GuideLayer | '' => {
      if (!pendingLayers.value.length) return ''
      return pendingLayers.value
        .slice()
        .sort((a, b) => LAYER_PRIORITY[b] - LAYER_PRIORITY[a])[0] || ''
    }

    const flushLayerQueue = () => {
      if (activeLayer.value) return
      if (!isGlobalGateReady()) {
        scheduleFlush()
        return
      }

      const next = pickNextLayer()
      if (!next) return

      clearFlushTimer()
      removePendingLayer(next)
      activeLayer.value = next
    }

    const requestLayer = (layer: GuideLayer, immediate = false) => {
      if (activeLayer.value === layer) return
      if (pendingLayers.value.includes(layer)) return

      pendingLayers.value = uniqueLayers([...pendingLayers.value, layer])

      // immediate 模式：跳过 routeStableAt 等待，直接激活（用于微信等必须优先展示的场景）
      if (immediate) {
        routeStableAt.value = 0
      }

      flushLayerQueue()
    }

    const releaseLayer = (layer: GuideLayer) => {
      removePendingLayer(layer)
      if (activeLayer.value !== layer) return

      activeLayer.value = ''
      lastModalClosedAt.value = Date.now()
      flushLayerQueue()
    }

    const cancelLayer = (layer: GuideLayer) => {
      removePendingLayer(layer)
      if (activeLayer.value === layer) activeLayer.value = ''
      flushLayerQueue()
    }

    const markRouteChanged = (delayMs = ROUTE_STABLE_DELAY_MS) => {
      routeStableAt.value = Date.now() + Math.max(delayMs, 0)
      flushLayerQueue()
    }

    const markOnboardingDone = () => {
      onboardingDone.value = true
      onboardingSkippedAt.value = 0
    }

    const markOnboardingSkipped = () => {
      onboardingSkippedAt.value = Date.now()
    }

    const canShowOnboarding = () => {
      if (onboardingDone.value) return false
      if (!onboardingSkippedAt.value) return true
      return Date.now() - onboardingSkippedAt.value >= ONBOARDING_RESHOW_AFTER_MS
    }

    const markBannerDismissed = () => {
      bannerDismissedAt.value = Date.now()
    }

    const canShowBanner = () => {
      if (!bannerDismissedAt.value) return true
      return Date.now() - bannerDismissedAt.value >= BANNER_RESHOW_AFTER_MS
    }

    const markFirstSkillCopy = () => {
      if (firstSkillCopyAt.value) return
      firstSkillCopyAt.value = Date.now()
    }

    const markA2hsDismissed = () => {
      a2hsDismissCount.value = Math.min(a2hsDismissCount.value + 1, A2HS_MAX_DISMISS)
      a2hsNextEligibleAt.value = Date.now() + A2HS_RETRY_AFTER_MS
    }

    const markA2hsAccepted = () => {
      a2hsAcceptedAt.value = Date.now()
    }

    const canShowA2hs = () => {
      if (!onboardingDone.value) return false
      if (a2hsAcceptedAt.value > 0) return false
      if (a2hsDismissCount.value >= A2HS_MAX_DISMISS) return false
      if (a2hsNextEligibleAt.value > 0 && Date.now() < a2hsNextEligibleAt.value) return false
      return true
    }

    // 微信专用：跳过 onboarding 门控和冷却期，每次进入都提醒（拉新阶段）
    // session 内的去重由 PwaPrompt 的 a2hsDismissedForPage 负责
    const canShowA2hsWeChat = () => {
      if (a2hsAcceptedAt.value > 0) return false
      return true
    }

    const resetGuideState = () => {
      clearFlushTimer()
      activeLayer.value = ''
      pendingLayers.value = []
      routeStableAt.value = 0
      onboardingDone.value = false
      onboardingSkippedAt.value = 0
      bannerDismissedAt.value = 0
      firstSkillCopyAt.value = 0
      a2hsDismissCount.value = 0
      a2hsNextEligibleAt.value = 0
      a2hsAcceptedAt.value = 0
      lastModalClosedAt.value = 0
    }

    return {
      activeLayer,
      pendingLayers,
      routeStableAt,
      onboardingDone,
      onboardingSkippedAt,
      bannerDismissedAt,
      firstSkillCopyAt,
      a2hsDismissCount,
      a2hsNextEligibleAt,
      a2hsAcceptedAt,
      lastModalClosedAt,

      flushLayerQueue,
      requestLayer,
      releaseLayer,
      cancelLayer,

      markRouteChanged,

      markOnboardingDone,
      markOnboardingSkipped,
      canShowOnboarding,

      markBannerDismissed,
      canShowBanner,

      markFirstSkillCopy,

      markA2hsDismissed,
      markA2hsAccepted,
      canShowA2hs,
      canShowA2hsWeChat,

      resetGuideState,
    }
  },
  {
    unistorage: {
      paths: [
        'onboardingDone',
        'onboardingSkippedAt',
        'bannerDismissedAt',
        'firstSkillCopyAt',
        'a2hsDismissCount',
        'a2hsNextEligibleAt',
        'a2hsAcceptedAt',
      ],
    },
  }
)
