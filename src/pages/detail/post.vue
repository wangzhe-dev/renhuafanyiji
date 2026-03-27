<template>
	<view class="page">
		<scroll-view
			class="scrl"
			scroll-y
			:show-scrollbar="false"
			:scroll-into-view="scrollIntoView"
			scroll-with-animation
		>

			<!-- 骨架屏 -->
			<view v-if="pageLoading" class="sk-wrap">
				<view class="sk-row">
					<view class="sk-av sk-pulse" />
					<view class="sk-col" style="padding-left:16rpx;">
						<view class="sk-line sk-pulse" style="width:150rpx;" />
						<view class="sk-line sk-pulse" style="width:100rpx;margin-top:8rpx;" />
					</view>
				</view>
				<view class="sk-line sk-pulse" style="width:100%;margin-top:28rpx;" />
				<view class="sk-line sk-pulse" style="width:100%;margin-top:8rpx;" />
				<view class="sk-line sk-pulse" style="width:65%;margin-top:8rpx;" />
				<view class="sk-card-block sk-pulse" style="margin-top:28rpx;" />
				<view class="sk-line sk-pulse" style="width:120rpx;margin-top:36rpx;" />
				<view class="sk-row" style="margin-top:20rpx;">
					<view class="sk-av-sm sk-pulse" />
					<view class="sk-col" style="padding-left:12rpx;">
						<view class="sk-line sk-pulse" style="width:100rpx;" />
						<view class="sk-line sk-pulse" style="width:90%;margin-top:8rpx;" />
					</view>
				</view>
				<view class="sk-row" style="margin-top:20rpx;">
					<view class="sk-av-sm sk-pulse" />
					<view class="sk-col" style="padding-left:12rpx;">
						<view class="sk-line sk-pulse" style="width:80rpx;" />
						<view class="sk-line sk-pulse" style="width:75%;margin-top:8rpx;" />
					</view>
				</view>
			</view>

			<!-- 正文 -->
			<view v-else>

			<!-- 作者行 -->
			<view class="author-row">
				<view class="av" :style="{ background: post.authorColor }" @tap="toAuthor(post.authorId)">
					<text class="av-t">{{ post.author[0] }}</text>
				</view>
				<view class="author-info" @tap="toAuthor(post.authorId)">
					<view class="name-row">
						<text class="author-name">{{ post.author }}</text>
						<view class="model-tag" :style="{ background: post.modelColor + '18' }">
							<view class="model-dot" :style="{ background: post.modelColor }" />
							<text class="model-n" :style="{ color: post.modelColor }">{{ post.model }}</text>
						</view>
					</view>
					<text class="post-time">{{ post.time }}</text>
				</view>
				<view v-if="canFollowAuthor" class="follow-btn" :class="{ on: isFollowing }" @tap="toggleFollow">
					<text class="follow-t">{{ isFollowing ? '已关注' : '+ 关注' }}</text>
				</view>
			</view>

			<!-- 正文 -->
			<text class="body-text">{{ post.content }}</text>

			<view v-if="post.skillId > 0" class="link-skill" @tap="toSkill(post.skillId)">
				<text class="ls-label">关联 Skill</text>
				<text class="ls-title">{{ post.skillTitle || '未命名 Skill' }}</text>
				<text v-if="post.skillScene" class="ls-scene">{{ post.skillScene }}</text>
			</view>

			<!-- 图片九宫格 -->
			<view
				v-if="post.images && post.images.length"
				class="img-grid"
				:class="`gi-${post.images.length >= 3 ? (post.images.length > 3 ? 'many' : 3) : post.images.length}`"
			>
				<app-image
					v-for="(src, i) in post.images.slice(0, 9)" :key="i"
					:src="src" class="gi-img" mode="aspectFill"
					@tap="previewImg(post.images, i)"
				/>
			</view>

			<!-- 消耗数据卡 -->
			<view class="consume-card">
				<view class="consume-head">
					<text class="consume-title">消耗数据</text>
					<text class="consume-time">{{ post.time }}</text>
				</view>

				<view class="consume-model-row">
					<text class="consume-label">AI 模型</text>
					<view class="consume-model-chip" :style="{ background: post.modelColor + '15' }">
						<view class="consume-model-dot" :style="{ background: post.modelColor }" />
						<text class="consume-model-text" :style="{ color: post.modelColor }">{{ post.model }}</text>
					</view>
				</view>

				<view class="consume-cost-row">
					<view class="consume-cost-box">
						<text class="consume-box-label">花费金额</text>
						<text class="consume-box-value cost">{{ post.costText }}</text>
					</view>
					<view class="consume-cost-bar" />
					<view class="consume-cost-box">
						<text class="consume-box-label">Token 数量</text>
						<text class="consume-box-value token">{{ post.tokens }}</text>
					</view>
				</view>

				<view class="consume-foot">
					<text v-if="post.skillScene" class="consume-scene">{{ post.skillScene }}</text>
					<view
						class="consume-reaction"
						:style="currentReaction
							? { background: currentReaction.bgColor, borderColor: currentReaction.borderColor }
							: {}"
					>
						<view class="consume-reaction-inner">
							<uni-icons
								:type="currentReaction ? currentReaction.icon : 'info'"
								size="14"
								:color="currentReaction ? currentReaction.activeColor : '#9CA3AF'"
							/>
							<text
								class="consume-reaction-text"
								:style="currentReaction ? { color: currentReaction.activeColor } : {}"
							>
								{{ currentReaction ? currentReaction.text : '未标记' }}
							</text>
						</view>
					</view>
					<view class="consume-acts">
						<view class="consume-act" :class="{ on: isLiked }" @tap="toggleLike">
							<uni-icons
								:type="isLiked ? 'heart-filled' : 'heart'"
								size="16"
								:color="isLiked ? '#C84634' : 'rgba(0,0,0,0.42)'"
							/>
							<text class="consume-act-n" :style="isLiked ? { color: '#C84634' } : {}">{{ post.likes }}</text>
						</view>
						<view class="consume-act" :class="{ on: isResonated }" @tap="toggleResonate">
							<uni-icons
								type="hand-up"
								size="15"
								:color="isResonated ? '#FF7A45' : 'rgba(0,0,0,0.42)'"
							/>
							<text class="consume-act-n" :style="isResonated ? { color: '#FF7A45' } : {}">{{ post.resonates }}</text>
						</view>
					</view>
				</view>
			</view>

			<view class="h-divider" style="margin-top: 8rpx;" />

			<!-- 评论区 -->
			<view id="section-comments" class="comments">
				<text class="cmt-title">评论 {{ post.comments }}</text>

				<view v-for="c in comments" :key="c.id" class="cmt-item">
					<view class="cmt-av" :style="{ background: c.color }">
						<text class="cmt-av-t">{{ c.user[0] }}</text>
					</view>
					<view class="cmt-body">
						<view class="cmt-hd">
							<text class="cmt-name">{{ c.user }}</text>
							<text class="cmt-time">{{ c.time }}</text>
						</view>
						<text class="cmt-txt">{{ c.content }}</text>
						<view class="cmt-acts">
							<view class="cmt-like" @tap="likeComment(c)">
								<uni-icons
									:type="c.liked ? 'heart-filled' : 'heart'"
									size="14"
									:color="c.liked ? '#C84634' : 'rgba(0,0,0,0.25)'"
								/>
								<text class="cmt-like-n">{{ c.likes }}</text>
							</view>
							<text class="cmt-reply" @tap="replyComment(c)">回复</text>
						</view>
					</view>
				</view>

				<!-- 加载更多 / 结束态 -->
				<view v-if="loadingMore" class="load-state">
					<text class="load-state-t">加载中…</text>
				</view>
				<view v-else-if="noMoreComments" class="load-end">
					<view class="load-end-line" />
					<text class="load-end-t">已展示全部评论</text>
					<view class="load-end-line" />
				</view>
				<view v-else class="load-more" @tap="loadMoreComments">
					<text class="load-more-t">查看更多评论 ›</text>
				</view>
			</view>

			<view class="scroll-gap" />
			</view><!-- /v-else -->
		</scroll-view>

		<!-- 底部固定栏 -->
		<view class="btm-bar">
			<view class="cmt-input-fake" @tap="openCmtPanel()">
				<uni-icons type="chat" size="16" color="rgba(0,0,0,0.30)" />
				<text class="cmt-ph">说点什么，或者晒出你的用量...</text>
			</view>
			<view class="btm-acts">
				<view class="btm-act" @tap="toggleLike">
					<uni-icons
						:type="isLiked ? 'heart-filled' : 'heart'"
						size="18"
						:color="isLiked ? '#C84634' : 'rgba(0,0,0,0.40)'"
					/>
					<text class="btm-act-n" :style="isLiked ? { color: '#C84634' } : {}">{{ post.likes }}</text>
				</view>
				<view class="btm-act meoo" :class="{ on: isResonated }" @tap="toggleResonate">
					<uni-icons type="hand-up" size="16" :color="isResonated ? '#FF7A45' : 'rgba(0,0,0,0.40)'" />
					<text class="meoo-t" :style="isResonated ? { color: '#FF7A45' } : {}">我也是</text>
				</view>
				<view class="btm-act" @tap="sharePost">
					<uni-icons type="redo" size="18" color="rgba(0,0,0,0.40)" />
				</view>
			</view>
		</view>

		<!-- 评论输入浮层 -->
		<view v-if="showCmtPanel" class="cmt-overlay" @tap.self="closeCmtPanel">
			<view class="cmt-panel">
				<!-- 回复目标提示 -->
				<view v-if="replyTarget" class="reply-hint">
					<text class="reply-hint-t">回复 {{ replyTarget.user }}</text>
					<text class="reply-hint-x" @tap="replyTarget = null">×</text>
				</view>
				<textarea
					class="cmt-ta"
					v-model="cmtText"
					:focus="showCmtPanel"
					:placeholder="replyTarget ? `回复 @${replyTarget.user}...` : '说点什么，或者晒出你的用量...'"
					placeholder-class="cmt-ta-ph"
					:maxlength="300"
					auto-height
					:adjust-position="true"
				/>
				<view class="cmt-panel-foot">
					<text class="cmt-char">{{ cmtText.length }}/300</text>
					<view class="cmt-send" :class="{ on: cmtText.trim().length > 0 }" @tap="submitComment">
						<text class="cmt-send-t">发送</text>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup lang="ts">
