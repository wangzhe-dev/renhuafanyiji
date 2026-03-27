interface AppUpdateVersionInfo {
	versionName?: string
	versionCode?: number | string
	apkUrl?: string
	storeUrl?: string
	force?: boolean
	notes?: string[] | string
	publishedAt?: string
}

interface AppUpdateManifest {
	android?: AppUpdateVersionInfo
	ios?: AppUpdateVersionInfo
}

interface CheckAppUpdateOptions {
	manual?: boolean
}

interface CurrentAppVersionInfo {
	versionName: string
	versionCode: number
}

const DEFAULT_APP_UPDATE_URL = 'https://www.shaobuqi.com/app-version.json'
const SKIPPED_VERSION_KEY = 'sbq_app_update_skipped_version'

let checking = false
let downloading = false
let promptVisible = false

const normalizeVersionCode = (value: unknown): number => {
	const next = Number.parseInt(String(value ?? '').trim(), 10)
	return Number.isFinite(next) ? next : 0
}

const normalizeVersionName = (value: unknown): string => {
	return String(value ?? '').trim()
}

const normalizeNotes = (value: unknown): string[] => {
	if (Array.isArray(value)) {
		return value
			.map((item) => String(item ?? '').trim())
			.filter(Boolean)
	}

	const text = String(value ?? '').trim()
	return text ? [text] : []
}

const compareVersionName = (currentVersion: string, remoteVersion: string): number => {
	const current = currentVersion.split(/[^0-9]+/).filter(Boolean).map((item) => Number.parseInt(item, 10) || 0)
	const remote = remoteVersion.split(/[^0-9]+/).filter(Boolean).map((item) => Number.parseInt(item, 10) || 0)
	const maxLength = Math.max(current.length, remote.length)

	for (let index = 0; index < maxLength; index += 1) {
		const currentValue = current[index] || 0
		const remoteValue = remote[index] || 0
		if (remoteValue > currentValue) return 1
		if (remoteValue < currentValue) return -1
	}

	return 0
}

const getUpdateManifestUrl = (): string => {
	const envUrl = ((import.meta.env.VITE_APP_UPDATE_URL as string | undefined) || '').trim()
	return envUrl || DEFAULT_APP_UPDATE_URL
}

const getCurrentPlatform = (): 'android' | 'ios' | '' => {
	// #ifdef APP-PLUS
	const osName = String(plus.os?.name || uni.getSystemInfoSync().osName || '').toLowerCase()
	if (osName === 'android' || osName === 'ios') return osName
	// #endif
	return ''
}

const getCurrentVersionInfo = (): CurrentAppVersionInfo => {
	// #ifdef APP-PLUS
	return {
		versionName: normalizeVersionName(plus.runtime.version) || '0.0.0',
		versionCode: normalizeVersionCode((plus.runtime as typeof plus.runtime & { versionCode?: number | string }).versionCode)
	}
	// #endif
	return {
		versionName: '0.0.0',
		versionCode: 0
	}
}

const parseManifestResponse = (data: unknown): AppUpdateManifest | null => {
	if (!data) return null

	if (typeof data === 'string') {
		try {
			return JSON.parse(data) as AppUpdateManifest
		} catch {
			return null
		}
	}

	if (typeof data === 'object') return data as AppUpdateManifest
	return null
}

const requestUpdateManifest = async (): Promise<AppUpdateManifest | null> => {
	const url = `${getUpdateManifestUrl()}${getUpdateManifestUrl().includes('?') ? '&' : '?'}t=${Date.now()}`

	return await new Promise((resolve, reject) => {
		uni.request({
			url,
			method: 'GET',
			timeout: 10000,
			success: (res) => {
				const parsed = parseManifestResponse(res.data)
				if (!parsed) {
					reject(new Error('版本清单解析失败'))
					return
				}
				resolve(parsed)
			},
			fail: (err) => {
				reject(err)
			}
		})
	})
}

