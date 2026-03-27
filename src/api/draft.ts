import { http } from '@/utils/request'
import type { FeedPagination } from '@/api/feed'
import type { SkillImageInput } from '@/api/skill'

export interface DraftItem {
	id: number
	title: string | null
	draftType: 'skill' | 'post'
	status: number
	updatedAt: string
	createdAt: string
}

export interface DraftListResponse {
	list: DraftItem[]
	pagination: FeedPagination
}

export interface DraftDetail extends DraftItem {
	brief: string | null
	categoryId: number | null
	scene: string | null
	tags: string[]
	prompt: string | null
	systemPrompt: string | null
	userTemplate: string | null
	fullPrompt: string | null
	fullPromptHtml: string | null
	variableNotes: string | null
	variables: Array<{ name: string; desc?: string | null }>
	steps: string[]
	useScenes: string[]
	coverImages: SkillImageInput[]
	contentImages: SkillImageInput[]
	recommendedModelName: string | null
	commonModelName: string | null
}

export type SaveDraftPayload = Partial<Omit<DraftDetail, 'id' | 'status' | 'updatedAt' | 'createdAt'>>

export const getDraftList = (params?: { page?: number; pageSize?: number; status?: number }) => {
	return http.get<DraftListResponse>('/drafts', params)
}

export const getDraftDetail = (id: string | number) => {
	return http.get<DraftDetail>(`/drafts/${id}`)
}

export const saveDraft = (data: SaveDraftPayload) => {
	return http.post<{ id: number }>('/drafts/save', data)
}

export const deleteDraft = (id: string | number) => {
	return http.delete<null>(`/drafts/${id}`)
}
