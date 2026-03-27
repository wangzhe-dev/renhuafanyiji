import { http } from '@/utils/request'

export interface AiModelItem {
  id: number
  providerCode: string
  modelKey: string
  modelName: string
  isActive: boolean
  isRecommended: boolean
  sortNo: number
}

export interface RecentAiModelItem extends AiModelItem {
  lastUsedAt: string
  useCount: number
}

export const getModelList = (params?: { active?: 0 | 1; keyword?: string; limit?: number }) => {
  return http.get<AiModelItem[]>('/models', params)
}

export const getRecentModelList = (params?: { limit?: number }) => {
  return http.get<RecentAiModelItem[]>('/models/recent', params)
}
