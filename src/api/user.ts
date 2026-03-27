import { http } from '@/utils/request'
import type { UserInfo } from '@/types/api/user'

// 获取当前登录用户信息
export const getInfo = () => {
	return http.get<UserInfo>('/me/profile')
}
