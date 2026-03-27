<template>
	<!-- 仅在 H5 平台渲染 -->
	<!-- #ifdef H5 -->
	<view>

		<!-- ── H5 强更新条（顶部）── -->
		<view v-if="showUpdateBar" class="update-bar">
			<view class="ub-inner">
				<view class="ub-pulse" />
				<view class="ub-text">
					<text class="ub-title">{{ updateBarTitle }}</text>
					<text class="ub-desc">{{ updateBarDesc }}</text>
				</view>
				<view class="ub-btn" @tap="applyH5Update">
					<text class="ub-btn-t">{{ applyingH5Update ? '更新中...' : '立即更新' }}</text>
				</view>
			</view>
		</view>

		<!-- ── 悬浮安装入口（左下角，不与 FAB 冲突）── -->
		<view v-if="showInstallEntry" class="entry-pill" @tap="openInstallEntry">
			<view class="ep-icon">
				<uni-icons :type="installEntryIconType" :size="16" color="#FFFFFF" />
			</view>
			<text class="ep-text">{{ installEntryText }}</text>
			<view class="ep-close" @tap.stop="closeInstallEntry">
				<text class="ep-close-t">×</text>
			</view>
		</view>

		<!-- ── 弹框遮罩 ── -->
		<view
			v-if="showManualHint"
			class="modal-backdrop"
			@tap="dismissInstall"
		/>

		<!-- ── 下载分流引导 Modal ── -->
		<view v-if="showManualHint" class="modal-wrap" @tap.stop>
			<view class="modal">
				<view class="modal-close" @tap="dismissInstall"><text class="modal-close-t">×</text></view>
				<view class="modal-app-icon"><text class="mai-t">烧不起</text></view>
				<text class="modal-title">{{ manualGuide.title }}</text>
				<text class="modal-desc">{{ manualGuide.desc }}</text>
				<view class="modal-steps">
					<view
						v-for="(step, index) in manualGuide.steps"
						:key="`${manualGuide.title}-${index}`"
						class="ms-item"
					>
						<view class="ms-num"><text class="ms-n">{{ index + 1 }}</text></view>
						<text class="ms-t">{{ step }}</text>
					</view>
				</view>
				<text class="modal-tip">{{ manualGuide.tip }}</text>
				<view class="modal-actions">
					<template v-if="showInstallPrimaryAction">
						<view class="btn-primary" @tap="handleInstallPrimaryAction">
							<text class="btn-primary-t">{{ manualGuide.actionText }}</text>
						</view>
						<view class="btn-dismiss" @tap="dismissInstall"><text class="btn-dismiss-t">知道了</text></view>
					</template>
					<view v-else class="btn-primary" @tap="dismissInstall">
						<text class="btn-primary-t">知道了</text>
					</view>
				</view>
				<view class="modal-footer-note">
					<text class="mfn-title">烧不起安装说明</text>
					<text class="mfn-text">{{ unifiedInstallNote }}</text>
				</view>
			</view>
		</view>

	</view>
	<!-- #endif -->
</template>

<script setup lang="ts">
import { useGuideStore } from '@/stores'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
// #ifdef H5
import { fetchLatestH5Build, forceRefreshLatestH5, getCurrentH5Build, hasNewH5Build, type RemoteH5BuildInfo } from '@/utils/h5-update'
import { useRegisterSW } from 'virtual:pwa-register/vue'
// #endif

type GuideAction = 'download-android' | 'open-browser' | 'ios-open-safari' | 'ios-add-home'

interface InstallGuide {
	icon: string
	title: string
	desc: string
	steps: string[]
	actionText: string
	tip: string
	action: GuideAction
}