import { nextTick } from 'vue'
import {
	createFeedComment,
	getFeedComments,
	getFeedPost,
	likeFeedComment,
	likeFeedPost,
	meooFeedPost,
	type FeedComment,
	type FeedItem,
	unlikeFeedComment,
	unlikeFeedPost,
	unmeooFeedPost,
} from '@/api/feed'
import { followCreator, getCreatorProfile, unfollowCreator } from '@/api/skill'
import AppImage from '@/components/app-image/index.vue'
import { useUserStore } from '@/stores'
import { requireLogin } from '@/utils/auth-guard'
import { normalizeImageUrl } from '@/utils/image-url'
import { shareFeedPost } from '@/utils/share-post'

type CommentItem = {
	id: number
	user: string
	userId: number
	color: string
	time: string
	content: string
	likes: number
	liked: boolean
	parentId: number | null
}

const FALLBACK_COLORS = ['#5B5BD6', '#7C3AED', '#0891B2', '#059669', '#D6943A', '#C84634']
const fallbackColor = (userId: number) => FALLBACK_COLORS[userId % FALLBACK_COLORS.length]

const modelColor = (modelName: string) => {
	const val = modelName.toLowerCase()
	if (val.includes('claude')) return '#C7A06A'
	if (val.includes('gpt')) return '#2F8A57'
	if (val.includes('deepseek')) return '#5E738A'
	if (val.includes('gemini')) return '#D6943A'
	return '#5B5BD6'
}

