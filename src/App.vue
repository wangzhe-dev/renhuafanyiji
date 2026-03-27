<script>
	import { useSysInfoStore } from '@/stores'

	// #ifdef H5
	// #endif

	// #ifdef MP-WEIXIN
	import { checkUpdate } from '@/utils/weixin'
	// #endif

	// #ifdef APP-PLUS
	import { unregisterRequestPermissionTipsListener } from '@/uni_modules/uni-registerRequestPermissionTips'
	import { checkAppUpdate } from '@/utils/app-update'
	import { listenPermissionRequest } from '@/utils/app'
	// #endif

	export default {
		// #ifdef H5
		// #endif

		onLaunch() {
			useSysInfoStore().setSystemInfo()

			// #ifdef APP-PLUS
			listenPermissionRequest()
			void checkAppUpdate()
			// #endif
		},

		onShow() {
			// #ifdef MP-WEIXIN
			checkUpdate()
			// #endif

			// #ifdef APP-PLUS
			void checkAppUpdate()
			// #endif
		},

		onExit() {
			// #ifdef APP-PLUS
			// 取消注册权限监听事件
			if (useSysInfoStore().systemInfo.osName === 'android') unregisterRequestPermissionTipsListener(null)
			// #endif
		}
	}
</script>

<style lang="scss">
	@use 'sard-uniapp/index.scss' as *;
	@use '@/static/css/flex.scss' as *;

	/* #ifndef APP-NVUE */
	@use '@/static/css/global.scss' as *;
	/* #endif */
</style>
