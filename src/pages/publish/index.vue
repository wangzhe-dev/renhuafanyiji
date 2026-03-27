<template>
	<view class="page">
		<uni-nav-bar status-bar title="发布" left-width="140rpx" right-width="140rpx">
			<template #left>
				<text class="top-cancel" @tap="goBack">取消</text>
			</template>
			<template #right>
				<view class="btn-pub" :class="{ on: canPublish }" @tap="doPublish">
					<text class="btn-pub-t">发布</text>
				</view>
			</template>
		</uni-nav-bar>

		<scroll-view
			class="body"
			scroll-y
			:show-scrollbar="false"
			:scroll-into-view="scrollToId"
		>
			<!-- Title input -->
			<input
				class="title-inp"
				v-model="form.title"
				placeholder="标题"
				placeholder-class="title-ph"
				maxlength="40"
			/>

			<view class="divider" />

			<!-- Rich text editor -->
			<editor
				id="post-editor"
				class="content-ed"
				placeholder="分享你此刻的想法..."
				show-img-size
				show-img-toolbar
				@ready="onEditorReady"
				@input="onEditorInput"
				@statuschange="onEditorStatusChange"
			/>

				<!-- Media upload grid -->
				<view class="media-grid">
					<view v-for="(src, i) in mediaList" :key="i" class="m-cell">
						<app-image :src="src" mode="aspectFill" class="m-img" />
						<view class="m-del" @tap.stop="removeMedia(i)">
							<text class="m-x">×</text>
						</view>
					</view>
					<view v-if="mediaList.length < 9" class="m-add" @tap="pickMedia">
						<text class="m-plus">+</text>
						<text class="m-lbl">图片/视频</text>
					</view>
				</view>

					<view class="meta-section brief-section">
						<view class="meta-row brief-row">
							<text class="meta-label">简介</text>
							<text class="meta-hint">会展示在列表卡片，建议 30~90 字</text>
						</view>
						<uni-easyinput
							class="brief-input"
							type="textarea"
							v-model="form.brief"
							placeholder="请输入简介，帮助用户快速理解内容价值"
							:maxlength="120"
						/>
					</view>

					<!-- Scene selector -->
					<view class="meta-section">
						<view class="meta-row">
							<text class="meta-label">分类</text>
							<text v-if="!form.scene" class="meta-hint">选一个，让更多人发现</text>
						</view>
					<view class="scene-picker">
						<uni-data-checkbox
							v-model="form.scene"
							mode="tag"
							:localdata="sceneOptions"
							selectedColor="#5B5BD6"
							selectedTextColor="#FFFFFF"
						/>
					</view>
				</view>

				<!-- Usage scenes input -->
					<view id="section-tags" class="meta-section tags-section">
						<view class="meta-row">
							<text class="meta-label">使用场景</text>
							<text class="meta-sub" :class="{ warn: form.tags.length >= TAG_LIMIT }">
								{{ form.tags.length }}/{{ TAG_LIMIT }}
						</text>
					</view>
					<view class="tags-wrap">
						<view v-for="(tag, i) in form.tags" :key="i" class="tag-chip">
							<text class="tag-hash">#</text>
							<text class="tag-t">{{ tag }}</text>
							<view class="tag-rm" @tap.stop="removeTag(i)">
								<text class="tag-rm-t">×</text>
							</view>
						</view>
						<input
							v-if="form.tags.length < TAG_LIMIT"
							class="tag-inp"
							v-model="tagInput"
							:focus="tagInputFocus"
							placeholder="添加使用场景，回车确认"
							placeholder-class="tag-ph"
							maxlength="12"
							@confirm="addTag"
							@blur="tagInputFocus = false"
						/>
					</view>
					<view v-if="tagSuggestions.length" class="tags-suggest">
						<text class="tags-suggest-label">推荐</text>
						<view class="tags-suggest-wrap">
							<view v-for="tag in tagSuggestions" :key="tag" class="tag-sg" @tap="appendTag(tag)">
								<text class="tag-sg-t">+ {{ tag }}</text>
							</view>
							</view>
						</view>
					</view>

				<view class="body-gap" />
			</scroll-view>

		<!-- Formatting bar (above bottom toolbar, fixed) -->
		<view v-if="showFormatBar" class="format-bar">
			<view class="fb-btn" :class="{ on: !!formats.bold }" @tap="applyFormat('bold')">
				<text class="fb-t fb-bold">B</text>
			</view>
			<view class="fb-btn" :class="{ on: !!formats.italic }" @tap="applyFormat('italic')">
				<text class="fb-t fb-italic">I</text>
			</view>
			<view class="fb-btn" :class="{ on: !!formats.underline }" @tap="applyFormat('underline')">
				<text class="fb-t fb-ul">U</text>
			</view>
			<view class="fb-btn" :class="{ on: formats.header === 2 }" @tap="applyFormat('header', 2)">
				<text class="fb-t">H2</text>
			</view>
			<view class="fb-btn" :class="{ on: formats.list === 'bullet' }" @tap="applyFormat('list', 'bullet')">
				<text class="fb-t">• 列</text>
			</view>
			<view class="fb-sep" />
			<view class="fb-btn" @tap="undo">
				<text class="fb-t">↩</text>
			</view>
			<view class="fb-btn" @tap="redo">
				<text class="fb-t">↪</text>
			</view>
			<view class="fb-btn" @tap="removeFormat">
				<text class="fb-t fb-clr">清</text>
			</view>
		</view>

		<!-- Bottom toolbar -->
		<view class="btm-bar">
			<view class="btm-icons">
				<view class="bi" @tap="pickMedia">
					<uni-icons type="image" size="22" color="#3C3C3C" />
				</view>
				<view class="bi" :class="{ 'bi-act': showFormatBar }" @tap="toggleFormatBar">
					<uni-icons type="compose" size="22" :color="showFormatBar ? '#5B5BD6' : '#3C3C3C'" />
				</view>
				<view class="bi" @tap="pickVideo">
					<uni-icons type="videocam" size="22" color="#3C3C3C" />
				</view>
				<view class="bi" @tap="insertDivider">
					<uni-icons type="bars" size="22" color="#3C3C3C" />
				</view>
				<!-- # → 滚动并聚焦到使用场景输入框，统一入口 -->
				<view class="bi" @tap="focusTagInput">
					<text class="bi-hash">#</text>
				</view>
				<view class="bi" @tap="onEmoji">
					<uni-icons type="emojiface" size="22" color="#3C3C3C" />
				</view>
				<view class="bi" @tap="insertEditorImage">
					<uni-icons type="more" size="22" color="#3C3C3C" />
				</view>
			</view>
		</view>
	</view>