interface BeforeInstallPromptEvent extends Event {
	prompt(): Promise<void>
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface PwaWindow extends Window {
	__pwa_deferred_prompt?: BeforeInstallPromptEvent | null
}

const showManualHint = ref(false)
const a2hsDismissedForPage = ref(false)
const guideStore = useGuideStore()
const remoteH5Build = ref<RemoteH5BuildInfo | null>(null)
const checkingH5Update = ref(false)
const applyingH5Update = ref(false)

const unifiedInstallNote = 'Android 设备可直接下载并安装烧不起安卓版；iPhone 设备请使用 Safari 打开本页并选择”添加到主屏幕”；若在微信内访问，请先通过”在浏览器打开”后再继续操作。'

let pwaUpdateTimer: ReturnType<typeof window.setInterval> | null = null
let displayModeMedia: MediaQueryList | null = null
let displayModeHandler: ((event: MediaQueryListEvent) => void) | null = null
let deferredInstallPrompt: BeforeInstallPromptEvent | null = null
let onBeforeInstallPrompt: ((e: Event) => void) | null = null
let onAppInstalled: (() => void) | null = null

const syncDeferredInstallPrompt = () => {
	const cachedPrompt = (window as PwaWindow).__pwa_deferred_prompt
	if (cachedPrompt) deferredInstallPrompt = cachedPrompt
}

const triggerSWUpdateCheck = () => {
	if (!('serviceWorker' in navigator)) return
	void navigator.serviceWorker.getRegistration().then((registration) => {
		if (registration) return registration.update()
	}).catch((err) => {
		console.warn('[PWA] 更新检查失败:', err)
	})
}

const onVisibilityChange = () => {
	if (document.visibilityState === 'visible') {
		triggerSWUpdateCheck()
		syncA2hsLayer()
		void checkLatestH5Build()
	}
}

// ── SW 更新检测（使用 workbox-window 避免时序竞争）──
// #ifdef H5
const { needRefresh, updateServiceWorker } = useRegisterSW({
	immediate: true,
	onRegisteredSW(_swUrl, registration) {
		if (!registration) return
		// 主动触发一次检查（移动端浏览器不一定每次打开都检查）
		registration.update()
		// 每5分钟检查一次（针对长时间后台挂起后唤醒的情况）
		if (pwaUpdateTimer) window.clearInterval(pwaUpdateTimer)
		pwaUpdateTimer = window.setInterval(() => {
			if (!registration.installing && navigator.onLine) registration.update()
		}, 5 * 60 * 1000)
	},
})
// #endif
// #ifndef H5
const needRefresh = ref(false)
// #endif

const currentH5Build = getCurrentH5Build()
const hasRemoteH5Update = computed(() => hasNewH5Build(remoteH5Build.value))
const showUpdateBar = computed(() => {
	return guideStore.activeLayer === 'sw_update' && (needRefresh.value || hasRemoteH5Update.value)
})
const updateBarTitle = computed(() => {
	if (hasRemoteH5Update.value) return '发现新版本'
	return '检测到资源更新'
})
const updateBarDesc = computed(() => {
	if (hasRemoteH5Update.value) {
		return `当前页面版本较旧，需刷新到 v${remoteH5Build.value?.versionName || currentH5Build.versionName} 才能继续使用最新内容`
	}
	return '检测到新的 H5 资源，刷新后立即生效'
})

const getUserAgent = (): string => navigator.userAgent.toLowerCase()

const isInStandaloneMode = (): boolean => {
	return (
		window.matchMedia('(display-mode: standalone)').matches ||
		(window.navigator as Navigator & { standalone?: boolean }).standalone === true
	)
}

const isIOS = (): boolean => {
	if (/iphone|ipad|ipod/i.test(getUserAgent())) return true
	// iPadOS 13+ 桌面模式 UA 伪装成 Mac Safari，用 maxTouchPoints 区分
	return /macintosh/i.test(getUserAgent()) && navigator.maxTouchPoints > 1
}
const isAndroid = (): boolean => /android/i.test(getUserAgent())

const isWeChat = (): boolean => /micromessenger/i.test(getUserAgent())
const isQQBrowser = (): boolean => /mqqbrowser|qqbrowser/i.test(getUserAgent())

const isIOSSafari = (): boolean => {
	return isIOS() &&
		/safari/i.test(getUserAgent()) &&
		!/crios|fxios|edgios|micromessenger| qq\/|mqqbrowser|qqbrowser/i.test(getUserAgent())
}

const supportsInstallEntry = (): boolean => {
	return isWeChat() || isIOS() || isAndroid()
}

const showInstallEntry = computed(() => {
	return supportsInstallEntry() &&
		!isInStandaloneMode() &&
		!showManualHint.value &&
		!a2hsDismissedForPage.value &&
		guideStore.activeLayer === 'a2hs'
})

const installEntryText = computed(() => {
	if (isWeChat()) return '在浏览器打开'
	if (isAndroid()) return '立即下载'
	if (isIOS()) return isIOSSafari() ? '添加到主屏幕' : 'Safari 打开'
	return '查看说明'
})

const installEntryIconType = computed(() => {
	if (isWeChat()) return 'weixin'
	if (isAndroid()) return 'download'
	if (isIOS()) return isIOSSafari() ? 'home' : 'redo'
	return 'info'
})

const androidApkUrl = computed(() => {
	const rawUrl = ((import.meta.env.VITE_ANDROID_APK_URL as string | undefined) || '').trim()
	return rawUrl || `${window.location.origin}/download/shaobuqi.apk`
})

const navigateToDownloadPage = () => {
	const a = document.createElement('a')
	a.href = androidApkUrl.value
	a.rel = 'noopener noreferrer'
	document.body.appendChild(a)
	a.click()
	document.body.removeChild(a)
}

const copyCurrentUrl = async (): Promise<boolean> => {
	const currentUrl = window.location.href

	if (navigator.clipboard?.writeText) {
		try {
			await navigator.clipboard.writeText(currentUrl)
			return true
		} catch {
			// noop
		}
	}

	try {
		const textarea = document.createElement('textarea')
		textarea.value = currentUrl
		textarea.setAttribute('readonly', '')
		textarea.style.position = 'fixed'
		textarea.style.top = '-9999px'
		document.body.appendChild(textarea)
		textarea.select()
		const copied = document.execCommand('copy')
		document.body.removeChild(textarea)
		return copied
	} catch {
		return false
	}
}

const showGuideToast = (title: string) => {
	uni.showToast({ title, icon: 'none', duration: 2200 })
}

const manualGuide = computed<InstallGuide>(() => {
	if (isWeChat()) {
		return {
			icon: '微',
			title: '请在浏览器中打开下载',
			desc: '当前在微信内，通常无法直接完成安装。请先在浏览器中打开当前页面，再继续下载烧不起。',
			steps: [
				'点击右上角菜单',
				'选择“在浏览器打开”',
				'推荐使用系统浏览器、Chrome、Edge 或 QQ 浏览器'
			],
			actionText: '去浏览器打开',
			tip: '在微信内通常无法直接安装，先切换到浏览器再继续。',
			action: 'open-browser'
		}
	}

	if (isAndroid() && isQQBrowser()) {
		return {
			icon: 'Q',
			title: '在 QQ 浏览器下载烧不起',
			desc: '当前使用 QQ 浏览器，可直接下载烧不起 APK。下载完成后按页面提示继续安装。',
			steps: [
				'点击“立即下载”获取安装包',
				'下载完成后，在 QQ 浏览器下载记录中找到安装包',
				'打开安装包并按提示完成安装'
			],
			actionText: '立即下载',
			tip: '若安装受限，请在系统设置中允许 QQ 浏览器安装未知应用。',
			action: 'download-android'
		}
	}

	if (isAndroid()) {
		return {
			icon: '安',
			title: '下载烧不起安卓版',
			desc: '当前浏览器支持直接下载安装烧不起安卓版。点击下方按钮即可开始下载。',
			steps: [
				'点击“立即下载”开始下载',
				'下载完成后打开安装包',
				'按系统提示完成安装'
			],
			actionText: '立即下载',
			tip: '如系统提示无法安装，请允许当前浏览器安装未知应用后再继续。',
			action: 'download-android'
		}
	}

	if (isIOS()) {
		return {
			icon: 'iOS',
			title: 'iPhone 使用指引',
			desc: '当前设备为 iPhone。请使用 Safari 打开当前页面，并将烧不起添加到主屏幕。',
			steps: [
				'在 Safari 打开当前页面',
				'点击分享按钮',
				'选择“添加到主屏幕”'
			],
			actionText: isIOSSafari() ? '添加到主屏幕' : 'Safari 打开',
			action: isIOSSafari() ? 'ios-add-home' : 'ios-open-safari'
		}
	}

	return {
		icon: '提',
		title: '请在手机上继续',
		desc: '当前设备暂不支持下载分流引导，请使用手机访问当前页面。',
		steps: [
			'在手机浏览器打开当前链接',
			'Android 选择“立即下载”',
			'iPhone 使用 Safari 选择“添加到主屏幕”'
		],
		actionText: '我知道了',
		tip: '推荐在 Android 或 iPhone 设备中完成安装。',
		action: 'open-browser'
	}
})

const showInstallPrimaryAction = computed(() => {
	return manualGuide.value.action !== 'ios-open-safari' &&
		manualGuide.value.action !== 'ios-add-home'
})

const syncUpdateLayer = () => {
	if (needRefresh.value || hasRemoteH5Update.value) {
		guideStore.requestLayer('sw_update')
		return
	}

	guideStore.releaseLayer('sw_update')
}

const checkLatestH5Build = async () => {
	if (checkingH5Update.value || applyingH5Update.value) return

	checkingH5Update.value = true
	try {
		const latestBuild = await fetchLatestH5Build()
		if (latestBuild) {
			remoteH5Build.value = latestBuild
		}
	} finally {
		checkingH5Update.value = false
		syncUpdateLayer()
	}
}

const syncA2hsLayer = () => {
	// 已安装为独立应用，不再引导
	if (isInStandaloneMode()) {
		guideStore.markA2hsAccepted()
		guideStore.cancelLayer('a2hs')
		showManualHint.value = false
		return
	}

	// 不支持的环境（桌面等）
	if (!supportsInstallEntry()) {
		guideStore.cancelLayer('a2hs')
		showManualHint.value = false
		return
	}

	// 本次页面已关闭过引导
	if (a2hsDismissedForPage.value) {
		guideStore.cancelLayer('a2hs')
		showManualHint.value = false
		return
	}

	// 用户已接受过（正式安装或主动确认）
	if (guideStore.a2hsAcceptedAt > 0) {
		guideStore.cancelLayer('a2hs')
		showManualHint.value = false
		return
	}

	// 微信内置浏览器：不受 onboardingDone 门控，但仍遵守 dismiss 冷却和次数上限，
	// 跳过 routeStableAt 延迟直接激活
	if (isWeChat()) {
		if (guideStore.canShowA2hsWeChat()) {
			guideStore.requestLayer('a2hs', true)
		} else {
			guideStore.cancelLayer('a2hs')
			showManualHint.value = false
		}
		return
	}

	// 其他环境：需要 onboarding 完成后才显示
	if (guideStore.canShowA2hs()) {
		guideStore.requestLayer('a2hs')
		return
	}

	guideStore.cancelLayer('a2hs')
	showManualHint.value = false
}

watch(() => guideStore.activeLayer, (layer) => {
	if (layer !== 'a2hs') showManualHint.value = false
})

watch(
	() => [needRefresh.value, hasRemoteH5Update.value],
	() => {
		syncUpdateLayer()
	},
	{ immediate: true }
)

watch(
	() => [
		guideStore.onboardingDone,
		guideStore.a2hsAcceptedAt
	],
	() => {
		syncA2hsLayer()
	},
	{ immediate: true }
)

onMounted(() => {
	document.addEventListener('visibilitychange', onVisibilityChange)
	triggerSWUpdateCheck()
	syncA2hsLayer()
	syncDeferredInstallPrompt()
	void checkLatestH5Build()

	if (typeof window.matchMedia === 'function') {
		displayModeMedia = window.matchMedia('(display-mode: standalone)')
		displayModeHandler = () => { syncA2hsLayer() }

		if (typeof displayModeMedia.addEventListener === 'function') {
			displayModeMedia.addEventListener('change', displayModeHandler)
		} else if (typeof displayModeMedia.addListener === 'function') {
			displayModeMedia.addListener(displayModeHandler)
		}
	}

	// Chrome Android：拦截原生安装提示，延迟到用户点击时再触发
	onBeforeInstallPrompt = (e: Event) => {
		e.preventDefault()
		deferredInstallPrompt = e as BeforeInstallPromptEvent
		;(window as PwaWindow).__pwa_deferred_prompt = deferredInstallPrompt
	}
	window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)

	// 用户通过任意方式完成安装后，收起引导入口
	onAppInstalled = () => {
		deferredInstallPrompt = null
		;(window as PwaWindow).__pwa_deferred_prompt = null
		a2hsDismissedForPage.value = false
		guideStore.markA2hsAccepted()
		guideStore.cancelLayer('a2hs')
		showManualHint.value = false
	}
	window.addEventListener('appinstalled', onAppInstalled)
})