const formatRelativeTime = (isoStr: string): string => {
	const now = Date.now()
	const ts = new Date(isoStr).getTime()
	if (Number.isNaN(ts)) return '--'
	const diff = now - ts
	if (diff < 60_000) return '刚刚'
	if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}分钟前`
	if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}小时前`
	if (diff < 172_800_000) return '昨天'
	const d = new Date(isoStr)
	return `${d.getMonth() + 1}/${d.getDate()}`
}

const formatCost = (amount: string | null, currency: string): string => {
	if (amount === null || amount === undefined || `${amount}` === '') return '--'
	const n = Number.parseFloat(`${amount}`)
	if (!Number.isFinite(n)) return '--'
	const code = `${currency || 'CNY'}`.toUpperCase()
	if (code === 'CNY') return `¥${n.toFixed(2)}`
	if (code === 'USD') return `$${n.toFixed(4)}`
	return `${code} ${n.toFixed(4)}`
}

const formatTokens = (total: number | null): string => {
	if (total === null || total === undefined) return '--'
	if (total >= 1_000_000) return `${(total / 1_000_000).toFixed(1)}M`
	if (total >= 1_000) return `${(total / 1_000).toFixed(1)}K`
	return String(total)
}

const userStore = useUserStore()
const currentPostId = ref(0)
const currentUserId = computed(() => Number(userStore.userInfo?.id || 0))

const isLiked = ref(false)
const isResonated = ref(false)
const isFollowing = ref(false)
const scrollIntoView = ref('')
const showCmtPanel = ref(false)
const cmtText = ref('')
const replyTarget = ref<CommentItem | null>(null)
const pageLoading = ref(true)
const loadingMore = ref(false)
const noMoreComments = ref(false)
const commentsPage = ref(1)
const COMMENT_PAGE_SIZE = 20