</template>

<script setup lang="ts">
import { createSkill, getSkillCategories, getSkillTags, updateSkill } from '@/api/skill'
import { uploadImageFile, type UploadedImageMeta } from '@/api/upload'
import AppImage from '@/components/app-image/index.vue'
import { useUserStore } from '@/stores'
import { requireLogin } from '@/utils/auth-guard'
import { computed, getCurrentInstance, nextTick, reactive, ref, watch } from 'vue'

const SKILL_PREVIEW_KEY = 'latest_published_skill_v1'
const FEED_PUBLISHED_KEY = 'skill_feed_published_v1'
const TAG_LIMIT = 5
const FALLBACK_SCENES = ['写作', '编程', '自媒体', '办公', '运营', '学习', '设计', '电商']

// 分类列表（仅名称，用于 uni-data-checkbox）
const SCENE_OPTIONS = ref<string[]>(FALLBACK_SCENES)
// 名称 → ID 的映射，用于按分类拉取标签建议
const categoryMap = ref<Map<string, number>>(new Map())

type PostForm = {
	title: string
	brief: string
	html: string
	text: string
	scene: string
	tags: string[]
}

const instance = getCurrentInstance()
const userStore = useUserStore()
const editorCtx = ref<any>(null)
const formats = ref<Record<string, any>>({})
const mediaList = ref<string[]>([])
const showFormatBar = ref(false)
const tagInput = ref('')
const tagInputFocus = ref(false)
const scrollToId = ref('')

const form = reactive<PostForm>({
	title: '',
	brief: '',
	html: '',
	text: '',
	scene: '',
	tags: []
})

