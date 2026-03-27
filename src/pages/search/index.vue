<template>
	<view class="page">

		<!-- 搜索输入行 -->
		<view class="search-bar">
			<view class="search-input-wrap">
				<uni-icons class="search-icon" type="search" size="16" color="rgba(0,0,0,0.45)" />
					<input
						v-model="keyword"
						class="search-input"
						placeholder="搜索 Skill 标题、简介，或输入 #标签"
						placeholder-class="search-ph"
						confirm-type="search"
						:focus="true"
					@confirm="doSearch"
					@input="onInput"
				/>
				<view v-if="keyword" class="clear-btn" @tap="clearSearch">
					<uni-icons class="clear-icon" type="clear" size="14" color="rgba(0,0,0,0.40)" />
				</view>
			</view>
			<text class="cancel-btn" @tap="goBack">取消</text>
		</view>

		<!-- 未搜索状态 -->
		<view v-if="!hasSearched" class="pre-search">

				<!-- 热门搜索 -->
				<view class="section">
					<view class="section-header">
						<text class="section-title">热门搜索</text>
						<uni-icons class="section-icon" type="fire-filled" size="16" color="#C84634" />
					</view>
					<view v-if="hotSearches.length" class="hot-tags">
						<view
							v-for="(term, i) in hotSearches"
							:key="term"
							class="hot-tag"
							:class="{ 'hot-top': i < 3 }"
							@tap="searchTerm(term)"
						>
						<text class="hot-rank" v-if="i < 3">{{ i + 1 }}</text>
							<text class="hot-text">{{ term }}</text>
						</view>
					</view>
					<view v-else class="result-empty">
						<text class="result-empty-text">暂无热门搜索</text>
					</view>
				</view>

			<!-- 最近搜索 -->
			<view v-if="recentSearches.length" class="section">
				<view class="section-header">
					<text class="section-title">最近搜索</text>
					<view class="clear-history-btn" @tap="clearHistory">
						<text class="clear-history-text">清空</text>
					</view>
				</view>
				<view class="recent-tags">
					<view
						v-for="term in recentSearches"
						:key="term"
						class="recent-tag"
						@tap="searchTerm(term)"
					>
						<uni-icons class="recent-icon" type="reload" size="12" color="rgba(0,0,0,0.35)" />
						<text class="recent-text">{{ term }}</text>
					</view>
				</view>
			</view>

			<!-- 热门标签 -->
			<view class="section">
				<view class="section-header">
					<text class="section-title">热门标签</text>
				</view>
				<view class="label-tags">
						<view
							v-for="tag in hotTags"
							:key="tag"
							class="label-tag"
							@tap="searchTerm(tag, true)"
						>
							<text class="label-tag-text"># {{ tag }}</text>
						</view>
				</view>
			</view>

		</view>

			<!-- 搜索结果 -->
			<view v-else class="search-results">

				<!-- 排序 Tab -->
				<scroll-view class="result-tabs" scroll-x :show-scrollbar="false">
					<view class="rtab-row">
					<view
						v-for="tab in SORT_TABS"
						:key="tab.key"
						class="rtab"
						:class="{ active: activeSort === tab.key }"
						@tap="changeSort(tab.key)"
					>
						<text class="rtab-text">{{ tab.label }}</text>
						<view v-if="activeSort === tab.key" class="rtab-bar" />
					</view>
					</view>
				</scroll-view>

				<!-- 结果列表 -->
				<scroll-view
					class="results-scroll"
					scroll-y
					:show-scrollbar="false"
					lower-threshold="120"
					@scrolltolower="onLoadMore"
				>
					<view class="results-inner">
						<view class="result-hint-row">
							<text class="result-hint">共 {{ totalSkills }} 条与“{{ searchedKeyword }}”相关的 Skill</text>
						</view>

						<view v-if="loadingSkills && !searchSkillResults.length" class="result-empty">
							<text class="result-empty-text">搜索中...</text>
						</view>

						<view v-else-if="searchSkillResults.length === 0" class="result-empty">
							<text class="result-empty-text">没有找到相关 Skill，换个关键词试试</text>
						</view>

						<template v-else>
								<view v-for="skill in searchSkillResults" :key="skill.id" class="result-skill-card" @tap="toSkill(skill.id)">
									<view class="rsk-icon">
										<image
											v-if="skill.coverImage"
											:src="skill.coverImage"
											class="rsk-cover"
											mode="aspectFill"
											lazy-load
										/>
										<uni-icons v-else class="rsk-emoji" :type="skill.icon" :color="skill.color" size="24" />
									</view>
								<view class="rsk-info">
									<text class="rsk-title">{{ skill.title }}</text>
									<text class="rsk-desc line-2">{{ skill.desc }}</text>
									<view class="rsk-meta">
										<text class="rsk-meta-t">{{ skill.scene }}</text>
										<text class="rsk-meta-dot">·</text>
										<text class="rsk-meta-t">{{ skill.copyCount }} 复制</text>
										<text class="rsk-meta-dot">·</text>
										<text class="rsk-meta-t">{{ skill.author }}</text>
									</view>
									<view class="rsk-tags">
										<text v-for="tag in skill.tags" :key="tag" class="rsk-tag">#{{ tag }}</text>
									</view>
								</view>
								<view class="rsk-use-btn" @tap.stop="useSkill(skill)">
									<text class="rsk-use-text">使用</text>
								</view>
							</view>
						</template>

						<view v-if="searchSkillResults.length" class="result-load-footer">
							<text class="result-load-text">
								{{ loadingMoreSkills ? '加载更多中...' : (noMore ? '没有更多了' : '上滑加载更多') }}
							</text>
						</view>

						<view class="results-bottom" />
				</view>
			</scroll-view>
		</view>

	</view>
