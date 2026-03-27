// 全局请求拦截器
import Request from 'luch-request'
import type { HttpRequestConfig, HttpResponse, HttpError, HttpTask } from 'luch-request'
import { requestUrl, apiPrefix } from '@/config'
import { useUserStore } from '@/stores'

const service = new Request()

// 白名单（不附加 Authorization 头）
const whiteList = [
	'/auth/wxlogin',
	'/auth/login/password',
	'/auth/send-code',
	'/auth/register',
	'/auth/send-reset-code',
	'/auth/reset-password'
]

// 登录态弹窗锁，避免并发请求重复弹出
let authModalLock = false

// 防重提交内存锁
const PENDING_REQUESTS = new Map<string, { data: string; time: number }>()

const isWhiteListRequest = (url?: string): boolean => {
	if (!url) return false
	const pureUrl = `${url}`.split('?')[0]
	return whiteList.some((item) => pureUrl.endsWith(item) || pureUrl.includes(item))
}

const shouldForceRelogin = (code: number, msg: string, url?: string): boolean => {
	if (code === 40101) return true
	if (code !== 401) return false
	if (isWhiteListRequest(url)) return false

	// 仅登录态失效相关文案触发“重新登录”强提示
	return /(未登录|登录状态无效|登录已过期|token|长时间未登录)/i.test(msg)
}

// 设置全局配置
service.setConfig((config : HttpRequestConfig) => {
	// #ifdef H5
	config.baseURL = `/${apiPrefix}`
	// #endif

	// #ifndef H5
	config.baseURL = requestUrl
	config.sslVerify = false
	config.firstIpv4 = false
	// #endif

	config.timeout = 20000
	config.header = {
		...config.header,
		'Content-Type': 'application/json;charset=UTF-8'
	}
	return config
})

// 请求拦截
service.interceptors.request.use((config : HttpRequestConfig) => {
	// 初始化请求拦截器时，会执行此方法，此时data为undefined，赋予默认{}
	config.data = config.data || {}

	config.header = { ...config.header }

	// 防止数据重复提交
	if (config.method === 'POST' || config.method === 'PUT' || config.method === 'DELETE') {
		const requestKey = `${config.method}-${config.url}`
		const requestData = typeof config.data === 'object' ? JSON.stringify(config.data || {}) : String(config.data)
		const now = Date.now()
		const interval = 1000

		const prevRequest = PENDING_REQUESTS.get(requestKey)
		if (prevRequest && prevRequest.data === requestData && (now - prevRequest.time < interval)) {
			return Promise.reject('数据正在处理，请勿重复提交')
		}
		PENDING_REQUESTS.set(requestKey, { data: requestData, time: now })

		// 定期清理过期的防重记录，防止内存泄漏
		if (PENDING_REQUESTS.size > 50) {
			PENDING_REQUESTS.forEach((val, key) => {
				if (now - val.time > interval) {
					PENDING_REQUESTS.delete(key)
				}
			})
		}
	}

	if (config.url && whiteList.includes(config.url)) return config

	const token = useUserStore().token
	if (token) config.header['Authorization'] = `Bearer ${token}`

	return config
}, (err : HttpRequestConfig<HttpTask> | HttpError) => {
	return Promise.reject(err)
})

// 响应拦截
service.interceptors.response.use((response : HttpResponse) => {
	if (process.env.NODE_ENV === 'development') {
		// 由于类型检查报错，使用类型断言来绕过检查
		const configWithFullPath = response.config as { fullPath : string } & typeof response.config
		console.log(`响应拦截-${configWithFullPath.fullPath.replace(/^https?:\/\/[^\/]+/, '')}：`, response.config.data, response.data)
	}

	const code = response.data.code
	const msg = response.data.msg || '系统错误'
	const requestUrl = response?.config?.url as string | undefined
	if (response.statusCode === 200 && (code === 401 || code === 40101)) {
		if (!shouldForceRelogin(code, msg, requestUrl)) {
			uni.showToast({
				title: msg,
				icon: 'none'
			})
			return Promise.reject(msg)
		}

		if (authModalLock) return Promise.reject(msg)
		authModalLock = true

		if (code === 40101) {
			const tip = '您的账号已在其他设备登录，您被强制下线。如果这不是您的操作，请立即修改您的密码以确保账号安全'
			uni.showModal({
				title: '账号登录提示',
				content: tip,
				confirmText: '重新登录',
				success: () => {
					useUserStore().logout()
				},
				complete: () => {
					authModalLock = false
				}
			})
			return Promise.reject(tip)
		}

		uni.showModal({
			title: '平台安全提醒',
			content: '由于您长时间未登录平台，为保障账号安全，请您重新登录',
			confirmText: '重新登录',
			showCancel: false,
			success: () => {
				useUserStore().logout()
			},
			complete: () => {
				authModalLock = false
			}
		})
		return Promise.reject(msg || 'token已过期')
	} else if (response.statusCode === 200) {
		if (code === 200) return response.data.data

		uni.showToast({
			title: msg,
			icon: 'none'
		})
		return Promise.reject(msg)
	} else {
		const msg = response.data.msg || response.data.error || '系统错误'
		uni.showToast({
			title: msg,
			icon: 'none'
		})
		return Promise.reject(msg)
	}
}, (err : HttpError) => {
	// 对响应错误做点什么 （statusCode !== 200）
	console.error('----------响应错误----------', err)
	uni.showToast({
		title: err.errMsg || '响应错误',
		icon: 'none',
		duration: 3000
	})
	return Promise.reject(err)
})

const http = {
	get<T>(url : string, params ?: object, config ?: HttpRequestConfig) : Promise<T> {
		return service.get(url, { params, ...config })
	},

	post<T>(url : string, data ?: object, config ?: HttpRequestConfig) : Promise<T> {
		return service.post(url, data, config)
	},

	put<T>(url : string, data ?: object, config ?: HttpRequestConfig) : Promise<T> {
		return service.put(url, data, config)
	},

	delete<T>(url : string, data ?: object, config ?: HttpRequestConfig) : Promise<T> {
		return service.delete(url, data, config)
	}
}

export { http }