const reactions = [
	{ key: 'worth', icon: 'checkmarkempty', text: '超值', activeColor: '#2F8A57', bgColor: 'rgba(47,138,87,0.10)', borderColor: 'rgba(47,138,87,0.28)' },
	{ key: 'ok', icon: 'info', text: '可接受', activeColor: '#5B5BD6', bgColor: 'rgba(91,91,214,0.10)', borderColor: 'rgba(91,91,214,0.28)' },
	{ key: 'regret', icon: 'clear', text: '偏亏', activeColor: '#C84634', bgColor: 'rgba(200,70,52,0.10)', borderColor: 'rgba(200,70,52,0.28)' },
	{ key: 'addicted', icon: 'fire-filled', text: '上头', activeColor: '#FF7A45', bgColor: 'rgba(255,122,69,0.10)', borderColor: 'rgba(255,122,69,0.28)' },
]

const post = reactive({
	id: '0',
	authorId: 0,
	isMine: false,
	author: '匿名用户',
	authorColor: '#5B5BD6',
	time: '--',
	model: '--',
	modelColor: '#5B5BD6',
	costText: '--',
	tokens: '--',
	content: '',
	images: [] as string[],
	skillId: 0,
	skillTitle: '',
	skillScene: '',
	mood: '',
	likes: 0,
	comments: 0,
	resonates: 0,
})

const currentReaction = computed(() => reactions.find((r) => r.key === post.mood) || null)

const comments = ref<CommentItem[]>([])

const ensureLogin = (action = '执行此操作') =>
	requireLogin(userStore.token, action)

const canFollowAuthor = computed(() => post.authorId > 0 && post.authorId !== currentUserId.value)

const applyPost = (item: FeedItem) => {
	post.id = `${item.id}`
	post.authorId = Number(item.user.id || 0)
	post.isMine = post.authorId > 0 && post.authorId === currentUserId.value
	post.author = item.user.nickname || '匿名用户'
	post.authorColor = item.user.displayColor || fallbackColor(item.user.id)
	post.time = formatRelativeTime(item.createdAt)
	post.model = item.modelName || '--'
	post.modelColor = modelColor(post.model)
	post.costText = formatCost(item.costAmount, item.currency)
	post.tokens = formatTokens(item.totalTokens)
	post.content = item.noteText || ''
	post.images = Array.isArray(item.images)
		? item.images.map((src) => normalizeImageUrl(`${src || ''}`)).filter(Boolean)
		: []
	post.skillId = Number(item.skill?.id || 0)
	post.skillTitle = `${item.skill?.title || ''}`.trim()
	post.skillScene = `${item.skill?.scene || ''}`.trim()
	post.mood = item.reaction || ''
	post.likes = item.likes ?? 0
	post.comments = item.comments ?? 0
	post.resonates = item.meoo ?? 0

	isLiked.value = !!item.liked
	isResonated.value = !!item.myMeoo
}

const mapComment = (item: FeedComment): CommentItem => ({
	id: item.id,
	user: item.user.nickname || '用户',
	userId: item.user.id,
	color: item.user.displayColor || fallbackColor(item.user.id),
	time: formatRelativeTime(item.createdAt),
	content: item.content,
	likes: item.likes ?? 0,
	liked: !!item.liked,
	parentId: item.parentId
})

const loadFollowState = async () => {
	if (!canFollowAuthor.value) {
		isFollowing.value = false
		return
	}

	try {
		const profile = await getCreatorProfile(post.authorId)
		isFollowing.value = !!profile?.isFollowing
	} catch {
		isFollowing.value = false
	}
}

const loadPost = async () => {
	const detail = await getFeedPost(currentPostId.value)
	applyPost(detail)
	await loadFollowState()
}

const loadComments = async (reset: boolean) => {
	const targetPage = reset ? 1 : commentsPage.value
	const res = await getFeedComments(currentPostId.value, {
		page: targetPage,
		pageSize: COMMENT_PAGE_SIZE
	})
	const list = Array.isArray(res?.list) ? res.list.map(mapComment) : []

	if (reset) comments.value = list
	else comments.value.push(...list)

	const totalPages = Number(res?.pagination?.totalPages ?? 0)
	noMoreComments.value = totalPages > 0 ? targetPage >= totalPages : list.length < COMMENT_PAGE_SIZE
	commentsPage.value = noMoreComments.value ? targetPage : targetPage + 1
}

