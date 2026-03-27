<template>
	<view class="page">

		<uni-nav-bar status-bar left-icon="left" title="Skill 详情" @click-left="goBack" />

			<scroll-view class="main-scroll" scroll-y :show-scrollbar="false">

				<!-- 骨架屏 -->
				<view v-if="pageLoading" class="sk-wrap">
					<view class="sk-line sk-pulse" style="width:72%;height:36rpx;" />
					<view class="sk-row" style="margin-top:20rpx;">
						<view class="sk-av sk-pulse" />
						<view class="sk-col" style="padding-left:16rpx;">
							<view class="sk-line sk-pulse" style="width:130rpx;" />
							<view class="sk-line sk-pulse" style="width:90rpx;margin-top:8rpx;" />
						</view>
					</view>
					<view class="sk-stats-row sk-pulse" style="margin-top:24rpx;" />
					<view class="sk-line sk-pulse" style="width:100%;margin-top:28rpx;" />
					<view class="sk-line sk-pulse" style="width:100%;margin-top:8rpx;" />
					<view class="sk-line sk-pulse" style="width:60%;margin-top:8rpx;" />
					<view class="sk-card-block sk-pulse" style="margin-top:28rpx;" />
				</view>

				<!-- 正文 -->
				<view v-else>
				<!-- 1. 顶部概览区 -->
				<view class="overview-section">
					<text class="skill-title">{{ skill.title }}</text>

				<view class="author-row">
					<view class="author-av" :style="{ background: skill.authorColor }">
						<text class="author-av-t">{{ skill.author[0] }}</text>
					</view>
					<text class="author-name">{{ skill.author }}</text>
					<text class="publish-time">{{ skill.publishTime }}</text>
					<view
						v-if="!isOwnSkill"
						class="follow-btn"
						:class="{ 'follow-btn--active': isFollowing }"
						@tap="followAuthor"
					>
						<text class="follow-btn-text">{{ isFollowing ? '已关注' : '关注' }}</text>
					</view>
				</view>

				<!-- 数据概览 -->
				<view class="overview-stats">
					<view class="ov-stat">
						<text class="ov-stat-val">{{ skill.copyCount }}</text>
						<text class="ov-stat-label">复制数</text>
					</view>
					<view class="ov-divider" />
					<view class="ov-stat">
						<text class="ov-stat-val">{{ skill.favoriteCount }}</text>
						<text class="ov-stat-label">收藏数</text>
					</view>
					<view class="ov-divider" />
					<view class="ov-stat">
						<text class="ov-stat-val green">{{ skill.successRate }}</text>
						<text class="ov-stat-label">复现率</text>
					</view>
					<view class="ov-divider" />
					<view class="ov-stat">
						<text class="ov-stat-val">{{ skill.feedbackCount }}</text>
						<text class="ov-stat-label">反馈数</text>
					</view>
				</view>
			</view>

	      <!-- 简介 -->
	      <view class="skill-intro">
	        <view class="si-head">
	        	<text class="si-title">简介</text>
	        	<view class="scene-tag">{{ skill.scene }}</view>
	        </view>
	        <text class="si-text">{{ skill.brief }}</text>
        <!-- 图片九宫格 -->
        <view v-if="skill.images && skill.images.length" class="skill-imgs">
          <app-image v-for="(src, i) in skill.images.slice(0, 9)" :key="i"
            :src="src" class="skill-img" mode="aspectFill"
            @tap="previewSkillImage(skill.images, i)" />
        </view>
      </view>

      <!-- 使用场景（优先 content.useScenes，兜底 tags） -->
      <view v-if="skill.useScenes.length" class="scene-block">
        <text class="sb-title">使用场景</text>
        <view class="scene-chip-list">
          <view v-for="scene in skill.useScenes" :key="scene" class="scene-chip">
            <text class="scene-chip-text">{{ scene }}</text>
          </view>
        </view>
      </view>

				<!-- 4. Skill 正文区 -->
					<view class="section-card skill-content-card">
						<view class="section-header">
							<uni-icons class="section-badge" type="list" size="18" color="#5E738A" />
							<text class="section-title">Skill 内容</text>
							<view class="copy-all-btn" @tap="copyAll">
								<uni-icons class="copy-all-icon" type="list" size="13" color="#E45C1A" />
								<text class="copy-all-text">复制全部</text>
							</view>
						</view>

						<view class="skill-content-panel">
							<rich-text v-if="promptHtmlNodes" class="scp-rich" :nodes="promptHtmlNodes" />
							<text v-else-if="skill.fullPrompt" class="scp-text">{{ skill.fullPrompt }}</text>
							<view v-else class="scp-empty">
								<text class="scp-empty-t">Prompt 内容待完善</text>
							</view>
						</view>
					</view>
				<!-- 6. 评论区 -->
			<view class="section-card">
				<view class="section-header">
					<uni-icons class="section-badge" type="chatbubble-filled" size="18" color="#5E738A" />
					<text class="section-title">评论</text>
					<view class="write-feedback-btn" @tap="writeFeedback">
						<text class="write-fb-text">写评论</text>
					</view>
				</view>

				<view class="feedback-list">
					<view v-for="fb in skill.feedbacks" :key="fb.id" class="feedback-card">
						<view class="fb-head">
							<view class="fb-av" :style="{ background: fb.userColor }">
								<text class="fb-av-t">{{ fb.userName[0] }}</text>
							</view>
							<view class="fb-meta">
								<text class="fb-name">{{ fb.userName }}</text>
								<text class="fb-time">{{ fb.time }}</text>
							</view>
							<view class="fb-status-badge" :class="'status-' + fb.status">
								<text class="fb-status-text">{{ statusLabel(fb.status) }}</text>
							</view>
						</view>

						<!-- 使用数据（有数据时才显示） -->
						<view v-if="fb.showUsage || fb.model !== '--' || fb.inputToken !== '--' || fb.outputToken !== '--' || fb.totalToken !== '--'" class="fb-token-row">
							<view class="fbt-item">
								<text class="fbt-label">模型</text>
								<text class="fbt-val model">{{ fb.model }}</text>
							</view>
							<view class="fbt-item">
								<text class="fbt-label">输入</text>
								<text class="fbt-val orange">{{ fb.inputToken }}</text>
							</view>
							<view class="fbt-item">
								<text class="fbt-label">输出</text>
								<text class="fbt-val orange">{{ fb.outputToken }}</text>
							</view>
							<view class="fbt-item">
								<text class="fbt-label">总 token</text>
								<text class="fbt-val orange">{{ fb.totalToken }}</text>
							</view>
						</view>

						<text class="fb-comment">{{ fb.comment }}</text>
					</view>
					<view v-if="!skill.feedbacks.length" class="feedback-empty">
						<text class="feedback-empty-text">还没有评论，来抢沙发吧</text>
					</view>
				</view>
			</view>

			<!-- 7. 相似推荐 -->
			<view class="section-card">
				<view class="section-header">
					<uni-icons class="section-badge" type="star-filled" size="18" color="#D6943A" />
					<text class="section-title">相似推荐</text>
				</view>

				<view class="similar-list">
					<view v-for="s in skill.similarSkills" :key="s.id" class="similar-item" @tap="toSkill(s.id)">
						<view class="si-info">
							<text class="si-tag">{{ s.tag }}</text>
							<text class="si-title">{{ s.title }}</text>
							<view class="si-meta">
								<view class="si-token-wrap">
									<uni-icons type="fire-filled" size="12" color="#E45C1A" />
									<text class="si-token orange">{{ s.avgToken }}</text>
								</view>
								<text class="si-rate green">{{ s.successRate }} 复现</text>
							</view>
						</view>
						<view class="si-copy-btn" @tap.stop="copyQuick(s)">
							<text class="si-copy-text">复制</text>
						</view>
					</view>
				</view>
			</view>

			<view class="detail-bottom" />
				</view><!-- /v-else -->
		</scroll-view>

		<!-- 底部固定操作栏 -->
		<view class="bottom-bar">
			<view class="bb-fav" @tap="toggleFavorite">
				<uni-icons
					class="bb-fav-icon"
					:type="isFavorited ? 'star-filled' : 'star'"
					size="18"
					:color="isFavorited ? '#E45C1A' : 'rgba(0,0,0,0.50)'"
				/>
				<text class="bb-fav-text">收藏</text>
			</view>
			<view class="bb-copy-btn" @tap="copySkill">
				<uni-icons class="bb-copy-icon" type="fire-filled" size="16" color="#FFFFFF" />
				<text class="bb-copy-text">复制 Skill</text>
			</view>
		</view>

		<!-- 评论输入浮层 -->
		<view v-if="showFeedbackPanel" class="feedback-overlay" @tap.self="closeFeedbackPanel">
			<view class="feedback-panel">
				<textarea
					class="feedback-ta"
					v-model="feedbackText"
					:focus="showFeedbackPanel"
					placeholder="说说你的体验、踩坑或改进建议..."
					placeholder-class="feedback-ta-ph"
					:maxlength="300"
					auto-height
					:adjust-position="true"
				/>
				<view class="feedback-panel-foot">
					<text class="feedback-char">{{ feedbackText.length }}/300</text>
					<view class="feedback-send" :class="{ on: canSubmitFeedback && !feedbackSubmitting }" @tap="submitFeedback">
						<text class="feedback-send-t">{{ feedbackSubmitting ? '发送中...' : '发送' }}</text>
					</view>
				</view>
			</view>
		</view>

		</view>
	</template>