const sceneOptions = computed(() => {
	const merged = Array.from(new Set(SCENE_OPTIONS.value
		.map((v) => `${v}`.trim())
		.filter(Boolean)))
	return merged.map((v) => ({ text: v, value: v }))
})

// API 返回的原始标签名（按分类）
const _tagSuggestionsRaw = ref<string[]>([])
// 过滤掉已添加的，直接用于展示
const tagSuggestions = computed(() =>
	_tagSuggestionsRaw.value.filter((v) => !form.tags.includes(v)).slice(0, 8)
)

const stripHtml = (html: string) =>
	html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()

/* ── editor ── */
const onEditorReady = () => {
	uni.createSelectorQuery()
		.select('#post-editor')
		.context((res: any) => { editorCtx.value = res?.context ?? null })
		.exec()
}

const onEditorInput = (e: any) => {
	const d = e?.detail ?? {}
	form.html = d.html ?? ''
	form.text = (d.text || stripHtml(form.html)).trim()
}

const onEditorStatusChange = (e: any) => {
	formats.value = e?.detail ?? {}
}

const ensureEditor = () => {
	if (editorCtx.value) return true
	uni.showToast({ title: '编辑器初始化中', icon: 'none' })
	return false
}

/* ── formatting ── */
const toggleFormatBar = () => { showFormatBar.value = !showFormatBar.value }

const applyFormat = (name: string, value?: string | number | boolean) => {
	if (ensureEditor()) editorCtx.value.format(name, value)
}

const undo         = () => { if (ensureEditor()) editorCtx.value.undo() }
const redo         = () => { if (ensureEditor()) editorCtx.value.redo() }
const removeFormat = () => { if (ensureEditor()) editorCtx.value.removeFormat() }
const insertDivider = () => { if (ensureEditor()) editorCtx.value.insertDivider({}) }

const onEmoji = () => uni.showToast({ title: '表情功能开发中', icon: 'none' })

const insertEditorImage = () => {
	pickMedia()
}

/* ── media ── */
const pickMedia = () => {
	const remain = 9 - mediaList.value.length
	if (remain <= 0) return
	uni.chooseImage({
		count: remain,
		sizeType: ['compressed'],
		sourceType: ['album', 'camera'],
		success: (res) => mediaList.value.push(...res.tempFilePaths)
	})
}

const pickVideo = () => {
	uni.showToast({ title: '当前仅支持图片上传', icon: 'none' })
}

const removeMedia = (i: number) => mediaList.value.splice(i, 1)