onLoad((query: any) => {
	uni.setNavigationBarTitle({ title: '消耗详情' })
	const parsedId = Number(`${query?.id || ''}`.replace(/[^0-9]/g, ''))
	if (!Number.isInteger(parsedId) || parsedId <= 0) {
		uni.showToast({ title: '动态不存在', icon: 'none' })
		setTimeout(() => {
			uni.navigateBack()
		}, 600)
		return
	}
	currentPostId.value = parsedId

	void Promise.all([loadPost(), loadComments(true)])
		.catch(() => {
			uni.showToast({ title: '动态加载失败', icon: 'none' })
		})
		.finally(() => {
			pageLoading.value = false
		})
})

const toggleLike = async () => {
	if (!ensureLogin('点赞')) return

	const prevLiked = isLiked.value
	const prevLikes = post.likes

	isLiked.value = !prevLiked
	post.likes += isLiked.value ? 1 : -1

	try {
		const res = isLiked.value ? await likeFeedPost(currentPostId.value) : await unlikeFeedPost(currentPostId.value)
		isLiked.value = !!res.liked
		post.likes = res.likes ?? 0
	} catch {
		isLiked.value = prevLiked
		post.likes = prevLikes
	}
}

const toggleResonate = async () => {
	if (!ensureLogin('共鸣')) return

	const prev = isResonated.value
	const prevCount = post.resonates
	isResonated.value = !prev
	post.resonates += isResonated.value ? 1 : -1

	try {
		const res = isResonated.value ? await meooFeedPost(currentPostId.value) : await unmeooFeedPost(currentPostId.value)
		isResonated.value = !!res.myMeoo
		post.resonates = res.meoo ?? 0
	} catch {
		isResonated.value = prev
		post.resonates = prevCount
	}
}

const toggleFollow = () => {
	if (!ensureLogin('关注作者')) return
	if (!canFollowAuthor.value) return

	const prev = isFollowing.value
	isFollowing.value = !prev

	const doToggle = async () => {
		try {
			const result = isFollowing.value
				? await followCreator(post.authorId)
				: await unfollowCreator(post.authorId)
			isFollowing.value = !!result?.isFollowing
		} catch {
			isFollowing.value = prev
			uni.showToast({ title: '关注操作失败', icon: 'none' })
		}
	}

	void doToggle()
}

const likeComment = async (c: CommentItem) => {
	if (!ensureLogin('点赞评论')) return

	const prevLiked = c.liked
	const prevLikes = c.likes
	c.liked = !prevLiked
	c.likes += c.liked ? 1 : -1

	try {
		const res = c.liked ? await likeFeedComment(c.id) : await unlikeFeedComment(c.id)
		c.liked = !!res.liked
		c.likes = res.likes ?? 0
	} catch {
		c.liked = prevLiked
		c.likes = prevLikes
	}
}

/* ── 滚动到评论 ── */
const scrollToComments = () => {
	scrollIntoView.value = ''
	nextTick(() => { scrollIntoView.value = 'section-comments' })
}

/* ── 评论输入面板 ── */
const openCmtPanel = (target?: CommentItem) => {
	if (!ensureLogin('发表评论')) return
	replyTarget.value = target ?? null
	cmtText.value = ''
	showCmtPanel.value = true
}

const closeCmtPanel = () => {
	showCmtPanel.value = false
	replyTarget.value = null
	cmtText.value = ''
}

const submitComment = async () => {
	const text = cmtText.value.trim()
	if (!text || !currentPostId.value) return
	if (!ensureLogin('发表评论')) return

	const prefix = replyTarget.value ? `回复 @${replyTarget.value.user}：` : ''
	const payload = {
		content: `${prefix}${text}`,
		parentId: replyTarget.value?.id || undefined
	}

	try {
		const res = await createFeedComment(currentPostId.value, payload)
		if (res?.comment) comments.value.unshift(mapComment(res.comment))
		post.comments = Number(res?.comments ?? post.comments + 1)
		closeCmtPanel()
		uni.showToast({ title: '评论成功', icon: 'success' })
	} catch {
		uni.showToast({ title: '评论失败', icon: 'none' })
	}
}

const replyComment = (c: CommentItem) => {
	scrollToComments()
	openCmtPanel(c)
}

/* ── 加载更多评论 ── */
const loadMoreComments = async () => {
	if (loadingMore.value || noMoreComments.value) return
	loadingMore.value = true
	try {
		await loadComments(false)
	} catch {
		uni.showToast({ title: '加载评论失败', icon: 'none' })
	}
	loadingMore.value = false
}