onUnmounted(() => {
	document.removeEventListener('visibilitychange', onVisibilityChange)
	if (pwaUpdateTimer) {
		window.clearInterval(pwaUpdateTimer)
		pwaUpdateTimer = null
	}
	if (displayModeMedia && displayModeHandler) {
		if (typeof displayModeMedia.removeEventListener === 'function') {
			displayModeMedia.removeEventListener('change', displayModeHandler)
		} else if (typeof displayModeMedia.removeListener === 'function') {
			displayModeMedia.removeListener(displayModeHandler)
		}
	}
	if (onBeforeInstallPrompt) {
		window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
		onBeforeInstallPrompt = null
	}
	if (onAppInstalled) {
		window.removeEventListener('appinstalled', onAppInstalled)
		onAppInstalled = null
	}
})

async function handleGuideAction() {
	switch (manualGuide.value.action) {
		case 'download-android':
			navigateToDownloadPage()
			return
		case 'open-browser': {
			const copied = await copyCurrentUrl()
			if (copied) {
				showGuideToast('请在右上角菜单选择“在浏览器打开”')
			} else {
				showGuideToast('请点击右上角菜单，选择“在浏览器打开”')
			}
			dismissInstall()
			return
		}
		case 'ios-open-safari':
			showGuideToast('请在当前浏览器菜单选择“在 Safari 中打开”')
			dismissInstall()
			return
		case 'ios-add-home':
			showGuideToast('请点击分享按钮，选择“添加到主屏幕”')
			dismissInstall()
			return
	}
}

