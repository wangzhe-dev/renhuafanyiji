import { http } from '@/utils/request'

export type FeedbackType = 'suggestion' | 'bug' | 'content' | 'other'

export const submitAppFeedback = (data: {
	type: FeedbackType
	content: string
	contact?: string
}) => {
	return http.post<null>('/app-feedback', data)
}
