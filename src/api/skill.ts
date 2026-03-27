import { http } from '@/utils/request'

export type SkillImageInput =
	| string
	| {
		imageUrl: string
		storageProvider?: string | null
		bucketName?: string | null
		objectKey?: string | null
		mimeType?: string | null
		fileSize?: number | null
	}

export type SkillListQuery = {
	page?: number
	pageSize?: number
	sort?: 'recommend' | 'newest' | 'mostCopy' | 'lowestToken' | 'bestValue' | 'highRate'
	scene?: string
	categoryId?: number
	creatorId?: number
	keyword?: string
	tag?: string
	minSuccessRate?: number
	maxAvgTotalTokens?: number
}

export type SkillListItem = {
	id: number
	title: string
	summary: string | null
	brief?: string | null
	promptPreview?: string | null
	scene: string | null
	publishAt: string | null
	featured: boolean
	copyCount: number
	favoriteCount: number
	feedbackCount: number
	successRate: number | string | null
	avgTotalTokens: number | null
	modelName: string | null
	coverImage: string | null
	tags: string[]
	category: { id: number; name: string | null } | null
	creator: {
		id: number
		nickname: string
		avatarUrl: string | null
		displayColor: string | null
	}
	isFavorited: boolean
}

export type SkillListResponse = {
	list: SkillListItem[]
	pagination: {
		page: number
		pageSize: number
		total: number
		totalPages: number
	}
}

export type SkillDetailContentVariable =
	| string
	| { name: string; desc?: string | null }

export type SkillDetailResponse = {
	id: number
	title: string
	brief: string | null
	summary?: string | null
	scene: string | null
	status: number
	publishAt: string | null
	coverImage: string | null
	stats: {
		copyCount: number
		favoriteCount: number
		feedbackCount: number
		successRate: number | string | null
		totalUses: number
		weekUses: number
	}
	tokenInfo: {
		avgInputTokens: number | null
		avgOutputTokens: number | null
		avgTotalTokens: number | null
		estimatedCostLow: number | string | null
		estimatedCostHigh: number | string | null
		recommendedModelName: string | null
		commonModelName: string | null
	}
	category: { id: number; name: string | null } | null
	tags: string[]
	useScenes?: string[]
	creator: {
		id: number
		nickname: string
		avatarUrl: string | null
		displayColor: string | null
	}
	isFavorited: boolean
	canEdit: boolean
	content: {
		id: number
		versionNo: number
		prompt: string | null
		systemPrompt: string | null
		userTemplate: string | null
		fullPrompt: string | null
		fullPromptHtml: string | null
		variableNotes: string | null
		variables: SkillDetailContentVariable[]
		steps: string[]
		useScenes: string[]
		createdAt: string
		updatedAt: string
	} | null
	images: {
		cover: string[]
		content: string[]
	}
	feedbacks: Array<{
		id: number
		status: 'success' | 'normal' | 'fail'
		comment: string
		modelName: string | null
		inputTokens: number | null
		outputTokens: number | null
		totalTokens: number | null
		costAmount: number | null
		createdAt: string
		user: {
			id: number
			nickname: string
			avatarUrl: string | null
			displayColor: string | null
		}
	}>
	similarSkills: Array<{
		id: number
		title: string
		scene: string | null
		avgTotalTokens: number | null
		successRate: number | string | null
		copyCount: number
	}>
}

export type CreateSkillPayload = {
	title: string
	brief?: string | null
	categoryId?: number | null
	scene?: string | null
	status?: 0 | 1 | 2
	tags?: string[]

	prompt?: string | null
	systemPrompt?: string | null
	userTemplate?: string | null
	fullPrompt?: string | null
	fullPromptHtml?: string | null
	variableNotes?: string | null
	variables?: Array<{ name: string; desc?: string | null }>
	steps?: string[]
	useScenes?: string[]

	coverImages?: SkillImageInput[]
	contentImages?: SkillImageInput[]

	recommendedModelName?: string | null
	commonModelName?: string | null
}

export const getSkillList = (params: SkillListQuery) => {
	return http.get<SkillListResponse>('/skills', params)
}

