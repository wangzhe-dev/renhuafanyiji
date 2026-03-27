import { http } from '@/utils/request'
import type { UserInfo } from '@/types/api/user'

export interface AuthResponse {
	token: string
	user: UserInfo
}

export const passwordLogin = (data: { identifier: string; password: string }) => {
	return http.post<AuthResponse>('/auth/login/password', data)
}

// H5 微信网页授权登录：前端拿到 code 后传给后端换 token
export const wechatH5Login = (code: string) => {
	return http.post<AuthResponse>('/auth/wxlogin', { code })
}

export const sendEmailCode = (email: string) => {
	return http.post('/auth/send-code', { email })
}

export const emailRegister = (data: { email: string; code: string; password: string; nickname?: string }) => {
	return http.post<AuthResponse>('/auth/register', data)
}

export const sendResetCode = (email: string) => {
	return http.post('/auth/send-reset-code', { email })
}

export const resetPassword = (data: { email: string; code: string; password: string }) => {
	return http.post<Partial<AuthResponse>>('/auth/reset-password', data)
}