const sharePost = async () => {
	const id = Number.parseInt(`${post.id || currentPostId.value}`, 10)
	if (!Number.isInteger(id) || id <= 0) {
		uni.showToast({ title: '动态信息加载中', icon: 'none' })
		return
	}
	await shareFeedPost({
		id,
		author: post.author,
		content: post.content,
		imageUrl: post.images?.[0] || null,
	})
}

const previewImg = (images: string[], current: number) =>
	uni.previewImage({ urls: images, current: images[current] })

const toAuthor = (id: number) => {
	if (!Number.isInteger(id) || id <= 0) return
	uni.navigateTo({ url: `/pages/author/index?id=${id}` })
}

const toSkill = (id: number) => {
	if (!Number.isInteger(id) || id <= 0) return
	uni.navigateTo({ url: `/pages/detail/skill?id=${id}` })
}
</script>

<style lang="scss" scoped>
.page {
	display: flex;
	flex-direction: column;
	height: 100%;
	background: var(--card-bg);
	font-family: 'PingFang SC', 'Hiragino Sans GB', sans-serif;
	overflow: hidden;
	position: relative;
}

.scrl { flex: 1; overflow: hidden; min-height: 0; }

/* ── 作者行 ── */
.author-row {
	display: flex;
	align-items: center;
	gap: 16rpx;
	padding: 24rpx 20rpx 20rpx 28rpx;
}

.av {
	width: 72rpx; height: 72rpx; border-radius: 50%;
	display: flex; align-items: center; justify-content: center; flex-shrink: 0;
	.av-t { font-size: 26rpx; color: #fff; font-weight: 800; }
}

.author-info { flex: 1; display: flex; flex-direction: column; gap: 6rpx; }

.name-row { display: flex; align-items: center; gap: 10rpx; }

.author-name { font-size: 30rpx; font-weight: 700; color: var(--text-primary); }

.model-tag {
	display: flex; align-items: center; gap: 6rpx;
	border-radius: 100rpx; padding: 4rpx 12rpx;
	flex-shrink: 0;
	.model-dot { width: 8rpx; height: 8rpx; border-radius: 50%; flex-shrink: 0; }
	.model-n { font-size: 18rpx; font-weight: 600; }
}

.post-time { font-size: 22rpx; color: var(--text-muted); }

.follow-btn {
	border: 2rpx solid rgba(228,92,26,0.45);
	border-radius: 100rpx; padding: 12rpx 28rpx; flex-shrink: 0;
	.follow-t { font-size: 24rpx; color: var(--orange-color); font-weight: 600; }
	&.on { border-color: rgba(0,0,0,0.09); .follow-t { color: rgba(0,0,0,0.35); } }
}

/* ── 正文 ── */
.body-text {
	display: block;
	font-size: 30rpx; color: var(--text-dark); line-height: 1.80;
	padding: 4rpx 28rpx 24rpx;
}

.link-skill {
	margin: 0 28rpx 20rpx;
	padding: 14rpx 18rpx;
	border-radius: 14rpx;
	background: rgba(91, 91, 214, 0.06); /* ~primary-light-06 */
	display: flex;
	align-items: center;
	gap: 10rpx;

	.ls-label {
		font-size: 20rpx;
		color: var(--primary-color);
		font-weight: 700;
		flex-shrink: 0;
	}

	.ls-title {
		font-size: 22rpx;
		color: var(--text-dark);
		font-weight: 600;
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.ls-scene {
		font-size: 20rpx;
		color: rgba(0,0,0,0.45);
		flex-shrink: 0;
	}
}

/* ── 图片九宫格 ── */
.img-grid {
	display: flex; flex-wrap: wrap; margin-bottom: 24rpx;
	&.gi-1 .gi-img { width: 100%; height: 380rpx; }
	&.gi-2 { gap: 4rpx; padding: 0 28rpx;
		.gi-img { width: calc(50% - 2rpx); height: 260rpx; border-radius: 12rpx; }
	}
	&.gi-3, &.gi-many { gap: 4rpx; padding: 0 28rpx;
		.gi-img { width: calc(33.33% - 3rpx); height: 210rpx; border-radius: 10rpx; }
	}
}

/* ── 消耗数据卡 ── */
.consume-card {
	margin: 0 28rpx 24rpx;
	padding: 22rpx 22rpx 18rpx;
	border-radius: 20rpx;
	background: rgba(0,0,0,0.02);
	border: 1rpx solid rgba(0,0,0,0.08);
}

.consume-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 14rpx;
}

.consume-title {
	font-size: 24rpx;
	font-weight: 700;
	color: rgba(0,0,0,0.58);
}

.consume-time {
	font-size: 20rpx;
	color: var(--text-muted);
}

.consume-model-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 14rpx;
}

