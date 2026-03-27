export interface UserInfo {
	id: number
	mobile: string | null
	email: string | null
	nickname: string
	avatarUrl: string | null
	bio: string | null
	displayColor: string | null
	status: number
	publishedSkillCount: number
	totalCopyCount: number
	avgSuccessRate: number | null
}