</template>

<script setup lang="ts">
import { copySkill, getSkillCategories, getSkillList, getSkillTags, type SkillListItem, type SkillListQuery } from '@/api/skill'
import { useGuideStore, useUserStore } from '@/stores'
import { normalizeImageUrl } from '@/utils/image-url'

const DEFAULT_HOT_TAGS = ['AI写作', '效率提升', '副业', '设计', '职场', '编程', '学习方法', '创作']
const DEFAULT_HOT_SEARCHES = ['#效率提升', '#学习', '周报', '翻译', '写作', '运营']
const SORT_TABS: Array<{ key: NonNullable<SkillListQuery['sort']>; label: string }> = [
	{ key: 'recommend', label: '推荐' },
	{ key: 'newest', label: '最新' },
	{ key: 'mostCopy', label: '最多复制' },
	{ key: 'highRate', label: '高成功率' }
]

const PAGE_SIZE = 20
const INPUT_SEARCH_DEBOUNCE_MS = 320
const SEARCH_HISTORY_KEY = 'skill_search_recent_v1'
const userStore = useUserStore()
const guideStore = useGuideStore()

type SearchSkillCard = {
	id: string
	icon: string
	color: string
	coverImage: string
	title: string
	desc: string
	scene: string
	copyCount: string
	author: string
	tags: string[]
	modelName: string
}

type ParsedSearch = {
	keyword?: string
	tag?: string
	display: string
	input: string
}

const keyword = ref('')
const hasSearched = ref(false)
const activeSort = ref<NonNullable<SkillListQuery['sort']>>('recommend')
const recentSearches = ref<string[]>([])
const hotTags = ref([...DEFAULT_HOT_TAGS])
const hotSearches = ref([...DEFAULT_HOT_SEARCHES])
const loadingSkills = ref(false)
const loadingMoreSkills = ref(false)
const noMore = ref(false)
const page = ref(1)
const totalSkills = ref(0)
const searchedKeyword = ref('')
const searchSkillResults = ref<SearchSkillCard[]>([])
const currentSearch = ref<ParsedSearch | null>(null)

let inputSearchTimer: ReturnType<typeof setTimeout> | null = null
let requestSeq = 0