async function handleInstallPrimaryAction() {
	if (isAndroid() && !isWeChat()) {
		if (deferredInstallPrompt) {
			try {
				await deferredInstallPrompt.prompt()
				const { outcome } = await deferredInstallPrompt.userChoice
				deferredInstallPrompt = null
				;(window as PwaWindow).__pwa_deferred_prompt = null
				if (outcome === 'accepted') {
					a2hsDismissedForPage.value = false
					guideStore.markA2hsAccepted()
					guideStore.releaseLayer('a2hs')
					showManualHint.value = false
				}
				return
			} catch {
				// 原生弹窗失败，降级走 APK 下载
			}
		}

		a2hsDismissedForPage.value = true
		showManualHint.value = false
		guideStore.releaseLayer('a2hs')
		navigateToDownloadPage()
		return
	}

	await handleGuideAction()
}

async function openInstallEntry() {
	// 微信内（含 Android）：引导去外部浏览器，不直接下载
	if (isWeChat()) {
		showManualHint.value = true
		return
	}

	if (isAndroid()) {
		if (deferredInstallPrompt) {
			try {
				await deferredInstallPrompt.prompt()
				const { outcome } = await deferredInstallPrompt.userChoice
				deferredInstallPrompt = null
				;(window as PwaWindow).__pwa_deferred_prompt = null
				if (outcome === 'accepted') {
					a2hsDismissedForPage.value = false
					guideStore.markA2hsAccepted()
					guideStore.releaseLayer('a2hs')
				}
				return
			} catch {
				// 原生弹窗失败，降级走下载说明
			}
		}
	}

	showManualHint.value = true
}