export const getSkillDetail = (id: string | number) => {
	return http.get<SkillDetailResponse>(`/skills/${id}`)
}

export const createSkill = (data: CreateSkillPayload) => {
	return http.post<{ id: number }>('/skills', data)
}

export const updateSkill = (id: string | number, data: Partial<CreateSkillPayload>) => {
	return http.put<{ id: number }>(`/skills/${id}`, data)
}

export interface SkillFavoriteActionResponse {
	skillId: number
	isFavorited: boolean
	favoriteCount: number
}

export interface SkillCopyResponse {
	id: number
}

export interface SkillFeedbackItem {
	id: number
	status: 'success' | 'normal' | 'fail'
	comment: string
	modelName: string | null
	inputTokens: number | null
	outputTokens: number | null
	totalTokens: number | null
	costAmount: number | null
	createdAt: string
	user: {
		id: number
		nickname: string
		avatarUrl: string | null
		displayColor: string | null
	}
}

export interface SkillFeedbackListResponse {
	list: SkillFeedbackItem[]
	pagination: {
		page: number
		pageSize: number
		total: number
		totalPages: number
	}
}

export const favoriteSkill = (id: string | number) => {
	return http.post<SkillFavoriteActionResponse>(`/skills/${id}/favorite`)
}

export const unfavoriteSkill = (id: string | number) => {
	return http.delete<SkillFavoriteActionResponse>(`/skills/${id}/favorite`)
}

export const copySkill = (
	id: string | number,
	data?: {
		sourceChannel?: string
		copiedTextHash?: string
		usage?: {
			modelId?: number | null
			modelName?: string | null
			inputTokens?: number | null
			outputTokens?: number | null
			totalTokens?: number | null
			costAmount?: number | null
			currency?: string
			reaction?: 'worth' | 'ok' | 'regret' | 'addicted' | null
			noteText?: string | null
			images?: string[]
		}
	}
) => {
	return http.post<SkillCopyResponse>(`/skills/${id}/copies`, data || {})
}

export const createSkillFeedback = (
	id: string | number,
	data: {
		status: 'success' | 'normal' | 'fail'
		comment: string
		usageRecordId?: number | null
		modelName?: string | null
		inputTokens?: number | null
		outputTokens?: number | null
		totalTokens?: number | null
		costAmount?: number | null
		isPublic?: boolean
	}
) => {
	return http.post<SkillFeedbackItem>(`/skills/${id}/feedbacks`, data)
}

export const getSkillFeedbacks = (id: string | number, params?: { page?: number; pageSize?: number }) => {
	return http.get<SkillFeedbackListResponse>(`/skills/${id}/feedbacks`, params)
}

export const getSkillCategories = () => {
	return http.get<Array<{ id: number; name: string; sortNo: number }>>('/skills/meta/categories')
}

export const getCreatorProfile = (id: string | number) => {
	return http.get<{
		id: number
		nickname: string
		bio: string | null
		displayColor: string | null
		avatarUrl: string | null
		publishedSkillCount: number
		totalCopyCount: number
		avgSuccessRate: number | null
		followerCount: number
		followingCount: number
		isFollowing: boolean
	}>(`/skills/creator/${id}`)
}

export const followCreator = (id: string | number) => {
	return http.post<{ targetId: number; isFollowing: boolean; changed: boolean }>(`/skills/creator/${id}/follow`)
}

export const unfollowCreator = (id: string | number) => {
	return http.delete<{ targetId: number; isFollowing: boolean; changed: boolean }>(`/skills/creator/${id}/follow`)
}

export const getSkillTags = (params?: { keyword?: string; pageSize?: number; categoryId?: number }) => {
	return http.get<Array<{ id: number; name: string; useCount: number }>>('/skills/meta/tags', params)
}

export interface TrendsResponse {
	dates: string[]
	totalTokens: number[]
	totalCost: number[]
	postCount: number[]
}

export const getTrends = (params?: { days?: number }) => {
	return http.get<TrendsResponse>('/stats/trends', params)
}