.consume-label {
	font-size: 22rpx;
	color: rgba(0,0,0,0.42);
}

.consume-model-chip {
	display: inline-flex;
	align-items: center;
	gap: 6rpx;
	padding: 6rpx 12rpx;
	border-radius: 100rpx;
}

.consume-model-dot {
	width: 8rpx;
	height: 8rpx;
	border-radius: 50%;
}

.consume-model-text {
	font-size: 20rpx;
	font-weight: 600;
}

.consume-cost-row {
	display: flex;
	align-items: stretch;
	background: rgba(0,0,0,0.03);
	border-radius: 14rpx;
	padding: 8rpx 10rpx;
}

.consume-cost-box {
	flex: 1;
	display: flex;
	flex-direction: column;
	justify-content: center;
	gap: 6rpx;
	padding: 8rpx 10rpx;
}

.consume-box-label {
	font-size: 20rpx;
	color: rgba(0,0,0,0.35);
}

.consume-box-value {
	font-size: 34rpx;
	font-weight: 800;
	line-height: 1.2;
	font-variant-numeric: tabular-nums;

	&.cost { color: var(--orange-color); }
	&.token { color: var(--yellow-color); }
}

.consume-cost-bar {
	width: 1rpx;
	background: rgba(0,0,0,0.08);
	margin: 8rpx 6rpx;
}

.consume-foot {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 12rpx;
	margin-top: 14rpx;
}

.consume-scene {
	font-size: 20rpx;
	color: rgba(0,0,0,0.45);
}

.consume-reaction {
	padding: 8rpx 14rpx;
	border-radius: 100rpx;
	background: rgba(0,0,0,0.04);
	border: 1rpx solid transparent;
}

.consume-reaction-inner {
	display: inline-flex;
	align-items: center;
	gap: 6rpx;
}

.consume-reaction-text {
	font-size: 22rpx;
	color: var(--text-muted);
	font-weight: 700;
}

.consume-acts {
	margin-left: auto;
	display: inline-flex;
	align-items: center;
	gap: 10rpx;
	padding: 6rpx;
	border-radius: 100rpx;
	background: rgba(0, 0, 0, 0.03);
}

.consume-act {
	display: inline-flex;
	align-items: center;
	gap: 6rpx;
	padding: 8rpx 14rpx;
	border-radius: 100rpx;
	background: rgba(255,255,255,0.92);

	&.on {
		background: rgba(0,0,0,0.04);
	}
}

.consume-act-n {
	font-size: 22rpx;
	line-height: 1.1;
	font-weight: 700;
	color: var(--text-primary);
	font-variant-numeric: tabular-nums;
}

/* ── 分隔线 ── */
.h-divider { height: 1rpx; background: rgba(0,0,0,0.06); margin: 0 28rpx; }

/* ── 评论区 ── */
.comments { padding: 24rpx 28rpx; }

.cmt-title {
	display: block; font-size: 28rpx; font-weight: 700; color: var(--text-primary);
	margin-bottom: 24rpx; padding-bottom: 16rpx;
	border-bottom: 1rpx solid rgba(0,0,0,0.05);
}

.cmt-item { display: flex; gap: 16rpx; margin-bottom: 28rpx; }

