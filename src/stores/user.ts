import { defineStore } from 'pinia'
import { loginPage } from '@/config'
import type { UserInfo } from '@/types/api/user'

export const useUserStore = defineStore('user', () => {
	// 用户信息
	const userInfo = ref<UserInfo | null>()
	const token = ref()

	const setToken = (val : string) => {
		token.value = val
	}

	const setUserInfo = (val : UserInfo | null) => {
		userInfo.value = val
	}

	// 退出登录
	const logout = () => {
		setUserInfo(null)
		setToken('')

		// 当前环境地址
		const requestUrl = uni.getStorageSync('requestUrl') || ''

		uni.clearStorageSync()

		if (requestUrl) uni.setStorageSync('requestUrl', requestUrl)

		uni.reLaunch({ url: loginPage })
	}

	return { userInfo, token, setToken, setUserInfo, logout }
}, {
	// 开启后数据读写都将持久化
	unistorage: true
})