/**
 * 登录拦截工具
 *
 * 用法：
 *   if (!requireLogin(userStore.token, '复制 Skill')) return
 *
 * 未登录时弹出 modal 引导登录，已登录时直接返回 true。
 */
export const requireLogin = (
	token: string | null | undefined,
	action = '执行此操作'
): boolean => {
	if (token) return true

	uni.showModal({
		title: '请先登录',
		content: `登录后才能${action}`,
		confirmText: '去登录',
		confirmColor: '#5B5BD6',
		cancelText: '取消',
		success: ({ confirm }) => {
			if (confirm) uni.navigateTo({ url: '/pages/login/index' })
		},
	})
	return false
}
