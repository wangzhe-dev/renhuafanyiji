import * as Pinia from 'pinia'
import { createUnistorage } from 'pinia-plugin-unistorage'
import 'sard-uniapp/global.d.ts'
import { createSSRApp } from 'vue'
import App from './App.vue'
import { imgUrl, loginPage, mainColor } from './config'
import uniapi from './utils/common/uniapi'

// #ifdef H5
import quill from 'quill'
import { createVNode, render } from 'vue'
import PwaPrompt from './components/PwaPrompt.vue'
import { useGuideStore } from './stores'
// #endif

// #ifdef MP-WEIXIN
import mpShareMixin from './mixin/mp-share-mixin'
// #endif

// #ifdef H5
if (typeof window !== 'undefined') {
	;(window as Window & { Quill?: unknown }).Quill = quill

	const ua = window.navigator.userAgent.toLowerCase()
	const isWechat = ua.includes('micromessenger')
	const isIOS = /iphone|ipad|ipod/.test(ua)
	const isStandalone =
		window.matchMedia?.('(display-mode: standalone)')?.matches ||
		(window.navigator as Navigator & { standalone?: boolean }).standalone === true

	// iOS 非独立模式浏览器可能出现 tabbar 底部安全区重复叠加，导致导航偏高
	if (isIOS && !isStandalone) {
		document.documentElement.classList.add('ios-browser')
	}

	// 兼容历史 class，保留微信 iOS 浏览器标记
	if (isWechat && isIOS && !isStandalone) {
		document.documentElement.classList.add('wechat-ios-browser')
	}
}

if (import.meta.env.DEV && import.meta.env.MODE !== 'production' && typeof document !== 'undefined') {
	const script = document.createElement('script')
	script.src = 'https://unpkg.com/vconsole@latest/dist/vconsole.min.js'
	script.onload = () => {
		const VConsole = (window as Window & { VConsole?: new () => unknown }).VConsole
		if (VConsole) new VConsole()
	}
	document.head.appendChild(script)
}
// #endif

export const createApp = () => {
	const app = createSSRApp(App)

	// 全局属性
	app.config.globalProperties.$loginPage = loginPage
	app.config.globalProperties.$imgUrl = imgUrl
	app.config.globalProperties.$mainColor = mainColor

	// pinia 的本地数据缓存插件
	const store = Pinia.createPinia()
	store.use(createUnistorage())
	app.use(store)

	// #ifdef H5
	// 统一控制引导弹层的路由稳定窗口，避免路由切换时连续弹层
	if (typeof window !== 'undefined') {
		const guideStore = useGuideStore(store)
		const w = window as Window & { __shaobuqiGuideLifecycleBound?: boolean }

		const markRouteStableLater = () => guideStore.markRouteChanged()

		if (!w.__shaobuqiGuideLifecycleBound) {
			w.__shaobuqiGuideLifecycleBound = true
			window.addEventListener('hashchange', markRouteStableLater, { passive: true })
			window.addEventListener('popstate', markRouteStableLater, { passive: true })
			document.addEventListener('visibilitychange', () => {
				if (document.visibilityState === 'visible') markRouteStableLater()
			})
		}

		markRouteStableLater()
	}
	// #endif

	// uni工具类函数
	app.use(uniapi)

	// #ifdef MP-WEIXIN
	// 小程序分享的mixin封装
	app.mixin(mpShareMixin)
	// #endif

	// #ifdef H5
	if (typeof document !== 'undefined') {
		const existed = document.getElementById('pwa-prompt-container')
		if (!existed) {
			const pwaContainer = document.createElement('div')
			pwaContainer.id = 'pwa-prompt-container'
			document.body.appendChild(pwaContainer)
			const vnode = createVNode(PwaPrompt)
			vnode.appContext = app._context
			render(vnode, pwaContainer)
		}
	}
	// #endif

	return {
		app,
		Pinia
	}
}
