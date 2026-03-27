<template>
	<scroll-view scroll-y class="page">
		<view class="content">
			<text class="update-time">更新时间：2025年12月1日</text>

			<text class="section-title">一、服务说明</text>
			<text class="section-body">少不起（以下简称"本产品"）是一款面向效率与内容创作者的工具与社区平台。在您使用本产品前，请仔细阅读本协议。使用本产品即视为您同意本协议的全部条款。</text>

			<text class="section-title">二、账号注册</text>
			<text class="section-body">您需提供真实有效的邮箱地址完成注册，并设置安全密码。您应妥善保管账号信息，账号下的一切行为均由您本人承担。如发现账号被盗用，请立即通过应用内反馈联系我们。</text>

			<text class="section-title">三、用户行为规范</text>
			<text class="section-body">您在使用本产品时，不得发布违法违规内容，不得侵犯他人知识产权、名誉权或隐私权，不得从事任何危害平台安全的行为。我们保留对违规内容进行删除及对违规账号进行封禁的权利。</text>

			<text class="section-title">四、知识产权</text>
			<text class="section-body">您发布在本产品上的原创内容，知识产权归您所有。您授予本产品在平台范围内展示、传播该内容的非独家许可。本产品的界面、功能、商标等知识产权归我们所有。</text>

			<text class="section-title">五、免责声明</text>
			<text class="section-body">本产品不对用户发布的内容的真实性、合法性承担担保责任。因不可抗力或第三方原因导致的服务中断，我们不承担赔偿责任，但会尽力及时恢复服务。</text>

			<text class="section-title">六、协议修改</text>
			<text class="section-body">我们可能不时修订本协议。修订后的协议将在本产品内显著位置公告，自公告之日起生效。继续使用本产品即视为接受修订后的协议。</text>

			<text class="section-title">七、联系我们</text>
			<text class="section-body">如您对本协议有任何疑问，请通过应用内"我的 → 意见反馈"功能联系我们，我们将在 5 个工作日内予以回复。</text>
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
