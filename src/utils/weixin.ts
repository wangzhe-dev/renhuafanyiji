// #ifdef MP-WEIXIN
// 微信小程序更新检测
export const checkUpdate = () => {
	// 获取更新管理器对象
	const updateManager = uni.getUpdateManager()
	updateManager.onCheckForUpdate((res) => {
		if (res.hasUpdate) {
			updateManager.onUpdateReady(() => {
				uni.showModal({
					title: '更新提示',
					content: '新版本已经准备好，点击确定重新启动',
					showCancel: false,
					success: (res) => {
						if (res.confirm) {
							updateManager.applyUpdate()
						}
					}
				})
			})

			updateManager.onUpdateFailed(() => {
				uni.showModal({
					title: '提示',
					content: '检查到有新版本，但是下载失败，请检查网络设置',
					showCancel: false
				})
			})
		}
	})
}
// #endif