<script setup lang="ts">
import { copySkill as copySkillApi, createSkillFeedback, favoriteSkill, followCreator, getCreatorProfile, getSkillDetail, unfavoriteSkill, unfollowCreator } from '@/api/skill'
import AppImage from '@/components/app-image/index.vue'
import { useGuideStore, useUserStore } from '@/stores'
import { requireLogin } from '@/utils/auth-guard'
import { normalizeImageUrl } from '@/utils/image-url'
		const userStore = useUserStore()
		const guideStore = useGuideStore()
		const PUBLISHED_SKILL_PREVIEW_KEY = 'latest_published_skill_v1'

	const pageLoading = ref(true)
		const isFavorited = ref(false)
		const isFollowing = ref(false)
		const currentSkillId = ref('')
		const isOwnSkill = ref(false)
		const creatorId = ref<number | null>(null)
	const showFeedbackPanel = ref(false)
	const feedbackText = ref('')
	const feedbackSubmitting = ref(false)

	const createEmptySkill = () => ({
		id: '',
		title: '未命名 Skill',
		scene: '其他',
		author: '匿名用户',
		authorColor: '#5B5BD6',
		publishTime: '--',
		copyCount: '0',
		favoriteCount: '0',
		successRate: '--',
		feedbackCount: '0',
		brief: '',
		tags: [] as string[],
		useScenes: [] as string[],
		images: [] as string[],
		avgInputToken: '--',
		avgOutputToken: '--',
		avgTotalToken: '--',
		estimatedCost: '--',
		recommendedModel: '--',
		commonModel: '--',
		showConsume: false,
		totalUses: '0',
		weekUses: '0',
		fullPrompt: '',
		fullPromptHtml: '',
		feedbacks: [] as any[],
		similarSkills: [] as any[]
	})

	const skill = ref(createEmptySkill())

	const formatCount = (value: number | null | undefined) => {
		const n = Number(value ?? 0)
		if (!Number.isFinite(n) || n <= 0) return '0'
		if (n >= 10000) return `${(n / 1000).toFixed(1)}k`
		return `${Math.round(n)}`
	}

	const parseDisplayCount = (value: string) => {
		const raw = `${value || ''}`.toLowerCase().trim()
		if (!raw) return 0
		const num = Number.parseFloat(raw.replace(/[^0-9.]/g, ''))
		if (!Number.isFinite(num)) return 0
		if (raw.includes('k')) return num * 1000
		return num
	}

	const formatRate = (value: number | null | undefined) => {
		if (value === null || value === undefined || Number.isNaN(Number(value))) return '--'
		return `${Number(value).toFixed(0)}%`
	}

	const formatToken = (value: number | null | undefined) => {
		const n = Number(value ?? 0)
		if (!Number.isFinite(n) || n <= 0) return '--'
		if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
		return `${Math.round(n)}`
	}

	const formatDate = (value: string | null | undefined) => {
		if (!value) return '--'
		const d = new Date(value)
		if (Number.isNaN(d.getTime())) return '--'
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
	}

	const formatCostRange = (low: number | null | undefined, high: number | null | undefined) => {
		if (low === null || high === null || low === undefined || high === undefined) return '--'
		return `¥${Number(low).toFixed(2)}~${Number(high).toFixed(2)}`
	}

	const normalizeSkillId = (raw: unknown) => {
		const text = `${raw ?? ''}`
		if (/^\d+$/.test(text)) return text
		const matched = text.match(/\d+/)
		return matched?.[0] || ''
	}

	const promptHtmlNodes = computed(() => `${skill.value.fullPromptHtml || ''}`.trim())

	const statusLabel = (status: string) => {
		return { success: '成功', normal: '一般', fail: '翻车' }[status] || status
	}

	const normalizeTagList = (raw: unknown): string[] => {
		if (!Array.isArray(raw)) return []
		return raw.map((item) => `${item || ''}`.trim()).filter(Boolean)
	}

	const normalizeImageList = (raw: unknown): string[] => {
		if (!Array.isArray(raw)) return []
		return raw
			.map((item) => {
				if (typeof item === 'string') return normalizeImageUrl(item)
				if (item && typeof item === 'object') {
					const rec = item as { imageUrl?: unknown; url?: unknown }
					const url = `${rec.imageUrl ?? rec.url ?? ''}`.trim()
					return normalizeImageUrl(url)
				}
				return ''
			})
			.filter(Boolean)
	}

	const normalizePlainText = (value: unknown) => `${value ?? ''}`
		.replace(/<[^>]*>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()

	const normalizeUsageModelName = (value: unknown): string => {
		const modelName = `${value ?? ''}`.trim()
		if (!modelName || modelName === '--' || modelName === '未知模型') return ''
		return modelName
	}

	const resolveCurrentSkillModelName = (): string => {
		return normalizeUsageModelName(skill.value.recommendedModel)
			|| normalizeUsageModelName(skill.value.commonModel)
	}

	const hasFeedbackUsage = (fb: any) => {
		const hasModel = !!`${fb?.modelName || ''}`.trim()
		const hasInput = Number(fb?.inputTokens ?? 0) > 0
		const hasOutput = Number(fb?.outputTokens ?? 0) > 0
		const hasTotal = Number(fb?.totalTokens ?? 0) > 0
		return hasModel || hasInput || hasOutput || hasTotal
	}

	const canSubmitFeedback = computed(() => feedbackText.value.trim().length > 0)

	const mapApiDetail = (detail: any) => {
		const detailTags = normalizeTagList(detail?.tags)
		const detailUseScenes = normalizeTagList(detail?.content?.useScenes)
		const finalUseScenes = detailUseScenes.length ? detailUseScenes : detailTags
		const finalTags = detailTags.length ? detailTags : detailUseScenes
		return {
			id: `${detail?.id || ''}`,
			creatorId: detail?.creator?.id ?? null,
			canEdit: !!detail?.canEdit,
			title: `${detail?.title || '未命名 Skill'}`,
			scene: `${detail?.scene || '其他'}`,
			author: `${detail?.creator?.nickname || '匿名用户'}`,
			authorColor: `${detail?.creator?.displayColor || '#5B5BD6'}`,
			publishTime: formatDate(detail?.publishAt),
			copyCount: formatCount(detail?.stats?.copyCount),
			favoriteCount: formatCount(detail?.stats?.favoriteCount),
			successRate: formatRate(detail?.stats?.successRate),
			feedbackCount: formatCount(detail?.stats?.feedbackCount),
			brief: `${detail?.brief ?? detail?.summary ?? ''}`,
			tags: finalTags,
			useScenes: finalUseScenes,
			images: Array.isArray(detail?.images?.cover) && detail.images.cover.length
				? normalizeImageList(detail.images.cover)
				: (detail?.coverImage ? [normalizeImageUrl(detail.coverImage)] : []),
			avgInputToken: formatToken(detail?.tokenInfo?.avgInputTokens),
			avgOutputToken: formatToken(detail?.tokenInfo?.avgOutputTokens),
			avgTotalToken: formatToken(detail?.tokenInfo?.avgTotalTokens),
			estimatedCost: formatCostRange(detail?.tokenInfo?.estimatedCostLow, detail?.tokenInfo?.estimatedCostHigh),
			recommendedModel: `${detail?.tokenInfo?.recommendedModelName || '--'}`,
			commonModel: `${detail?.tokenInfo?.commonModelName || '--'}`,
			showConsume: true,
			totalUses: formatCount(detail?.stats?.totalUses),
			weekUses: formatCount(detail?.stats?.weekUses),
			fullPrompt: `${detail?.content?.fullPrompt || ''}`,
			fullPromptHtml: `${detail?.content?.fullPromptHtml || ''}`,
			feedbacks: Array.isArray(detail?.feedbacks)
				? detail.feedbacks.map((fb: any) => ({
					id: fb.id,
					userName: `${fb?.user?.nickname || '用户'}`,
					userColor: `${fb?.user?.displayColor || '#7B5B3C'}`,
					time: formatDate(fb?.createdAt),
					model: `${fb?.modelName || '--'}`,
					inputToken: formatToken(fb?.inputTokens),
					outputToken: formatToken(fb?.outputTokens),
					totalToken: formatToken(fb?.totalTokens),
					status: `${fb?.status || 'normal'}`,
					showUsage: hasFeedbackUsage(fb),
					comment: `${fb?.comment || ''}`
				}))
				: [],
			similarSkills: Array.isArray(detail?.similarSkills)
				? detail.similarSkills.map((s: any) => ({
					id: `${s?.id || ''}`,
					title: `${s?.title || ''}`,
					tag: `${s?.scene || '其他'}`,
					avgToken: formatToken(s?.avgTotalTokens),
					successRate: formatRate(s?.successRate)
				}))
				: []
		}
	}

	const applyPublishedSkill = (payload: any) => {
		if (!payload || typeof payload !== 'object') return
		const payloadTags = Array.isArray(payload.tags)
			? payload.tags
			: (Array.isArray(payload.useScenes) ? payload.useScenes : skill.value.tags)
		skill.value = {
			...createEmptySkill(),
			...skill.value,
			id: `${payload.id ?? skill.value.id}`,
			title: payload.title ?? skill.value.title,
			scene: payload.scene ?? skill.value.scene,
			author: payload.author ?? skill.value.author,
			authorColor: payload.authorColor ?? skill.value.authorColor,
			publishTime: payload.publishTime ?? skill.value.publishTime,
			copyCount: payload.copyCount ?? skill.value.copyCount,
			favoriteCount: payload.favoriteCount ?? skill.value.favoriteCount,
			successRate: payload.successRate ?? skill.value.successRate,
			feedbackCount: payload.feedbackCount ?? skill.value.feedbackCount,
			brief: payload.brief ?? skill.value.brief,
			tags: payloadTags,
			useScenes: payloadTags,
			images: Array.isArray(payload.images) ? normalizeImageList(payload.images).slice(0, 9) : skill.value.images,
			fullPrompt: payload.fullPrompt ?? skill.value.fullPrompt,
			fullPromptHtml: payload.fullPromptHtml ?? skill.value.fullPromptHtml,
			feedbacks: Array.isArray(payload.feedbacks) ? payload.feedbacks : skill.value.feedbacks,
			similarSkills: Array.isArray(payload.similarSkills) ? payload.similarSkills : skill.value.similarSkills
		}
	}

	const loadSkillDetail = async (rawId: unknown, showSkeleton = true) => {
		const id = normalizeSkillId(rawId)
		if (!id) return
		if (showSkeleton) pageLoading.value = true
		try {
			const detail = await getSkillDetail(id)
			currentSkillId.value = `${detail?.id || id}`
			isFavorited.value = !!detail?.isFavorited
			isOwnSkill.value = !!detail?.canEdit
			creatorId.value = detail?.creator?.id ?? null
			skill.value = mapApiDetail(detail)

			// 获取关注状态（只在已登录且非自己的 Skill 时查）
			if (userStore.token && !detail?.canEdit && detail?.creator?.id) {
				getCreatorProfile(detail.creator.id).then(profile => {
					isFollowing.value = !!profile?.isFollowing
				}).catch(() => {})
			}
		} catch {
		} finally {
			pageLoading.value = false
		}
	}

	const tryRecordCopy = async (sourceChannel: string, modelName?: string) => {
		if (!userStore.token || !currentSkillId.value) return
		try {
			const finalModelName = normalizeUsageModelName(modelName)
			await copySkillApi(
				currentSkillId.value,
				finalModelName
					? { sourceChannel, usage: { modelName: finalModelName } }
					: { sourceChannel }
			)
		} catch {}
	}

	onLoad((query: any) => {
		// 立即同步设好 skillId，保证用户快速点击"写评论"时 skillId 不为空
		const rawId = query?.id
		if (rawId) currentSkillId.value = normalizeSkillId(rawId)

		const isFromPublish = `${query?.fromPublish || ''}` === '1'
		let hasPreloaded = false
		if (isFromPublish) {
			const payload = uni.getStorageSync(PUBLISHED_SKILL_PREVIEW_KEY)
			if (payload) {
				applyPublishedSkill(payload)
				currentSkillId.value = normalizeSkillId(payload.id)
				pageLoading.value = false
				hasPreloaded = true
				uni.showToast({ title: '已加载刚发布内容', icon: 'none' })
			}
		}
		void loadSkillDetail(rawId || currentSkillId.value, !hasPreloaded)
	})

		const copySkill = () => {
			if (!requireLogin(userStore.token, '复制 Skill')) return
			uni.setClipboardData({
				data: skill.value.fullPrompt || '',
				success: () => {
					uni.showToast({ title: '已复制 Skill', icon: 'success' })
					guideStore.markFirstSkillCopy()
					void tryRecordCopy('detail', resolveCurrentSkillModelName())
				}
			})
		}

		const copyAll = () => {
			if (!requireLogin(userStore.token, '复制 Skill')) return
			uni.setClipboardData({
				data: skill.value.fullPrompt || '',
				success: () => {
					uni.showToast({ title: '已复制全部内容', icon: 'success' })
					guideStore.markFirstSkillCopy()
					void tryRecordCopy('copy_all', resolveCurrentSkillModelName())
				}
			})
		}

	const previewSkillImage = (images: string[], idx: number) => {
		if (!images || !images.length) return
		uni.previewImage({ current: images[idx] || images[0], urls: images })
	}

	const toggleFavorite = async () => {
		if (!requireLogin(userStore.token, '收藏 Skill')) return
		if (!currentSkillId.value) return

		try {
			if (isFavorited.value) {
				await unfavoriteSkill(currentSkillId.value)
				isFavorited.value = false
				skill.value.favoriteCount = formatCount(parseDisplayCount(skill.value.favoriteCount) - 1)
				uni.showToast({ title: '已取消收藏', icon: 'none' })
			} else {
				await favoriteSkill(currentSkillId.value)
				isFavorited.value = true
				skill.value.favoriteCount = formatCount(parseDisplayCount(skill.value.favoriteCount) + 1)
				uni.showToast({ title: '已收藏', icon: 'none' })
			}
		} catch {}
	}

	const followAuthor = async () => {
		if (!requireLogin(userStore.token, '关注作者')) return
		if (isOwnSkill.value || !creatorId.value) return
		const prev = isFollowing.value
		isFollowing.value = !prev  // 乐观更新
		try {
			if (prev) {
				await unfollowCreator(creatorId.value)
				uni.showToast({ title: '已取消关注', icon: 'none' })
			} else {
				await followCreator(creatorId.value)
				uni.showToast({ title: '已关注', icon: 'success' })
			}
		} catch {
			isFollowing.value = prev  // 请求失败回滚
		}
	}

	const closeFeedbackPanel = () => {
		if (feedbackSubmitting.value) return
		showFeedbackPanel.value = false
		feedbackText.value = ''
	}

	const submitFeedback = async () => {
		if (feedbackSubmitting.value || !canSubmitFeedback.value || !currentSkillId.value) return
		if (!requireLogin(userStore.token, '写评论')) return

		feedbackSubmitting.value = true
		const comment = feedbackText.value.trim()

		try {
			const result = await createSkillFeedback(currentSkillId.value, {
				status: 'normal',
				comment,
				isPublic: true
			})

			const currentName = `${userStore.userInfo?.nickname || '我'}`
			const currentColor = `${userStore.userInfo?.displayColor || '#5B5BD6'}`
			skill.value.feedbacks.unshift({
				id: Number(result?.id || Date.now()),
				userName: currentName,
				userColor: currentColor,
				time: '刚刚',
				model: '--',
				inputToken: '--',
				outputToken: '--',
				totalToken: '--',
				status: 'normal',
				showUsage: false,
				comment
			})

			if (typeof result?.feedbackCount === 'number') {
				skill.value.feedbackCount = formatCount(result.feedbackCount)
			} else {
				skill.value.feedbackCount = formatCount(parseDisplayCount(skill.value.feedbackCount) + 1)
			}
			if (result && Object.prototype.hasOwnProperty.call(result, 'successRate')) {
				skill.value.successRate = formatRate(result.successRate)
			}

			showFeedbackPanel.value = false
			feedbackText.value = ''
			uni.showToast({ title: '评论成功', icon: 'success' })
		} catch {
			uni.showToast({ title: '评论失败', icon: 'none' })
		}

		feedbackSubmitting.value = false
	}

	const writeFeedback = () => {
		if (!requireLogin(userStore.token, '写评论')) return
		if (!currentSkillId.value) {
			uni.showToast({ title: 'Skill 信息加载中', icon: 'none' })
			return
		}
		feedbackText.value = ''
		showFeedbackPanel.value = true
	}
	const toSkill = (id: string) => uni.navigateTo({ url: `/pages/detail/skill?id=${id}` })
	const copyQuick = async (s: any) => {
		if (!requireLogin(userStore.token, '复制 Skill')) return
		if (s?.id) {
			let copyText = ''
			try {
				const detail = await getSkillDetail(s.id)
				copyText = normalizePlainText(detail?.content?.fullPrompt)
			} catch {}
			if (!copyText) copyText = normalizePlainText(s?.title)
			if (!copyText) {
				uni.showToast({ title: '暂无可复制内容', icon: 'none' })
				return
			}
			const copied = await new Promise<boolean>((resolve) => {
				uni.setClipboardData({
					data: copyText,
					showToast: false,
					success: () => resolve(true),
					fail: () => resolve(false)
				})
			})
			if (!copied) {
				uni.showToast({ title: '复制失败', icon: 'none' })
				return
			}

			try {
				const modelName = normalizeUsageModelName(s?.modelName ?? s?.model)
				await copySkillApi(
					s.id,
					modelName
						? { sourceChannel: 'similar', usage: { modelName } }
						: { sourceChannel: 'similar' }
				)
			} catch {}
			guideStore.markFirstSkillCopy()
		}
		uni.showToast({ title: '已复制 Skill', icon: 'success' })
	}
	const goBack = () => uni.navigateBack()
</script>

<style lang="scss" scoped>
	.page {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--card-bg);
	}


	.main-scroll { flex: 1; overflow: hidden; }

	/* 通用 section 卡 */
	.section-card {
		margin: 20rpx 24rpx 0;
		background: var(--card-bg);
		border-radius: 28rpx;
		border: 1rpx solid rgba(0,0,0,0.07);
		padding: 28rpx;
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: 10rpx;
		margin-bottom: 24rpx;

		.section-badge {
			width: 32rpx;
			height: 32rpx;
			display: flex;
			align-items: center;
			justify-content: center;
			flex-shrink: 0;
		}
		.section-title { font-size: 28rpx; font-weight: 700; color: var(--text-color); flex: 1; }
		.section-subtitle { font-size: 20rpx; color: rgba(0,0,0,0.35); }
	}

	.copy-all-btn {
		height: 52rpx;
		padding: 0 18rpx;
		border-radius: 999rpx;
		background: var(--accent-light);
		border: 1rpx solid rgba(228, 92, 26, 0.16);
		display: flex;
		align-items: center;
		gap: 6rpx;
		justify-content: center;

		.copy-all-icon {
			width: 20rpx;
			height: 20rpx;
			display: flex;
			align-items: center;
			justify-content: center;
			flex-shrink: 0;
		}

		.copy-all-text {
			font-size: 20rpx;
			color: var(--orange-color);
			font-weight: 600;
		}
	}

	/* 2. 简介与场景 */
		.skill-intro {
			margin: 20rpx 24rpx 0;
			background: var(--card-bg);
			border: 1rpx solid rgba(228, 92, 26, 0.14);
			border-radius: 24rpx;
			padding: 24rpx;
			box-shadow: 0 10rpx 30rpx rgba(228, 92, 26, 0.08);

			.si-head {
				display: flex;
				align-items: center;
				justify-content: space-between;
				gap: 12rpx;
				margin-bottom: 12rpx;
			}

			.si-title {
				display: block;
				font-size: 24rpx;
				font-weight: 700;
				color: #B74914;
			}

			.scene-tag {
				display: inline-flex;
				align-items: center;
				justify-content: center;
				flex-shrink: 0;
				font-size: 20rpx;
				color: rgba(0,0,0,0.50);
				background: rgba(0,0,0,0.07);
				padding: 6rpx 18rpx;
				border-radius: 100rpx;
			}

			.si-text {
				display: block;
				font-size: 25rpx;
			color: rgba(0,0,0,0.74);
			line-height: 1.72;
		}
	}

	.scene-block {
		margin: 12rpx 24rpx 0;
		background: var(--card-bg);
		border: 1rpx solid rgba(228, 92, 26, 0.1);
		border-radius: 24rpx;
		padding: 24rpx 24rpx 20rpx;

		.sb-title {
			display: block;
			font-size: 24rpx;
			font-weight: 700;
			color: #B74914;
			margin-bottom: 14rpx;
		}

		.scene-chip-list {
			display: flex;
			flex-wrap: wrap;
			gap: 12rpx;
		}

		.scene-chip {
			height: 52rpx;
			padding: 0 18rpx;
			display: flex;
			align-items: center;
			justify-content: center;
			background: var(--accent-light);
			border: 1rpx solid rgba(228, 92, 26, 0.18);
			border-radius: 999rpx;

			.scene-chip-text {
				font-size: 22rpx;
				color: #C24F16;
				font-weight: 600;
				line-height: 1;
			}
		}
	}

	/* 1. 顶部概览区 */
		.overview-section {
			margin: 20rpx 24rpx 0;
			background: var(--card-bg);
			border-radius: 28rpx;
			border: 1rpx solid rgba(0,0,0,0.07);
			padding: 28rpx;

			.skill-title {
				display: block;
			font-size: 38rpx;
			font-weight: 900;
			color: var(--text-color);
			line-height: 1.3;
			margin-bottom: 24rpx;
			letter-spacing: -0.5rpx;
		}

		.author-row {
			display: flex;
			align-items: center;
			gap: 12rpx;
			margin-bottom: 28rpx;

			.author-av {
				width: 56rpx;
				height: 56rpx;
				border-radius: 50%;
				display: flex;
				align-items: center;
				justify-content: center;
				flex-shrink: 0;

				.author-av-t { font-size: 22rpx; color: #fff; font-weight: 700; }
			}

			.author-name { font-size: 26rpx; color: rgba(0,0,0,0.8); font-weight: 600; }
			.publish-time { font-size: 22rpx; color: rgba(0,0,0,0.40); flex: 1; }

			.follow-btn {
				background: rgba(228, 92, 26, 0.15);
				border: 1rpx solid rgba(228, 92, 26, 0.2);
				padding: 10rpx 24rpx;
				border-radius: 100rpx;

				.follow-btn-text { font-size: 22rpx; color: var(--orange-color); font-weight: 600; }

				&.follow-btn--active {
					background: rgba(0, 0, 0, 0.06);
					border-color: rgba(0, 0, 0, 0.12);
					.follow-btn-text { color: rgba(0, 0, 0, 0.40); }
				}
			}
		}

		.overview-stats {
			display: flex;
			align-items: center;
			background: rgba(0,0,0,0.03);
			border-radius: 20rpx;
			padding: 20rpx 0;

			.ov-stat {
				flex: 1;
				display: flex;
				flex-direction: column;
				align-items: center;
				gap: 6rpx;

				.ov-stat-val { font-size: 28rpx; font-weight: 800; color: var(--text-color); }
				.ov-stat-val.green { color: var(--green-color); }
				.ov-stat-label { font-size: 20rpx; color: rgba(0,0,0,0.40); }
			}

			.ov-divider {
				width: 1rpx;
				height: 36rpx;
				background: rgba(0,0,0,0.08);
			}
		}
	}

		/* 图片九宫格 */
		.skill-imgs {
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 10rpx;
			margin-top: 16rpx;

			.skill-img {
				width: 100%;
				height: 168rpx;
				border-radius: 12rpx;
				display: block;
				background: rgba(0, 0, 0, 0.04);
			}
		}


		/* 4. Skill 正文区 */
		.skill-content-card {
			padding-top: 20rpx;

			.section-header {
				margin-bottom: 18rpx;
			}

			.skill-content-panel {
				background: #191A31;
				border-radius: 26rpx;
				padding: 28rpx;
				border: 1rpx solid rgba(255,255,255,0.06);

				.scp-empty {
					padding: 40rpx 0;
					display: flex;
					align-items: center;
					justify-content: center;
				}
				.scp-empty-t {
					font-size: 24rpx;
					color: rgba(255,255,255,0.20);
				}
			}

			.scp-text,
			.scp-rich {
				display: block;
				font-size: 24rpx;
				color: #AEB7FF;
				line-height: 1.72;
				white-space: pre-wrap;
				word-break: break-word;
			}

				.scp-rich :deep(img) {
					max-width: 100%;
					height: auto;
					border-radius: 10rpx;
				}
			}

	/* 6. 复现反馈区 */
	.write-feedback-btn {
		background: rgba(228, 92, 26,0.12);
		border: 1rpx solid rgba(228, 92, 26, 0.16);
		padding: 8rpx 20rpx;
		border-radius: 100rpx;

		.write-fb-text { font-size: 22rpx; color: var(--orange-color); font-weight: 600; }
	}

		.feedback-list {
			display: flex;
			flex-direction: column;
			gap: 20rpx;

		.feedback-card {
			background: rgba(0,0,0,0.03);
			border-radius: 20rpx;
			padding: 20rpx;

			.fb-head {
				display: flex;
				align-items: center;
				gap: 12rpx;
				margin-bottom: 16rpx;

				.fb-av {
					width: 52rpx;
					height: 52rpx;
					border-radius: 50%;
					display: flex;
					align-items: center;
					justify-content: center;
					flex-shrink: 0;

					.fb-av-t { font-size: 20rpx; color: #fff; font-weight: 700; }
				}

				.fb-meta {
					flex: 1;

					.fb-name { display: block; font-size: 24rpx; font-weight: 600; color: rgba(0,0,0,0.8); }
					.fb-time { font-size: 20rpx; color: rgba(0,0,0,0.40); }
				}

				.fb-status-badge {
					font-size: 20rpx;
					padding: 6rpx 14rpx;
					border-radius: 100rpx;

					&.status-success { color: var(--green-color); background: rgba(47, 138, 87,0.12); }
					&.status-normal { color: var(--blue-color); background: rgba(94, 115, 138,0.12); }
					&.status-fail { color: var(--red-color); background: rgba(200, 70, 52,0.12); }

					.fb-status-text { font-weight: 600; }
				}
			}

			.fb-token-row {
				display: flex;
				gap: 0;
				background: rgba(0,0,0,0.03);
				border-radius: 12rpx;
				padding: 12rpx 0;
				margin-bottom: 16rpx;

				.fbt-item {
					flex: 1;
					display: flex;
					flex-direction: column;
					align-items: center;
					gap: 4rpx;

					.fbt-label { font-size: 18rpx; color: rgba(0,0,0,0.35); }
					.fbt-val { font-size: 22rpx; font-weight: 700; color: rgba(0,0,0,0.70); }
					.fbt-val.orange { color: var(--orange-color); }
					.fbt-val.model { font-size: 20rpx; color: #C7A06A; }
				}
			}

			.fb-comment {
				font-size: 24rpx;
				color: rgba(0,0,0,0.70);
				line-height: 1.65;
				}
			}
		}

		.feedback-empty {
			padding: 28rpx 20rpx;
			text-align: center;
			background: rgba(0, 0, 0, 0.03);
			border-radius: 16rpx;
			border: 1rpx dashed rgba(0, 0, 0, 0.10);

			.feedback-empty-text {
				font-size: 24rpx;
				color: rgba(0, 0, 0, 0.45);
			}
		}

	/* 7. 相似推荐 */
	.similar-list {
		display: flex;
		flex-direction: column;
		gap: 16rpx;

		.similar-item {
			display: flex;
			align-items: center;
			gap: 20rpx;
			padding: 18rpx 0;
			border-bottom: 1rpx solid rgba(0,0,0,0.05);

			&:last-child { border-bottom: none; }

			.si-info {
				flex: 1;

				.si-tag {
					display: inline-flex;
					font-size: 18rpx;
					color: rgba(0,0,0,0.40);
					background: rgba(0,0,0,0.06);
					padding: 3rpx 12rpx;
					border-radius: 6rpx;
					margin-bottom: 8rpx;
				}

				.si-title { display: block; font-size: 26rpx; font-weight: 700; color: var(--text-color); margin-bottom: 8rpx; }

				.si-meta {
					display: flex;
					gap: 16rpx;

					.si-token-wrap {
						display: flex;
						align-items: center;
						gap: 4rpx;
					}

					.si-token { font-size: 22rpx; }
					.orange { color: var(--orange-color); }
					.si-rate { font-size: 22rpx; }
					.green { color: var(--green-color); }
				}
			}

			.si-copy-btn {
				background: rgba(228, 92, 26,0.12);
				border: 1rpx solid rgba(228, 92, 26, 0.16);
				padding: 12rpx 24rpx;
				border-radius: 100rpx;
				flex-shrink: 0;

				.si-copy-text { font-size: 22rpx; color: var(--orange-color); font-weight: 600; }
			}
		}
	}

	.detail-bottom { height: calc(180rpx + env(safe-area-inset-bottom)); }

/* ── 骨架屏 ── */
.sk-wrap {
	padding: 28rpx 32rpx 0;
}
.sk-pulse {
	background: linear-gradient(90deg, #EBEBEB 25%, #F5F5F5 50%, #EBEBEB 75%);
	background-size: 200% 100%;
	animation: skShimmer 1.5s ease-in-out infinite;
}
.sk-av {
	width: 72rpx;
	height: 72rpx;
	border-radius: 50%;
	flex-shrink: 0;
}
.sk-line {
	height: 24rpx;
	border-radius: 6rpx;
}
.sk-row {
	display: flex;
	align-items: center;
}
.sk-col {
	flex: 1;
	display: flex;
	flex-direction: column;
}
.sk-card-block {
	height: 180rpx;
	border-radius: 20rpx;
}
.sk-stats-row {
	height: 100rpx;
	border-radius: 16rpx;
}
@keyframes skShimmer {
	0%   { background-position: 200% 0; }
	100% { background-position: -200% 0; }
}

	/* 底部固定操作栏 */
	.bottom-bar {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
		background: var(--card-bg);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border-top: 1rpx solid rgba(0,0,0,0.07);
		display: flex;
		gap: 16rpx;
		align-items: center;

		.bb-fav {
			width: 96rpx;
			height: 88rpx;
			background: rgba(0,0,0,0.06);
			border-radius: 24rpx;
			border: 1rpx solid rgba(0,0,0,0.09);
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			gap: 4rpx;

			.bb-fav-icon {
				width: 30rpx;
				height: 30rpx;
				display: flex;
				align-items: center;
				justify-content: center;
			}
			.bb-fav-text { font-size: 18rpx; color: rgba(0,0,0,0.50); }
		}

		.bb-copy-btn {
			flex: 1;
			height: 88rpx;
			background: var(--orange-color);
			border-radius: 24rpx;
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 12rpx;
			box-shadow: 0 8rpx 28rpx rgba(228, 92, 26, 0.24);

			.bb-copy-icon {
				width: 24rpx;
				height: 24rpx;
				display: flex;
				align-items: center;
				justify-content: center;
				flex-shrink: 0;
			}
			.bb-copy-text { font-size: 30rpx; font-weight: 700; color: #fff; }
		}
	}

		/* 复制成功引导 */
		.feedback-overlay {
			position: fixed;
			inset: 0;
			background: rgba(0, 0, 0, 0.45);
			z-index: 210;
			display: flex;
			align-items: flex-end;
		}

		.feedback-panel {
			width: 100%;
			background: var(--card-bg);
			border-radius: 28rpx 28rpx 0 0;
			padding: 24rpx 24rpx calc(24rpx + env(safe-area-inset-bottom));
			border-top: 1rpx solid rgba(0, 0, 0, 0.08);
		}

		.feedback-ta {
			width: 100%;
			min-height: 180rpx;
			max-height: 360rpx;
			padding: 20rpx;
			box-sizing: border-box;
			border-radius: 18rpx;
			font-size: 28rpx;
			line-height: 1.6;
			color: rgba(0, 0, 0, 0.85);
			background: rgba(0, 0, 0, 0.04);
		}

		.feedback-ta-ph {
			color: rgba(0, 0, 0, 0.30);
		}

		.feedback-panel-foot {
			margin-top: 16rpx;
			display: flex;
			align-items: center;
			justify-content: space-between;
		}

		.feedback-char {
			font-size: 22rpx;
			color: rgba(0, 0, 0, 0.35);
		}

		.feedback-send {
			padding: 10rpx 24rpx;
			border-radius: 999rpx;
			background: rgba(0, 0, 0, 0.10);

			.feedback-send-t {
				font-size: 24rpx;
				color: rgba(0, 0, 0, 0.35);
				font-weight: 600;
			}

			&.on {
				background: rgba(228, 92, 26, 0.12);
				border: 1rpx solid rgba(228, 92, 26, 0.2);

				.feedback-send-t {
					color: var(--orange-color);
				}
			}
		}

	/* 低版本微信 WebView 对 gap/grid 支持不完整，补充降级规则 */
	@supports not (gap: 1px) {
		.navbar .navbar-inner > * + * { margin-left: 16rpx; }
.section-header > * + * { margin-left: 10rpx; }
		.copy-all-btn > * + * { margin-left: 6rpx; }

		.scene-chip-list > * { margin-right: 12rpx; margin-bottom: 12rpx; }
		.overview-section .author-row > * + * { margin-left: 12rpx; }
		.overview-section .ov-stat > * + * { margin-top: 6rpx; }

		.feedback-list > * + * { margin-top: 20rpx; }
		.feedback-list .fb-head > * + * { margin-left: 12rpx; }
		.feedback-list .fbt-item > * + * { margin-top: 4rpx; }

		.similar-list > * + * { margin-top: 16rpx; }
		.similar-list .similar-item > * + * { margin-left: 20rpx; }
		.similar-list .si-meta > * + * { margin-left: 16rpx; }
		.similar-list .si-token-wrap > * + * { margin-left: 4rpx; }

		.bottom-bar > * + * { margin-left: 16rpx; }
		.bottom-bar .bb-fav > * + * { margin-top: 4rpx; }
		.bottom-bar .bb-copy-btn > * + * { margin-left: 12rpx; }
	}

	@supports not (display: grid) {
		.skill-intro .skill-imgs {
			display: flex;
			flex-wrap: wrap;
			margin: -5rpx;
		}

		.skill-intro .skill-img {
			width: calc((100% - 30rpx) / 3);
			margin: 5rpx;
		}
	}
</style>