.cmt-av {
	width: 64rpx; height: 64rpx; border-radius: 50%;
	display: flex; align-items: center; justify-content: center; flex-shrink: 0;
	.cmt-av-t { font-size: 22rpx; color: #fff; font-weight: 700; }
}

.cmt-body { flex: 1; }

.cmt-hd {
	display: flex; align-items: center; gap: 10rpx; flex-wrap: wrap; margin-bottom: 8rpx;
	.cmt-name { font-size: 26rpx; font-weight: 700; color: var(--text-primary); }
	.cmt-time { font-size: 20rpx; color: var(--text-muted); margin-left: auto; }
}

.cmt-txt {
	display: block; font-size: 26rpx; color: rgba(0,0,0,0.65);
	line-height: 1.65; margin-bottom: 12rpx;
}

.cmt-acts {
	display: flex; align-items: center; gap: 24rpx;
	.cmt-like { display: flex; align-items: center; gap: 6rpx;
		.cmt-like-n { font-size: 22rpx; color: rgba(0,0,0,0.35); }
	}
	.cmt-reply { font-size: 22rpx; color: rgba(0,0,0,0.35); }
}

.load-more {
	text-align: center; padding: 12rpx 0 4rpx;
	.load-more-t { font-size: 24rpx; color: var(--orange-color); }
}

.load-state {
	text-align: center; padding: 12rpx 0;
	.load-state-t { font-size: 24rpx; color: var(--text-muted); }
}

.load-end {
	display: flex; align-items: center; gap: 20rpx; padding: 12rpx 0 4rpx;
	.load-end-line { flex: 1; height: 1rpx; background: var(--border-light); }
	.load-end-t    { font-size: 22rpx; color: var(--border-lighter); white-space: nowrap; }
}

/* btm-bar 约 96rpx 内容 + 16rpx top padding + safe area */
.scroll-gap { height: calc(160rpx + env(safe-area-inset-bottom)); }

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
.sk-av-sm {
	width: 56rpx;
	height: 56rpx;
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
@keyframes skShimmer {
	0%   { background-position: 200% 0; }
	100% { background-position: -200% 0; }
}

/* ── 底部固定栏 ── */
.btm-bar {
	position: fixed; left: 0; right: 0; bottom: 0;
	z-index: 100;
	background: var(--card-bg);
	border-top: 1rpx solid rgba(0,0,0,0.07);
	padding: 16rpx 20rpx calc(16rpx + env(safe-area-inset-bottom));
	display: flex; align-items: center; gap: 12rpx;
}

.cmt-input-fake {
	flex: 1; background: rgba(0,0,0,0.06); border-radius: 100rpx;
	padding: 16rpx 20rpx; display: flex; align-items: center; gap: 10rpx;
	.cmt-ph { font-size: 20rpx; color: rgba(0,0,0,0.28); flex: 1; }
}

.btm-acts { display: flex; align-items: center; gap: 4rpx; }

.btm-act {
	display: flex; align-items: center; gap: 6rpx; padding: 10rpx 12rpx;
	.btm-act-n { font-size: 20rpx; color: rgba(0,0,0,0.40); }
}

.meoo {
	background: rgba(0,0,0,0.05); border-radius: 100rpx;
	border: 1rpx solid rgba(0,0,0,0.08); padding: 10rpx 18rpx;
	.meoo-t { font-size: 22rpx; color: rgba(0,0,0,0.50); font-weight: 600; }
	&.on {
		background: var(--accent-light); border-color: rgba(255,122,69,0.25);
		.meoo-t { color: var(--accent-color); }
	}
}

/* ── 评论输入浮层 ── */
.cmt-overlay {
	position: fixed;
	top: 0; left: 0; right: 0; bottom: 0;
	background: rgba(0,0,0,0.40);
	display: flex; flex-direction: column; justify-content: flex-end;
	z-index: 200;
}

.cmt-panel {
	background: var(--card-bg);
	border-radius: 28rpx 28rpx 0 0;
	padding: 24rpx 28rpx calc(28rpx + env(safe-area-inset-bottom));
}

.reply-hint {
	display: flex; align-items: center; justify-content: space-between;
	background: rgba(91,91,214,0.06); border-radius: 12rpx;
	padding: 12rpx 16rpx; margin-bottom: 16rpx;
	.reply-hint-t { font-size: 24rpx; color: var(--primary-color); font-weight: 600; }
	.reply-hint-x { font-size: 32rpx; color: rgba(0,0,0,0.30); line-height: 1; padding: 0 4rpx; }
}

.cmt-ta {
	width: 100%; min-height: 120rpx; max-height: 240rpx;
	font-size: 28rpx; color: var(--text-primary); line-height: 1.6;
	background: transparent;
	box-sizing: border-box;
}

/* placeholder 样式（mini-program 通过 placeholder-class 生效） */
.cmt-ta-ph { color: rgba(0,0,0,0.28); font-size: 28rpx; }

.cmt-panel-foot {
	display: flex; align-items: center; justify-content: space-between;
	margin-top: 16rpx; padding-top: 16rpx;
	border-top: 1rpx solid rgba(0,0,0,0.06);
}

.cmt-char { font-size: 22rpx; color: var(--text-muted); }

.cmt-send {
	height: 64rpx; padding: 0 32rpx; border-radius: 100rpx;
	background: rgba(91,91,214,0.15);
	display: flex; align-items: center; justify-content: center;
	.cmt-send-t { font-size: 26rpx; font-weight: 700; color: rgba(91,91,214,0.40); }
	&.on {
		background: var(--primary-color);
		.cmt-send-t { color: var(--card-bg); }
	}
}
</style>