function dismissInstall() {
	a2hsDismissedForPage.value = true
	showManualHint.value = false
	guideStore.markA2hsDismissed()
	guideStore.releaseLayer('a2hs')
}

function closeInstallEntry() {
	a2hsDismissedForPage.value = true
	showManualHint.value = false
	guideStore.markA2hsDismissed()
	guideStore.releaseLayer('a2hs')
}

function updateSW() {
	// #ifdef H5
	updateServiceWorker(true) // true = 更新后自动 reload
	// #endif
}

async function applyH5Update() {
	if (applyingH5Update.value) return

	applyingH5Update.value = true

	try {
		const latestBuild = await fetchLatestH5Build()
		if (latestBuild) {
			remoteH5Build.value = latestBuild
		}

		if (hasRemoteH5Update.value && remoteH5Build.value) {
			await forceRefreshLatestH5(remoteH5Build.value.buildId)
			return
		}

		if (needRefresh.value) {
			updateSW()
			return
		}

		guideStore.releaseLayer('sw_update')
		uni.showToast({ title: '当前已是最新版本', icon: 'none' })
	} catch (err) {
		console.error('[H5] 强制更新失败:', err)
		uni.showToast({ title: '更新失败，请稍后重试', icon: 'none' })
	} finally {
		applyingH5Update.value = false
	}
}
</script>

<style lang="scss" scoped>

