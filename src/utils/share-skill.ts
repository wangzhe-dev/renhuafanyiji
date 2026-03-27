import { imgUrl } from '@/config'
import { useShareStore } from '@/stores'

export type SkillShareInput = {
	id: number | string
	title?: string
	summary?: string
	imageUrl?: string | null
}

const SHARE_WEB_BASE = 'https://www.shaobuqi.com'

const normalizeText = (value: string | undefined, max = 30) => {
	const text = `${value || ''}`.replace(/\s+/g, ' ').trim()
	if (!text) return ''
	return text.length > max ? `${text.slice(0, max)}...` : text
}

const buildSharePath = (id: number | string) => `/pages/detail/skill?id=${id}`
const buildShareLink = (id: number | string) => `${SHARE_WEB_BASE}/#/pages/detail/skill?id=${id}`

const isShareCanceled = (error: unknown) => {
	const err = error as { name?: string; errMsg?: string; message?: string }
	const message = `${err?.errMsg || err?.message || ''}`.toLowerCase()
	return err?.name === 'AbortError' || message.includes('cancel')
}

const tryOpenShareMenu = async (menus?: string[]) =>
	await new Promise<boolean>((resolve) => {
		try {
			const options: Record<string, unknown> = {
				withShareTicket: true,
				success: () => resolve(true),
				fail: () => resolve(false),
			}
			if (menus?.length) options.menus = menus
			uni.showShareMenu(options as any)
		} catch {
			resolve(false)
		}
	})

const copyShareLink = async (link: string) =>
	await new Promise<boolean>((resolve) => {
		uni.setClipboardData({
			data: link,
			success: () => resolve(true),
			fail: () => resolve(false),
		})
	})

const tryH5WebShare = async (payload: { title: string; summary: string; link: string }) => {
	// #ifdef H5
	if (typeof window !== 'undefined') {
		const nav = window.navigator as Navigator & {
			share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>
		}
		if (typeof nav.share === 'function') {
			try {
				await nav.share({
					title: payload.title,
					text: payload.summary,
					url: payload.link,
				})
				return 'shared' as const
			} catch (error) {
				return isShareCanceled(error) ? ('canceled' as const) : ('failed' as const)
			}
		}
	}
	// #endif
	return 'unsupported' as const
}

export const shareSkillItem = async (input: SkillShareInput) => {
	const id = Number.parseInt(`${input.id}`, 10)
	if (!Number.isInteger(id) || id <= 0) {
		uni.showToast({ title: '分享失败：Skill 不存在', icon: 'none' })
		return
	}

	const title = normalizeText(input.title, 36) || '精选 Skill'
	const summary = normalizeText(input.summary, 40) || '来自烧不起的精选 Skill'
	const payload = {
		id,
		title,
		summary,
		path: buildSharePath(id),
		link: buildShareLink(id),
		imageUrl: input.imageUrl || `${imgUrl}/default-share.png`,
	}

	// #ifdef MP-WEIXIN
	const shareStore = useShareStore()
	shareStore.setMpShareFriend({
		title: payload.title,
		path: payload.path,
		imageUrl: payload.imageUrl,
	})
	shareStore.setMpShareTimeline({
		title: payload.title,
		query: `id=${payload.id}`,
		imageUrl: payload.imageUrl,
	})
	const openedInWeixin = await tryOpenShareMenu(['shareAppMessage', 'shareTimeline'])
	if (openedInWeixin) return
	// #endif

	const h5ShareResult = await tryH5WebShare(payload)
	if (h5ShareResult === 'shared' || h5ShareResult === 'canceled') return

	const openedShareMenu = await tryOpenShareMenu()
	if (openedShareMenu) {
		uni.showToast({ title: '请选择分享渠道', icon: 'none' })
		return
	}

	const copied = await copyShareLink(payload.link)
	if (!copied) {
		uni.showToast({ title: '暂不支持当前分享方式', icon: 'none' })
	}
}