const getVersionKey = (info: AppUpdateVersionInfo): string => {
	const versionCode = normalizeVersionCode(info.versionCode)
	const versionName = normalizeVersionName(info.versionName)
	return `${versionCode}:${versionName}`
}

const buildUpdateContent = (currentInfo: CurrentAppVersionInfo, remoteInfo: AppUpdateVersionInfo): string => {
	const lines = [
		`当前版本：v${currentInfo.versionName || '未知'}`,
		`最新版本：v${normalizeVersionName(remoteInfo.versionName) || '未知'}`
	]
	const notes = normalizeNotes(remoteInfo.notes)

	if (notes.length > 0) {
		lines.push('', '更新内容：')
		notes.forEach((item) => {
			lines.push(`- ${item}`)
		})
	}

	return lines.join('\n')
}

const shouldUpdate = (currentInfo: CurrentAppVersionInfo, remoteInfo: AppUpdateVersionInfo): boolean => {
	const remoteVersionCode = normalizeVersionCode(remoteInfo.versionCode)
	const currentVersionCode = normalizeVersionCode(currentInfo.versionCode)

	if (remoteVersionCode > 0 && currentVersionCode > 0 && remoteVersionCode !== currentVersionCode) {
		return remoteVersionCode > currentVersionCode
	}

	return compareVersionName(currentInfo.versionName, normalizeVersionName(remoteInfo.versionName)) > 0
}

const markVersionSkipped = (versionKey: string) => {
	try {
		uni.setStorageSync(SKIPPED_VERSION_KEY, versionKey)
	} catch {
		// ignore
	}
}

const getSkippedVersion = (): string => {
	try {
		return String(uni.getStorageSync(SKIPPED_VERSION_KEY) || '')
	} catch {
		return ''
	}
}

const clearSkippedVersion = () => {
	try {
		uni.removeStorageSync(SKIPPED_VERSION_KEY)
	} catch {
		// ignore
	}
}

const showUpdateError = (title: string, content: string, confirmText = '知道了') => {
	uni.showModal({
		title,
		content,
		showCancel: false,
		confirmText
	})
}

const openExternalUrl = (url: string) => {
	if (!url) return
	// #ifdef APP-PLUS
	plus.runtime.openURL(url)
	// #endif
}

const installDownloadedApk = (filePath: string, fallbackUrl: string) => {
	// #ifdef APP-PLUS
	plus.runtime.install(
		filePath,
		{},
		() => {
			uni.showToast({ title: '安装请求已发起', icon: 'none', duration: 2000 })
		},
		(err) => {
			console.error('[APP] 安装更新失败:', err)
			uni.showModal({
				title: '安装失败',
				content: '安装包已下载完成，但调用安装失败。你可以继续通过浏览器下载安装。',
				confirmText: '浏览器下载',
				cancelText: '稍后再说',
				success: ({ confirm }) => {
					if (confirm) openExternalUrl(fallbackUrl)
				}
			})
		}
	)
	// #endif
}

const downloadAndroidApk = (remoteInfo: AppUpdateVersionInfo) => {
	const apkUrl = normalizeVersionName(remoteInfo.apkUrl)
	if (!apkUrl) {
		showUpdateError('缺少安装包地址', '当前版本清单未配置 apkUrl，请先上传新 APK 并更新 app-version.json。')
		return
	}

	if (downloading) {
		uni.showToast({ title: '更新包下载中，请稍候', icon: 'none' })
		return
	}

	downloading = true

	// #ifdef APP-PLUS
	const waiting = plus.nativeUI.showWaiting('正在下载更新...')
	const filename = `_doc/update/shaobuqi-${Date.now()}.apk`
	const downloadTask = plus.downloader.createDownload(
		encodeURI(apkUrl),
		{
			filename,
			retry: 1,
			retryInterval: 2
		},
		(download, status) => {
			downloading = false
			waiting.close()

			if (status === 200) {
				const path = download.filename || filename
				installDownloadedApk(path, apkUrl)
				return
			}

			console.error('[APP] 下载更新失败:', status, download)
			uni.showModal({
				title: '下载失败',
				content: '更新包下载失败，请检查网络后重试。也可以直接打开浏览器下载安装。',
				confirmText: '浏览器下载',
				cancelText: '稍后再说',
				success: ({ confirm }) => {
					if (confirm) openExternalUrl(apkUrl)
				}
			})
		}
	)

	downloadTask.addEventListener('statechanged', (task: { downloadedSize?: number, totalSize?: number }) => {
		const totalSize = Number(task.totalSize || 0)
		const downloadedSize = Number(task.downloadedSize || 0)
		if (!totalSize || totalSize <= 0) return
		const percent = Math.min(100, Math.floor(downloadedSize / totalSize * 100))
		waiting.setTitle(`正在下载更新 ${percent}%`)
	})

	downloadTask.start()
	// #endif
}