const modelColor = (name: string) => {
	const val = name.toLowerCase()
	if (val.includes('claude')) return '#C7A06A'
	if (val.includes('gpt')) return '#2F8A57'
	if (val.includes('deepseek')) return '#5E738A'
	if (val.includes('gemini')) return '#D6943A'
	return '#5B5BD6'
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

const formatCount = (value: number | null | undefined) => {
	const n = Number(value ?? 0)
	if (!Number.isFinite(n) || n <= 0) return '0'
	if (n >= 10000) return `${(n / 10000).toFixed(1)}w`
	return `${Math.round(n)}`
}

const mapApiSkill = (skill: SkillListItem): SearchSkillCard => {
	const summary = normalizePlainText(skill.summary ?? skill.brief ?? '')
	const promptPreview = normalizePlainText(skill.promptPreview ?? '')
	return {
		id: `${skill?.id || ''}`,
		icon: 'compose',
		color: modelColor(`${skill?.modelName || ''}`),
		coverImage: skill?.coverImage ? normalizeImageUrl(`${skill.coverImage}`) : '',
		title: `${skill?.title || '未命名 Skill'}`,
		desc: summary || promptPreview || `${skill?.scene || '暂无简介'}`,
		scene: `${skill?.scene || skill?.category?.name || '其他'}`,
		copyCount: formatCount(skill?.copyCount),
		author: `${skill?.creator?.nickname || '匿名用户'}`,
		tags: Array.isArray(skill?.tags) ? skill.tags.filter(Boolean).slice(0, 3) : [],
		modelName: normalizeUsageModelName(skill?.modelName)
	}
}

const clearInputSearchTimer = () => {
	if (!inputSearchTimer) return
	clearTimeout(inputSearchTimer)
	inputSearchTimer = null
}

const parseSearchValue = (value: string, forceTag = false): ParsedSearch | null => {
	const raw = value.trim()
	if (!raw) return null

	if (forceTag || raw.startsWith('#')) {
		const tag = raw.replace(/^#+/, '').trim()
		if (!tag) return null
		return {
			tag,
			display: `#${tag}`,
			input: `#${tag}`
		}
	}

	return {
		keyword: raw,
		display: raw,
		input: raw
	}
}

const buildQueryParams = (targetPage: number): SkillListQuery => {
	const query = currentSearch.value
	const params: SkillListQuery = {
		page: targetPage,
		pageSize: PAGE_SIZE,
		sort: activeSort.value
	}

	if (query?.tag) params.tag = query.tag
	else if (query?.keyword) params.keyword = query.keyword

	return params
}

const resetSearchState = () => {
	requestSeq += 1
	clearInputSearchTimer()
	hasSearched.value = false
	searchedKeyword.value = ''
	currentSearch.value = null
	searchSkillResults.value = []
	page.value = 1
	totalSkills.value = 0
	noMore.value = false
	loadingSkills.value = false
	loadingMoreSkills.value = false
}

const loadRecentSearches = () => {
	try {
		const data = uni.getStorageSync(SEARCH_HISTORY_KEY)
		if (Array.isArray(data)) recentSearches.value = data.slice(0, 8)
	} catch {
		recentSearches.value = []
	}
}

const saveRecentSearches = () => {
	try {
		uni.setStorageSync(SEARCH_HISTORY_KEY, recentSearches.value)
	} catch {}
}

const updateRecentSearches = (value: string) => {
	const term = value.trim()
	if (!term) return
	recentSearches.value = [term, ...recentSearches.value.filter((item) => item !== term)].slice(0, 8)
	saveRecentSearches()
}

const loadSearchSuggestions = async () => {
	const [tagRes, categoryRes] = await Promise.allSettled([
		getSkillTags({ pageSize: 12 }),
		getSkillCategories()
	])

	const tags = tagRes.status === 'fulfilled' && Array.isArray(tagRes.value)
		? tagRes.value.map((item) => `${item?.name || ''}`.trim()).filter(Boolean).slice(0, 12)
		: []

	hotTags.value = tags.length ? tags : [...DEFAULT_HOT_TAGS]

	const categories = categoryRes.status === 'fulfilled' && Array.isArray(categoryRes.value)
		? categoryRes.value.map((item) => `${item?.name || ''}`.trim()).filter(Boolean).slice(0, 8)
		: []

	const merged = Array.from(new Set([
		...tags.slice(0, 6).map((name) => `#${name}`),
		...categories,
		...DEFAULT_HOT_SEARCHES
	])).slice(0, 10)
	hotSearches.value = merged.length ? merged : [...DEFAULT_HOT_SEARCHES]
}

const fetchSkillResults = async (reset: boolean) => {
	if (!currentSearch.value) return
	const currentRequest = ++requestSeq
	const targetPage = reset ? 1 : page.value

	if (reset) {
		loadingSkills.value = true
		loadingMoreSkills.value = false
		page.value = 1
		noMore.value = false
		searchSkillResults.value = []
		totalSkills.value = 0
	} else {
		loadingMoreSkills.value = true
	}

	try {
		const data = await getSkillList(buildQueryParams(targetPage))
		if (currentRequest !== requestSeq) return

		const list = Array.isArray(data?.list) ? data.list.map(mapApiSkill) : []
		if (reset) searchSkillResults.value = list
		else searchSkillResults.value.push(...list)

		const currentPage = Number(data?.pagination?.page ?? targetPage)
		const totalPages = Number(data?.pagination?.totalPages ?? 0)
		const total = Number(data?.pagination?.total ?? searchSkillResults.value.length)
		totalSkills.value = Number.isFinite(total) ? total : searchSkillResults.value.length
		noMore.value = totalPages > 0 ? currentPage >= totalPages : list.length < PAGE_SIZE
		page.value = noMore.value ? currentPage : currentPage + 1
	} catch {
		if (currentRequest !== requestSeq) return
		if (reset) {
			searchSkillResults.value = []
			totalSkills.value = 0
		}
		noMore.value = true
		uni.showToast({ title: reset ? '搜索失败，请稍后重试' : '加载更多失败', icon: 'none' })
	} finally {
		if (currentRequest !== requestSeq) return
		loadingSkills.value = false
		loadingMoreSkills.value = false
	}
}

const onInput = () => {
	if (!keyword.value.trim()) {
		resetSearchState()
		return
	}
	if (!hasSearched.value) return

	const parsed = parseSearchValue(keyword.value)
	if (!parsed) return

	clearInputSearchTimer()
	inputSearchTimer = setTimeout(() => {
		currentSearch.value = parsed
		searchedKeyword.value = parsed.display
		void fetchSkillResults(true)
	}, INPUT_SEARCH_DEBOUNCE_MS)
}

const doSearch = async (options?: { asTag?: boolean; addHistory?: boolean }) => {
	const parsed = parseSearchValue(keyword.value, options?.asTag)
	if (!parsed) return

	clearInputSearchTimer()
	keyword.value = parsed.input
	hasSearched.value = true
	currentSearch.value = parsed
	searchedKeyword.value = parsed.display
	if (options?.addHistory !== false) updateRecentSearches(parsed.display)
	await fetchSkillResults(true)
}

const searchTerm = (term: string, asTag = false) => {
	const parsed = parseSearchValue(term, asTag)
	if (!parsed) return
	keyword.value = parsed.input
	void doSearch({ asTag, addHistory: true })
}

const changeSort = (sort: NonNullable<SkillListQuery['sort']>) => {
	if (activeSort.value === sort) return
	activeSort.value = sort
	if (!hasSearched.value || !currentSearch.value) return
	void fetchSkillResults(true)
}

const onLoadMore = async () => {
	if (!hasSearched.value || !currentSearch.value) return
	if (loadingSkills.value || loadingMoreSkills.value || noMore.value) return
	await fetchSkillResults(false)
}

const clearSearch = () => {
	keyword.value = ''
	resetSearchState()
}

const clearHistory = () => {
	recentSearches.value = []
	saveRecentSearches()
}

const useSkill = async (skill: any) => {
	if (userStore.token && skill?.id) {
		try {
			const modelName = normalizeUsageModelName(skill?.modelName)
			await copySkill(
				skill.id,
				modelName
					? { sourceChannel: 'search', usage: { modelName } }
					: { sourceChannel: 'search' }
			)
			guideStore.markFirstSkillCopy()
		} catch {}
	}
	toSkill(skill.id)
}

const toSkill = (id: string) => {
	uni.navigateTo({ url: `/pages/detail/skill?id=${id}` })
}

const goBack = () => {
	uni.navigateBack()
}

onMounted(() => {
	loadRecentSearches()
	void loadSearchSuggestions()
})

onBeforeUnmount(() => {
	requestSeq += 1
	clearInputSearchTimer()
})
</script>

<style lang="scss" scoped>
	.page {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--card-bg);
	}

	/* 搜索栏 */
	.search-bar {
		display: flex;
		align-items: center;
		gap: 16rpx;
		padding: 16rpx 24rpx;
		background: var(--card-bg);
		border-bottom: 1rpx solid rgba(0,0,0,0.05);
		flex-shrink: 0;

		.search-input-wrap {
			flex: 1;
			display: flex;
			align-items: center;
			background: rgba(0,0,0,0.06);
			border-radius: 20rpx;
			border: 1rpx solid rgba(0,0,0,0.08);
			padding: 16rpx 20rpx;
			gap: 12rpx;

			.search-icon {
				width: 28rpx;
				height: 28rpx;
				display: flex;
				align-items: center;
				justify-content: center;
				flex-shrink: 0;
			}

			.search-input {
				flex: 1;
				font-size: 28rpx;
				color: var(--text-color);
				height: 40rpx;
				line-height: 40rpx;
			}

			.clear-btn {
				display: flex;
				align-items: center;
				justify-content: center;

				.clear-icon {
					width: 24rpx;
					height: 24rpx;
					display: flex;
					align-items: center;
					justify-content: center;
				}
			}
		}

		.cancel-btn {
			font-size: 28rpx;
			color: var(--orange-color);
			flex-shrink: 0;
		}
	}

	/* 未搜索状态 */
	.pre-search {
		padding: 24rpx;

		.section {
			margin-bottom: 32rpx;

			.section-header {
				display: flex;
				align-items: center;
				gap: 8rpx;
				margin-bottom: 16rpx;

				.section-title {
					font-size: 28rpx;
					font-weight: 700;
					color: var(--text-color);
				}

				.section-icon {
					width: 26rpx;
					height: 26rpx;
					display: flex;
					align-items: center;
					justify-content: center;
				}

				.clear-history-btn {
					margin-left: auto;

					.clear-history-text {
						font-size: 24rpx;
						color: rgba(0,0,0,0.40);
					}
				}
			}
		}

		.hot-tags {
			display: flex;
			flex-direction: column;
			gap: 0;

			.hot-tag {
				display: flex;
				align-items: center;
				gap: 16rpx;
				padding: 18rpx 0;
				border-bottom: 1rpx solid rgba(0,0,0,0.05);

				.hot-rank {
					width: 40rpx;
					font-size: 28rpx;
					font-weight: 700;
					color: var(--red-color);
					text-align: center;
				}

				.hot-text {
					font-size: 28rpx;
					color: var(--text-color);
				}

				&:not(.hot-top) .hot-rank {
					display: none;
				}

				&:not(.hot-top) {
					padding-left: 56rpx;
				}
			}
		}

		.recent-tags {
			display: flex;
			flex-wrap: wrap;
			gap: 12rpx;

			.recent-tag {
				display: flex;
				align-items: center;
				gap: 8rpx;
				background: var(--card-bg);
				border-radius: 40rpx;
				padding: 12rpx 20rpx;
				border: 1rpx solid rgba(0,0,0,0.07);

				.recent-icon {
					width: 22rpx;
					height: 22rpx;
					display: flex;
					align-items: center;
					justify-content: center;
				}

				.recent-text {
					font-size: 24rpx;
					color: rgba(0,0,0,0.50);
				}
			}
		}

		.label-tags {
			display: flex;
			flex-wrap: wrap;
			gap: 12rpx;

			.label-tag {
				background: var(--accent-light);
				border-radius: 40rpx;
				padding: 12rpx 24rpx;

				.label-tag-text {
					font-size: 24rpx;
					color: var(--orange-color);
					font-weight: 500;
				}
			}
		}
	}

	/* 搜索结果 */
	.search-results {
		display: flex;
		flex-direction: column;
		flex: 1;
		overflow: hidden;

		.result-tabs {
			display: flex;
			background: var(--card-bg);
			padding: 0 20rpx;
			border-bottom: 1rpx solid rgba(0,0,0,0.05);
			flex-shrink: 0;

			.rtab-row {
				display: flex;
				align-items: center;
				min-width: 100%;
			}

			.rtab {
				position: relative;
				padding: 20rpx 20rpx 18rpx;

				.rtab-text {
					font-size: 28rpx;
					color: rgba(0,0,0,0.40);
				}

				&.active .rtab-text {
					color: var(--text-color);
					font-weight: 700;
				}

				.rtab-bar {
					position: absolute;
					bottom: 0;
					left: 50%;
					transform: translateX(-50%);
					width: 32rpx;
					height: 4rpx;
					border-radius: 2rpx;
					background: var(--orange-color);
				}
			}
		}

		.results-scroll {
			flex: 1;
			overflow: hidden;

			.results-inner {
				padding: 16rpx 20rpx;
			}

			.result-hint-row {
				padding: 4rpx 2rpx 14rpx;
			}

			.result-hint {
				font-size: 24rpx;
				color: rgba(0,0,0,0.45);
			}

			.results-bottom {
				height: 40rpx;
			}
		}
	}

	.result-empty {
		display: flex;
		justify-content: center;
		padding: 44rpx 0 22rpx;

		.result-empty-text {
			font-size: 24rpx;
			color: var(--text-muted);
		}
	}

	.result-load-footer {
		display: flex;
		justify-content: center;
		padding: 18rpx 0 8rpx;
	}

	.result-load-text {
		font-size: 22rpx;
		color: rgba(0,0,0,0.36);
	}

	/* Skill 结果卡片 */
	.result-skill-card {
		background: var(--card-bg);
		border-radius: 16rpx;
		padding: 20rpx;
		margin-bottom: 12rpx;
		display: flex;
		align-items: center;
		gap: 16rpx;
		box-shadow: 0 1rpx 8rpx rgba(0, 0, 0, 0.04);

		.rsk-icon {
			width: 80rpx;
			height: 80rpx;
			background: var(--accent-light);
			border-radius: 18rpx;
			overflow: hidden;
			display: flex;
			align-items: center;
			justify-content: center;
			flex-shrink: 0;

			.rsk-cover {
				width: 100%;
				height: 100%;
			}

			.rsk-emoji {
				width: 42rpx;
				height: 42rpx;
				display: flex;
				align-items: center;
				justify-content: center;
			}
		}

		.rsk-info {
			flex: 1;
			display: flex;
			flex-direction: column;
			gap: 6rpx;

			.rsk-title {
				font-size: 28rpx;
				font-weight: 700;
				color: var(--text-color);
			}

			.rsk-desc {
				font-size: 22rpx;
				color: rgba(0,0,0,0.40);
				line-height: 1.55;
			}

			.rsk-meta {
				display: flex;
				align-items: center;
				gap: 8rpx;
				flex-wrap: wrap;
			}

			.rsk-meta-t {
				font-size: 20rpx;
				color: rgba(0,0,0,0.40);
				line-height: 1.4;
			}

			.rsk-meta-dot {
				font-size: 20rpx;
				color: rgba(0,0,0,0.2);
			}

			.rsk-tags {
				display: flex;
				flex-wrap: wrap;
				gap: 8rpx;

				.rsk-tag {
					font-size: 20rpx;
					color: var(--orange-color);
					background: var(--accent-light);
					padding: 4rpx 12rpx;
					border-radius: 10rpx;
				}
			}
		}

		.rsk-use-btn {
			background: var(--orange-color);
			padding: 12rpx 24rpx;
			border-radius: 30rpx;
			flex-shrink: 0;

			.rsk-use-text {
				font-size: 22rpx;
				color: #fff;
				font-weight: 500;
			}
		}
	}

	.line-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