/* ── 版本更新 Banner（顶部）── */
.update-bar {
	position: fixed;
	top: 0; left: 0; right: 0;
	z-index: 9999;
	background: linear-gradient(135deg, var(--primary-color) 0%, #7C7CE8 100%);
	padding: calc(env(safe-area-inset-top) + 12px) 16px 12px;
	animation: slideDown 0.36s cubic-bezier(0.34, 1.2, 0.64, 1);
	box-shadow: 0 4px 20px rgba(91, 91, 214, 0.30);
}

.ub-inner {
	display: flex;
	align-items: center;
	gap: 12px;
}

.ub-pulse {
	width: 10px; height: 10px;
	border-radius: 50%;
	background: #fff;
	opacity: 0.9;
	flex-shrink: 0;
	animation: pulse 1.6s ease-in-out infinite;
}

.ub-text { flex: 1; }
.ub-title { display: block; font-size: 14px; font-weight: 700; color: #fff; line-height: 1.3; }
.ub-desc  { display: block; font-size: 12px; color: rgba(255,255,255,0.75); margin-top: 2px; }

.ub-btn {
	background: rgba(255,255,255,0.20);
	border: 1px solid rgba(255,255,255,0.35);
	border-radius: 100px;
	padding: 7px 16px;
	flex-shrink: 0;
	.ub-btn-t { font-size: 13px; font-weight: 700; color: #fff; }
}

.ub-close {
	width: 30px; height: 30px;
	display: flex; align-items: center; justify-content: center;
	flex-shrink: 0;
	.ub-close-t { font-size: 18px; color: rgba(255,255,255,0.65); line-height: 1; }
}

/* ── 悬浮安装入口（左下角）── */
.entry-pill {
	position: fixed;
	left: 24rpx;
	bottom: calc(env(safe-area-inset-bottom) + 160rpx);
	z-index: 9998;
	display: flex;
	align-items: center;
	gap: 10rpx;
	padding: 18rpx 28rpx 18rpx 22rpx;
	border-radius: 999rpx;
	background: var(--primary-color);
	box-shadow: 0 8rpx 28rpx var(--primary-shadow);

	.ep-icon {
		width: 32rpx;
		height: 32rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}
	.ep-text { font-size: 24rpx; font-weight: 700; color: #fff; }
	.ep-close {
		width: 34rpx;
		height: 34rpx;
		border-radius: 50%;
		background: rgba(255,255,255,0.2);
		display: flex;
		align-items: center;
		justify-content: center;
		margin-left: 2rpx;
	}
	.ep-close-t {
		font-size: 24rpx;
		line-height: 1;
		color: rgba(255,255,255,0.95);
	}
}

/* ── 弹框遮罩 ── */
.modal-backdrop {
	position: fixed;
	top: 0; left: 0; right: 0; bottom: 0;
	background: rgba(0, 0, 0, 0.50);
	z-index: 9998;
	animation: fadeIn 0.22s ease;
}

/* ── Modal 容器 ── */
.modal-wrap {
	position: fixed;
	top: 0; left: 0; right: 0; bottom: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 9999;
	padding: 40rpx;
}

/* ── Modal 卡片 ── */
.modal {
	width: 100%;
	max-width: 680rpx;
	background: var(--card-bg);
	border-radius: 36rpx;
	padding: 48rpx 40rpx 40rpx;
	position: relative;
	box-shadow:
		0 32rpx 80rpx rgba(0, 0, 0, 0.18),
		0 8rpx 24rpx rgba(0, 0, 0, 0.08);
	animation: modalIn 0.30s cubic-bezier(0.34, 1.3, 0.64, 1);
}

.modal-close {
	position: absolute;
	top: 24rpx; right: 28rpx;
	width: 52rpx; height: 52rpx;
	border-radius: 50%;
	background: rgba(0,0,0,0.06);
	display: flex; align-items: center; justify-content: center;
	.modal-close-t { font-size: 30rpx; color: var(--text-muted); line-height: 1; }
}

/* App 图标 */
.modal-app-icon {
	width: 112rpx; height: 112rpx;
	border-radius: 28rpx;
	background: linear-gradient(145deg, var(--primary-color) 0%, #7C7CE8 100%);
	display: flex; align-items: center; justify-content: center;
	margin: 0 auto 28rpx;
	box-shadow: 0 12rpx 32rpx rgba(91, 91, 214, 0.35);

	.mai-t {
		font-size: 20rpx; font-weight: 800;
		color: #fff; letter-spacing: 0;
		line-height: 1.3; text-align: center;
	}
}

.modal-title {
	display: block;
	font-size: 36rpx; font-weight: 800;
	color: var(--text-primary);
	text-align: center;
	margin-bottom: 12rpx;
}

.modal-desc {
	display: block;
	font-size: 25rpx; color: var(--text-gray);
	text-align: center; line-height: 1.55;
	margin-bottom: 32rpx;
}

.modal-tip {
	display: block;
	font-size: 24rpx;
	color: #4B5563;
	line-height: 1.55;
	background: var(--bg-secondary);
	border-radius: 14rpx;
	padding: 16rpx 20rpx;
	margin-bottom: 24rpx;
}

.modal-footer-note {
	margin-top: 20rpx;
	padding: 16rpx 18rpx;
	background: var(--bg-secondary);
	border-radius: 14rpx;

	.mfn-title {
		display: block;
		font-size: 22rpx;
		font-weight: 700;
		color: var(--text-dark);
		margin-bottom: 8rpx;
	}

	.mfn-text {
		display: block;
		font-size: 22rpx;
		line-height: 1.55;
		color: var(--text-gray);
	}
}

/* 步骤（iOS / 手动引导）*/
.modal-steps {
	display: flex; flex-direction: column; gap: 16rpx;
	margin-bottom: 36rpx;
}

.ms-item {
	display: flex; align-items: flex-start; gap: 16rpx;
	background: var(--bg-secondary);
	border-radius: 18rpx;
	padding: 20rpx 22rpx;

	.ms-num {
		width: 40rpx; height: 40rpx; border-radius: 50%;
		background: var(--primary-color);
		display: flex; align-items: center; justify-content: center;
		flex-shrink: 0;
		.ms-n { font-size: 20rpx; font-weight: 800; color: #fff; line-height: 1; }
	}

	.ms-t { font-size: 26rpx; color: var(--text-dark); line-height: 1.55; flex: 1; }
	.ms-em { color: var(--primary-color); font-weight: 700; }
}

/* 优势列表（Chrome 安装）*/
.modal-benefits {
	display: flex; flex-direction: column; gap: 16rpx;
	margin-bottom: 36rpx;
}

.mb-item {
	display: flex; align-items: center; gap: 16rpx;
	padding: 16rpx 20rpx;
	background: var(--bg-secondary);
	border-radius: 16rpx;

	.mb-icon { font-size: 30rpx; flex-shrink: 0; }
	.mb-text { font-size: 26rpx; color: var(--text-dark); font-weight: 500; }
}

/* 按钮 */
.modal-actions { display: flex; flex-direction: column; gap: 14rpx; }

.btn-primary {
	height: 88rpx;
	border-radius: 22rpx;
	background: var(--primary-color);
	display: flex; align-items: center; justify-content: center;
	box-shadow: 0 8rpx 24rpx rgba(91, 91, 214, 0.30);
	.btn-primary-t { font-size: 30rpx; font-weight: 800; color: #fff; }
}

.btn-dismiss {
	height: 80rpx;
	border-radius: 22rpx;
	background: rgba(0,0,0,0.05);
	display: flex; align-items: center; justify-content: center;
	.btn-dismiss-t { font-size: 27rpx; font-weight: 600; color: var(--text-muted); }
}

/* ── 动画 ── */
@keyframes slideDown {
	from { opacity: 0; transform: translateY(-100%); }
	to   { opacity: 1; transform: translateY(0); }
}

@keyframes fadeIn {
	from { opacity: 0; }
	to   { opacity: 1; }
}

@keyframes modalIn {
	from { opacity: 0; transform: scale(0.88) translateY(20rpx); }
	to   { opacity: 1; transform: scale(1) translateY(0); }
}

@keyframes pulse {
	0%, 100% { opacity: 0.9; transform: scale(1); }
	50%       { opacity: 0.5; transform: scale(0.75); }
}

/* ── 桌面端适配 ── */
@media screen and (min-width: 768px) {
	.entry-pill {
		left: 24px;
		bottom: 32px;
		padding: 10px 18px 10px 14px;
		gap: 8px;
		.ep-icon { font-size: 16px; }
		.ep-text { font-size: 13px; }
	}

	.update-bar { padding: 12px 24px; }

	.modal-wrap { padding: 24px; }
	.modal { max-width: 420px; padding: 36px 32px 32px; }
}
</style>