const openIosStore = (remoteInfo: AppUpdateVersionInfo) => {
	const storeUrl = normalizeVersionName(remoteInfo.storeUrl)
	if (!storeUrl) {
		showUpdateError('缺少更新地址', '当前版本清单未配置 iOS 的 storeUrl。')
		return
	}

	openExternalUrl(storeUrl)
}

const showUpdatePrompt = (remoteInfo: AppUpdateVersionInfo, currentInfo: CurrentAppVersionInfo, platform: 'android' | 'ios') => {
	if (promptVisible) return

	promptVisible = true
	const force = Boolean(remoteInfo.force)
	const versionKey = getVersionKey(remoteInfo)

	uni.showModal({
		title: force ? '发现重要更新' : '发现新版本',
		content: buildUpdateContent(currentInfo, remoteInfo),
		showCancel: !force,
		cancelText: '稍后再说',
		confirmText: platform === 'android' ? '立即更新' : '前往更新',
		confirmColor: '#5B5BD6',
		success: ({ confirm, cancel }) => {
			if (confirm) {
				clearSkippedVersion()
				if (platform === 'android') {
					downloadAndroidApk(remoteInfo)
					return
				}

				openIosStore(remoteInfo)
				return
			}

			if (cancel && !force) markVersionSkipped(versionKey)
		},
		complete: () => {
			promptVisible = false
		}
	})
}

export const getCurrentAppVersionLabel = (): string => {
	const currentInfo = getCurrentVersionInfo()
	return currentInfo.versionName || '0.0.0'
}

export const checkAppUpdate = async (options: CheckAppUpdateOptions = {}): Promise<boolean> => {
	// #ifndef APP-PLUS
	return false
	// #endif
	// #ifdef APP-PLUS
	if (checking || downloading) return false

	const platform = getCurrentPlatform()
	if (!platform) return false

	checking = true

	try {
		const manifest = await requestUpdateManifest()
		const remoteInfo = manifest?.[platform]
		if (!remoteInfo) {
			if (options.manual) {
				uni.showToast({ title: '未找到该平台的更新配置', icon: 'none' })
			}
			return false
		}

		const currentInfo = getCurrentVersionInfo()
		if (!shouldUpdate(currentInfo, remoteInfo)) {
			clearSkippedVersion()
			if (options.manual) {
				uni.showToast({ title: '当前已是最新版本', icon: 'none' })
			}
			return false
		}

		const versionKey = getVersionKey(remoteInfo)
		if (!remoteInfo.force && getSkippedVersion() === versionKey) {
			if (options.manual) {
				uni.showToast({ title: '该版本稍后提醒已生效', icon: 'none' })
			}
			return false
		}

		showUpdatePrompt(remoteInfo, currentInfo, platform)
		return true
	} catch (err) {
		console.error('[APP] 检查更新失败:', err)
		if (options.manual) {
			uni.showToast({ title: '检查更新失败，请稍后重试', icon: 'none' })
		}
		return false
	} finally {
		checking = false
	}
	// #endif
}
