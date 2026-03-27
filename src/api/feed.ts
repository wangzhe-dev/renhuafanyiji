import { http } from '@/utils/request'

export type FeedReaction = 'worth' | 'ok' | 'regret' | 'addicted'

export interface FeedItem {
  id: number
  modelId?: number | null
  modelName: string
  totalTokens: number | null
  costAmount: string | null
  currency: string
  reaction: FeedReaction | null
  noteText: string
  images: string[]
  createdAt: string
  likes: number
  comments: number
  meoo: number
  liked: boolean
  myMeoo: boolean
  user: {
    id: number
    nickname: string
    displayColor: string | null
  }
  skill: {
    id: number
    title: string | null
    scene: string | null
  } | null
}

export interface FeedComment {
  id: number
  postId: number
  userId: number
  parentId: number | null
  content: string
  createdAt: string
  updatedAt: string
  likes: number
  liked: boolean
  user: {
    id: number
    nickname: string
    displayColor: string | null
  }
}

export interface FeedPagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface FeedListResponse {
  list: FeedItem[]
  pagination: FeedPagination
}

export interface FeedCommentListResponse {
  list: FeedComment[]
  pagination: FeedPagination
}

export interface CreateFeedPostPayload {
  skillId?: number | null
  modelId?: number | null
  modelName?: string | null
  inputTokens?: number | null
  outputTokens?: number | null
  totalTokens?: number | null
  costAmount?: number | null
  currency?: string
  reaction?: FeedReaction | null
  noteText: string
  images?: string[]
}

export interface CreateFeedCommentPayload {
  content: string
  parentId?: number | null
}

export interface UpdateFeedPostImagesPayload {
  images: string[]
}

export interface PostLikeActionResponse {
  postId: number
  liked: boolean
  likes: number
}

export interface PostMeooActionResponse {
  postId: number
  myMeoo: boolean
  meoo: number
}

export interface CommentLikeActionResponse {
  commentId: number
  liked: boolean
  likes: number
}

export interface CreateFeedCommentResponse {
  comment: FeedComment
  comments: number
}

export const getFeed = (params?: { page?: number; pageSize?: number }) => {
  return http.get<FeedListResponse>('/feed', params)
}

export const getFeedPost = (id: number | string) => {
  return http.get<FeedItem>(`/feed/${id}`)
}

export const createFeedPost = (data: CreateFeedPostPayload) => {
  return http.post<FeedItem>(`/feed`, data)
}

export const updateFeedPostImages = (id: number | string, data: UpdateFeedPostImagesPayload) => {
  return http.put<FeedItem>(`/feed/${id}/images`, data)
}

export const likeFeedPost = (id: number | string) => {
  return http.post<PostLikeActionResponse>(`/feed/${id}/like`)
}

export const unlikeFeedPost = (id: number | string) => {
  return http.delete<PostLikeActionResponse>(`/feed/${id}/like`)
}

export const meooFeedPost = (id: number | string) => {
  return http.post<PostMeooActionResponse>(`/feed/${id}/meoo`)
}

export const unmeooFeedPost = (id: number | string) => {
  return http.delete<PostMeooActionResponse>(`/feed/${id}/meoo`)
}

export const updateFeedReaction = (id: number | string, reaction: FeedReaction | null) => {
  return http.put<{ postId: number; reaction: FeedReaction | null }>(`/feed/${id}/reaction`, { reaction })
}

export const getFeedComments = (id: number | string, params?: { page?: number; pageSize?: number }) => {
  return http.get<FeedCommentListResponse>(`/feed/${id}/comments`, params)
}

export const createFeedComment = (id: number | string, data: CreateFeedCommentPayload) => {
  return http.post<CreateFeedCommentResponse>(`/feed/${id}/comments`, data)
}

export const likeFeedComment = (id: number | string) => {
  return http.post<CommentLikeActionResponse>(`/feed/comments/${id}/like`)
}

export const unlikeFeedComment = (id: number | string) => {
  return http.delete<CommentLikeActionResponse>(`/feed/comments/${id}/like`)
}
