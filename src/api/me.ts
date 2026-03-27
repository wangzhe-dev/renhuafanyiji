import { http } from '@/utils/request'
import type { UserInfo } from '@/types/api/user'
import type { SkillListResponse } from '@/api/skill'
import type { FeedPagination } from '@/api/feed'

export interface MyFavoriteItem {
	favoriteId: number
	favoredAt: string
	skill: {
		id: number
		title: string
		scene: string | null
		creator: { nickname: string }
		favoriteCount: number
	}
}

export interface MyFavoriteListResponse {
	list: MyFavoriteItem[]
	pagination: FeedPagination
}

export interface MyCopyItem {
	id: number
	sourceChannel: string | null
	createdAt: string
	skill: { id: number; title: string; scene: string | null } | null
}

export interface MyCopyListResponse {
	list: MyCopyItem[]
	pagination: FeedPagination
}

export interface MyLikeItem {
	likeId: number
	likedAt: string
	post: {
		id: number
		text: string
		modelName: string | null
		author: { nickname: string }
		skill: { title: string } | null
		likeCount: number
		commentCount: number
	}
}

export interface MyLikeListResponse {
	list: MyLikeItem[]
	pagination: FeedPagination
}

export interface MySummaryResponse {
	publishedCount: number
	favoriteCount: number
	likeCount: number
	copyCount: number
}

export const getMyProfile = () => {
	return http.get<UserInfo>('/me/profile')
}

export const updateMyAvatar = (avatarUrl: string) => {
	return http.put<{ avatarUrl: string }>('/me/avatar', { avatarUrl })
}

export const getMySkills = (params?: { page?: number; pageSize?: number; status?: number }) => {
	return http.get<SkillListResponse>('/me/skills', params)
}

export const getMyFavorites = (params?: { page?: number; pageSize?: number }) => {
	return http.get<MyFavoriteListResponse>('/me/favorites', params)
}

export const getMyCopies = (params?: { page?: number; pageSize?: number }) => {
	return http.get<MyCopyListResponse>('/me/copies', params)
}

export const getMyLikes = (params?: { page?: number; pageSize?: number }) => {
	return http.get<MyLikeListResponse>('/me/likes', params)
}

export const getMySummary = () => {
	return http.get<MySummaryResponse>('/me/summary')
}
