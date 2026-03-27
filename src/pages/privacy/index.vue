<template>
	<scroll-view scroll-y class="page">
		<view class="content">
			<text class="update-time">更新时间：2025年12月1日</text>

			<text class="section-title">一、我们收集的信息</text>
			<text class="section-body">为向您提供服务，我们会收集以下信息：您主动提供的邮箱地址、昵称等注册信息；您发布的内容（帖子、评论等）；您使用本产品时产生的操作日志（用于改善产品体验）。</text>

			<text class="section-title">二、信息的使用</text>
			<text class="section-body">我们收集的信息仅用于：提供、维护和改善本产品功能；向您发送验证码及服务通知；分析用户行为以优化产品体验（数据经脱敏处理）。</text>

			<text class="section-title">三、信息的共享</text>
			<text class="section-body">我们不会将您的个人信息出售给任何第三方。在以下情形下，我们可能共享您的信息：经您明确同意；依法律法规要求；为保护用户或公众安全所必需。</text>

			<text class="section-title">四、数据安全</text>
			<text class="section-body">我们采用行业标准的加密技术保护您的数据传输和存储安全。您的密码经哈希处理存储，我们的工作人员无法获取明文密码。如发生数据安全事件，我们将及时通知您。</text>

			<text class="section-title">五、您的权利</text>
			<text class="section-body">您有权访问、更正或删除您的个人信息，有权撤回对数据处理的同意，有权注销账号。如需行使上述权利，请通过应用内"我的 → 意见反馈"功能联系我们。</text>

			<text class="section-title">六、Cookie 与本地存储</text>
			<text class="section-body">本产品使用本地存储（LocalStorage / Storage）保存您的登录状态和偏好设置，以免每次使用时重复登录。您可在设备设置中清除应用数据以删除这些信息。</text>

			<text class="section-title">七、联系我们</text>
			<text class="section-body">如您对本隐私政策有任何疑问，请通过应用内"我的 → 意见反馈"功能联系我们，我们将在 5 个工作日内予以回复。</text>
		</view>
	</scroll-view>
</template>

<script setup lang="ts">
</script>

<style scoped lang="scss">
.page {
	min-height: 100vh;
	background: var(--bg-secondary);
}

.content {
	padding: 32rpx 32rpx 80rpx;
	display: flex;
	flex-direction: column;
}

.update-time {
	display: block;
	font-size: 22rpx;
	color: var(--text-muted);
	margin-bottom: 32rpx;
}

.section-title {
	display: block;
	font-size: 30rpx;
	font-weight: 700;
	color: var(--text-primary);
	margin-top: 32rpx;
	margin-bottom: 12rpx;
}

.section-body {
	display: block;
	font-size: 26rpx;
	color: var(--text-gray);
	line-height: 1.8;
}
</style>