/* ── usage scenes(tags) ── */
const addTag = () => {
	const v = tagInput.value.trim().replace(/^#/, '')
	if (!v) {
		tagInput.value = ''
		return
	}
	if (form.tags.includes(v)) {
		tagInput.value = ''
		return
	}
	if (form.tags.length >= TAG_LIMIT) {
		uni.showToast({ title: `最多添加${TAG_LIMIT}个标签`, icon: 'none' })
		return
	}
	form.tags.push(v)
	tagInput.value = ''
}

const removeTag = (i: number) => form.tags.splice(i, 1)

const appendTag = (tag: string) => {
	if (!tag || form.tags.includes(tag)) return
	if (form.tags.length >= TAG_LIMIT) {
		uni.showToast({ title: `最多添加${TAG_LIMIT}个标签`, icon: 'none' })
		return
	}
	form.tags.push(tag)
}

// # 按钮：滚动到使用场景区并聚焦输入框，避免和编辑器内插入文本的逻辑重叠
const focusTagInput = () => {
	scrollToId.value = ''
	nextTick(() => {
		scrollToId.value = 'section-tags'
		tagInputFocus.value = true
	})
}

/* ── state ── */
const canPublish = computed(() => !!(form.title.trim() || form.text.trim()))

const hasContent = computed(() =>
	!!(form.title.trim() || form.brief.trim() || form.text.trim() || mediaList.value.length)
)

/* ── helpers ── */
const buildBrief = (text: string) => {
	const pure = text.replace(/\s+/g, ' ').trim()
	if (!pure) return ''
	const lines = pure.split(/[。！？!?；;\n]/).map((s) => s.trim()).filter(Boolean)
	const merged = (lines.slice(0, 2).join('，') || pure).trim()
	return merged.length > 90 ? `${merged.slice(0, 87)}...` : merged
}

const buildPromptPreview = (text: string) => {
	const pure = text.replace(/\s+/g, ' ').trim()
	if (!pure) return ''
	return pure.length > 120 ? `${pure.slice(0, 117)}...` : pure
}

const formatDate = (d: Date) =>
	`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/* ── payload builders ── */
const buildSkillPayload = (id: string, brief: string, scene: string, now: Date, contentImages: string[]) => ({
	id,
	title: form.title.trim() || '无标题',
	scene,
	tags: form.tags.length ? [...form.tags] : [scene],
	author: '我',
	authorColor: '#5B5BD6',
	publishTime: formatDate(now),
	copyCount: '0',
	favoriteCount: '0',
	successRate: '--',
	feedbackCount: '0',
	brief,
	avgInputToken: '--',
	avgOutputToken: '--',
	avgTotalToken: '--',
	estimatedCost: '--',
	recommendedModel: '--',
	commonModel: '--',
	showConsume: false,
	totalUses: '0',
	weekUses: '0',
	fullPrompt: form.text.trim(),
	fullPromptHtml: form.html.trim(),
	images: contentImages.length ? [contentImages[0]] : [],
	contentImages: [...contentImages],
	variableNotes: '',
	variables: [],
	steps: ['复制内容', '粘贴到 AI 工具', '按需调整'],
	feedbacks: [],
	similarSkills: []
})

const toSkillImagePayload = (meta: UploadedImageMeta) => ({
	imageUrl: meta.imageUrl,
	storageProvider: meta.storageProvider,
	bucketName: meta.bucketName,
	objectKey: meta.objectKey,
	mimeType: meta.mimeType,
	fileSize: meta.fileSize
})

const uploadSkillImages = async (skillId: number, localPaths: string[]) => {
	const contentImages = [] as Array<{
		imageUrl: string
		storageProvider: string
		bucketName: string
		objectKey: string
		mimeType: string
		fileSize: number
	}>
	const contentImageUrls: string[] = []

	for (let i = 0; i < localPaths.length; i += 1) {
		const uploaded = await uploadImageFile({
			filePath: localPaths[i],
			usage: 'skill_content',
			skillId,
			index: i + 1
		})
		contentImages.push(toSkillImagePayload(uploaded))
		contentImageUrls.push(uploaded.imageUrl)
	}

	const coverImages: Array<{
		imageUrl: string
		storageProvider: string
		bucketName: string
		objectKey: string
		mimeType: string
		fileSize: number
	}> = []

	if (localPaths.length > 0) {
		const uploadedCover = await uploadImageFile({
			filePath: localPaths[0],
			usage: 'skill_cover',
			skillId,
			index: 1
		})
		coverImages.push(toSkillImagePayload(uploadedCover))
	}

	return {
		coverImages,
		contentImages,
		contentImageUrls
	}
}

const buildFeedItem = (id: string, brief: string, scene: string, promptPreview: string) => ({
	id,
	title: form.title.trim() || '无标题',
	summary: brief,
	promptPreview: promptPreview || brief,
	scene,
	tags: (form.tags.length ? form.tags : [scene]).slice(0, 3),
	avgToken: '--',
	model: '--',
	modelColor: '#5B5BD6',
	successRate: '--',
	copyCount: '0',
	favoriteCount: '0',
	author: '我',
	authorColor: '#5B5BD6',
	featured: false,
	isNew: true,
	lowCost: false,
	highConsume: false,
	stable: false,
	publishedAt: Date.now()
})

/* ── actions ── */
const resetForm = () => {
	form.title = ''
	form.brief = ''
	form.html = ''
	form.text = ''
	form.scene = ''
	form.tags = []
	tagInput.value = ''
	mediaList.value = []
	formats.value = {}
	showFormatBar.value = false
	if (editorCtx.value) editorCtx.value.clear({})
}

const goBack = () => {
	const back = () => {
		const pages = getCurrentPages()
		if (pages.length > 1) {
			uni.navigateBack()
		} else {
			uni.switchTab({ url: '/pages/index/index' })
		}
	}
	if (!hasContent.value) {
		back()
		return
	}
	uni.showModal({
		title: '确认离开？',
		content: '内容未保存，离开后将丢失',
		confirmText: '离开',
		confirmColor: '#E45C1A',
		success: (res) => { if (res.confirm) back() }
	})
}

const doPublish = async () => {
	if (!canPublish.value) {
		uni.showToast({ title: '请输入标题或内容', icon: 'none' })
		return
	}
	if (!requireLogin(userStore.token, '发布内容')) return

	const now = new Date()
	const brief = form.brief.trim() || buildBrief(form.text) || form.title.trim()
	const promptPreview = buildPromptPreview(form.text) || brief
	const scene = form.scene || '其他'
	const sceneTags = form.tags.length ? [...form.tags] : [scene]

	uni.showLoading({ title: '发布中...' })
	try {
		const result = await createSkill({
			title: form.title.trim() || '无标题',
			brief,
			scene,
			status: 1,
			tags: sceneTags,
			fullPrompt: form.text.trim(),
			fullPromptHtml: form.html.trim(),
			steps: ['复制内容', '粘贴到 AI 工具', '按需调整']
		})

		const skillId = Number(result?.id)
		if (!Number.isInteger(skillId) || skillId <= 0) {
			throw new Error('发布结果异常')
		}

		let uploadedContentUrls: string[] = []
		if (mediaList.value.length > 0) {
			const uploaded = await uploadSkillImages(skillId, mediaList.value)
			uploadedContentUrls = uploaded.contentImageUrls

			await updateSkill(skillId, {
				coverImages: uploaded.coverImages,
				contentImages: uploaded.contentImages
			})
		}

			const id = `${skillId}`
			uni.setStorageSync(SKILL_PREVIEW_KEY, buildSkillPayload(id, brief, scene, now, uploadedContentUrls))
			uni.setStorageSync(FEED_PUBLISHED_KEY, buildFeedItem(id, brief, scene, promptPreview))

		uni.hideLoading()
		uni.showToast({ title: '发布成功', icon: 'success' })
		setTimeout(() => {
			resetForm()
			uni.navigateTo({ url: `/pages/detail/skill?id=${id}` })
		}, 600)
	} catch {
		uni.hideLoading()
	}
}

// 分类变化时拉取对应标签建议
watch(() => form.scene, async (scene) => {
	_tagSuggestionsRaw.value = []
	if (!scene) return
	const catId = categoryMap.value.get(scene)
	if (!catId) return
	try {
		const tags = await getSkillTags({ categoryId: catId, pageSize: 12 })
		_tagSuggestionsRaw.value = tags.map((t) => t.name)
	} catch {
		// 静默失败，不阻塞表单
	}
})

onMounted(async () => {
	try {
		const cats = await getSkillCategories()
		if (Array.isArray(cats) && cats.length > 0) {
			SCENE_OPTIONS.value = cats.map((c) => c.name)
			categoryMap.value = new Map(cats.map((c) => [c.name, c.id]))
		}
	} catch {}
})

onShow(() => {
	// #ifdef MP-WEIXIN
	uni.getTabBar(instance?.proxy)?.setData({ selected: 1 })
	// #endif
})
</script>

<style lang="scss" scoped>
.page {
	display: flex;
	flex-direction: column;
	height: 100%;
	background: var(--card-bg);
	font-family: 'PingFang SC', 'Hiragino Sans GB', sans-serif;
}

.top-cancel {
	font-size: 30rpx;
	color: var(--text-gray);
	font-weight: 500;
}

	.btn-pub {
		position: relative;
		z-index: 1;
		height: 60rpx;
		min-width: 120rpx;
		padding: 0 32rpx;
		border-radius: 100rpx;
		background: rgba(91, 91, 214, 0.15);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;

		.btn-pub-t {
			font-size: 26rpx;
			font-weight: 700;
			line-height: 1;
			white-space: nowrap;
			color: rgba(91, 91, 214, 0.45);
		}

	&.on {
		background: var(--primary-color);
		.btn-pub-t { color: var(--card-bg); }
	}
}

/* ── body ── */
.body { flex: 1; min-height: 0; overflow: hidden; }

.title-inp {
	width: 100%;
	height: 88rpx;
	padding: 0 28rpx;
	font-size: 34rpx;
	font-weight: 600;
	color: var(--text-primary);
	box-sizing: border-box;
}

.title-ph { color: #C8CACC; font-weight: 400; }

.divider {
	height: 1rpx;
	background: rgba(0, 0, 0, 0.06);
	margin: 0 28rpx;
}

/* ── editor ── */
.content-ed {
	width: 100%;
	min-height: 280rpx;
	padding: 20rpx 28rpx;
	font-size: 30rpx;
	line-height: 1.75;
	color: var(--text-primary);
	box-sizing: border-box;
}

/* ── media grid ── */
.media-grid {
	display: flex;
	flex-wrap: wrap;
	gap: 14rpx;
	padding: 8rpx 28rpx 20rpx;
}

.m-cell {
	position: relative;
	width: 200rpx;
	height: 200rpx;
	border-radius: 16rpx;
	overflow: hidden;
	flex-shrink: 0;

	.m-img { width: 100%; height: 100%; display: block; }

	.m-del {
		position: absolute;
		top: 8rpx;
		right: 8rpx;
		width: 40rpx;
		height: 40rpx;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;

		.m-x { font-size: 28rpx; color: #FFF; line-height: 1; margin-top: -2rpx; }
	}
}

.m-add {
	width: 200rpx;
	height: 200rpx;
	border-radius: 16rpx;
	background: var(--bg-secondary);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 10rpx;
	flex-shrink: 0;

	.m-plus { font-size: 48rpx; color: #AAACB0; line-height: 1; font-weight: 300; }
	.m-lbl  { font-size: 22rpx; color: #AAACB0; }
}

/* ── meta sections ── */
.meta-section { padding: 16rpx 28rpx 0; }
.tags-section  { padding-bottom: 28rpx; }
.brief-section { padding-top: 12rpx; }

.brief-row {
	align-items: flex-start;
	gap: 20rpx;
}

.brief-row .meta-hint {
	flex: 1;
	text-align: right;
	line-height: 1.5;
}

.brief-input {
	:deep(.uni-easyinput__content-textarea) {
		min-height: 168rpx;
	}
}

.meta-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 12rpx;
}

.meta-label { font-size: 24rpx; font-weight: 700; color: rgba(0, 0, 0, 0.55); }
.meta-hint  { font-size: 22rpx; color: #C8CACC; }
.meta-sub   { font-size: 22rpx; color: var(--text-muted); }
.meta-sub.warn { color: var(--orange-color); font-weight: 600; }

/* ── scene picker ── */
/* 颜色由 selectedColor / selectedTextColor prop 控制，:deep 仅覆盖形状布局 */
.scene-picker {
	margin-top: 2rpx;

	:deep(.uni-data-checklist) { flex: initial; }
	:deep(.checklist-group) { align-items: center; }

	:deep(.uni-data-checklist .checklist-group .checklist-box.is--tag) {
		height: 60rpx;
		margin: 0 12rpx 12rpx 0;
		padding: 0 22rpx;
		border-radius: 999rpx !important;
	}

	:deep(.uni-data-checklist .checklist-group .checklist-box.is--tag .checklist-text) {
		font-size: 25rpx;
		font-weight: 600;
	}

	:deep(.uni-data-checklist .checklist-group .checklist-box.is--tag.is-checked .checklist-text) {
		font-weight: 700;
	}
}

/* ── tags ── */
.tags-wrap {
	display: flex;
	flex-wrap: wrap;
	gap: 10rpx;
	align-items: center;
}

.tag-chip {
	display: inline-flex;
	align-items: center;
	height: 60rpx;
	padding: 0 8rpx 0 16rpx;
	border-radius: 999rpx;
	background: rgba(91, 91, 214, 0.08);
	border: 1.5rpx solid rgba(91, 91, 214, 0.28);
	box-shadow: 0 2rpx 8rpx rgba(91, 91, 214, 0.10);
	gap: 4rpx;

	.tag-hash {
		font-size: 23rpx;
		color: rgba(91, 91, 214, 0.50);
		font-weight: 700;
		line-height: 1;
	}

	.tag-t {
		font-size: 25rpx;
		color: var(--primary-color);
		font-weight: 700;
		letter-spacing: 0.2rpx;
	}

	.tag-rm {
		width: 40rpx;
		height: 40rpx;
		border-radius: 50%;
		background: rgba(91, 91, 214, 0.12);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		margin-left: 4rpx;

		.tag-rm-t {
			font-size: 26rpx;
			color: rgba(91, 91, 214, 0.65);
			font-weight: 700;
			line-height: 1;
			margin-top: -1rpx;
		}
	}
}

.tag-inp {
	height: 56rpx;
	min-width: 160rpx;
	max-width: 280rpx;
	padding: 0 16rpx;
	border-radius: 10rpx;
	border: 1rpx dashed rgba(0, 0, 0, 0.15);
	background: rgba(0, 0, 0, 0.025);
	font-size: 24rpx;
	color: var(--text-primary);
	box-sizing: border-box;
}

.tag-ph { color: var(--text-placeholder); }

.tags-suggest {
	margin-top: 10rpx;
	display: flex;
	align-items: flex-start;
	gap: 10rpx;
}

.tags-suggest-label {
	flex-shrink: 0;
	font-size: 22rpx;
	font-weight: 600;
	color: rgba(0, 0, 0, 0.45);
	line-height: 46rpx;
}

.tags-suggest-wrap {
	display: flex;
	flex-wrap: wrap;
	gap: 10rpx;
}

.tag-sg {
	height: 46rpx;
	padding: 0 14rpx;
	border-radius: 999rpx;
	border: 1rpx dashed rgba(91, 91, 214, 0.30);
	background: rgba(91, 91, 214, 0.05);
	display: inline-flex;
	align-items: center;
}

.tag-sg-t {
	font-size: 22rpx;
	font-weight: 600;
	color: rgba(91, 91, 214, 0.85);
}

.body-gap { height: calc(96rpx + var(--window-bottom) + 40rpx); }

/* ── formatting bar ── */
.format-bar {
	position: fixed;
	left: 0;
	right: 0;
	bottom: calc(96rpx + var(--window-bottom));
	height: 80rpx;
	background: rgba(248, 248, 250, 0.98);
	border-top: 1rpx solid rgba(0, 0, 0, 0.07);
	display: flex;
	align-items: center;
	padding: 0 12rpx;
	gap: 4rpx;
	box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.04);
	z-index: 10;
}

.fb-btn {
	height: 60rpx;
	min-width: 60rpx;
	padding: 0 14rpx;
	border-radius: 10rpx;
	display: flex;
	align-items: center;
	justify-content: center;

	.fb-t     { font-size: 24rpx; font-weight: 700; color: rgba(0, 0, 0, 0.60); }
	.fb-bold  { font-weight: 900; }
	.fb-italic { font-style: italic; }
	.fb-ul    { text-decoration: underline; }
	.fb-clr   { font-size: 20rpx; color: rgba(0, 0, 0, 0.40); }

	&.on {
		background: var(--primary-light-12);
		.fb-t { color: var(--primary-color); }
	}
}

.fb-sep {
	width: 1rpx;
	height: 36rpx;
	background: rgba(0, 0, 0, 0.10);
	margin: 0 6rpx;
	flex-shrink: 0;
}

/* ── bottom toolbar ── */
.btm-bar {
	position: fixed;
	left: 0;
	right: 0;
	bottom: var(--window-bottom);
	height: 96rpx;
	background: rgba(255, 255, 255, 0.97);
	border-top: 1rpx solid rgba(0, 0, 0, 0.07);
	display: flex;
	align-items: center;
}

.btm-icons {
	display: flex;
	align-items: center;
	justify-content: space-around;
	width: 100%;
	padding: 0 8rpx;
}

.bi {
	width: 80rpx;
	height: 80rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 16rpx;

	.bi-hash {
		font-size: 34rpx;
		font-weight: 700;
		color: var(--text-body);
		line-height: 1;
	}

	&.bi-act { background: var(--primary-light-10); }
}
</style>
