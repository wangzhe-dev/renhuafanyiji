<template>
	<view class="tab-bar">
		<view class="tab-bar-inner">

			<view
				v-for="item in leftTabs"
				:key="item.path"
				class="tab-item"
				:class="{ active: isActive(item.path) }"
				@tap="go(item.path)"
			>
				<uni-icons
					:type="isActive(item.path) ? item.activeIcon : item.icon"
					:color="isActive(item.path) ? '#E45C1A' : 'rgba(26, 26, 26,0.35)'"
					size="24"
				/>
				<text class="tab-label">{{ item.label }}</text>
			</view>

			<view class="tab-center" @tap="goPublish">
				<view class="pub-btn" :class="{ active: isPublishActive }">
					<uni-icons type="plusempty" color="#fff" size="24" />
				</view>
				<text class="tab-label center">发布</text>
			</view>

			<view
				v-for="item in rightTabs"
				:key="item.path"
				class="tab-item"
				:class="{ active: isActive(item.path) }"
				@tap="go(item.path)"
			>
				<uni-icons
					:type="isActive(item.path) ? item.activeIcon : item.icon"
					:color="isActive(item.path) ? '#E45C1A' : 'rgba(26, 26, 26,0.35)'"
					size="24"
				/>
				<text class="tab-label">{{ item.label }}</text>
			</view>

		</view>
		<view class="safe-bottom" />
	</view>
</template>

<script setup lang="ts">
	import { useUserStore } from '@/stores'
	import { requireLogin } from '@/utils/auth-guard'

	const props = defineProps<{ current: string }>()
	const userStore = useUserStore()

	const leftTabs = [
		{ path: '/pages/index/index', label: '首页', icon: 'home', activeIcon: 'home-filled' },
	]

	const rightTabs = [
		{ path: '/pages/my/my', label: '我的', icon: 'person', activeIcon: 'person-filled' },
	]

	const publishTab = { path: '/pages/publish/index' }

	const isActive = (path: string) => props.current === path
	const isPublishActive = computed(() => props.current === publishTab.path)

	const go = (path: string) => {
		if (props.current === path) return
		uni.switchTab({ url: path })
	}

	const goPublish = () => {
		if (!requireLogin(userStore.token, '发布内容')) return
		if (props.current === publishTab.path) return
		uni.switchTab({ url: publishTab.path })
	}
</script>

<style lang="scss" scoped>
	.tab-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background: var(--card-bg);
		border-top: none;
		box-shadow: 0 -8rpx 24rpx rgba(26, 26, 26, 0.06);
		z-index: 999;
	}

	.tab-bar-inner {
		display: flex;
		align-items: flex-end;
		height: 108rpx;
		padding: 0 4rpx 16rpx;
	}

	.tab-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6rpx;
		padding-bottom: 2rpx;
	}

	.tab-center {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8rpx;

		.pub-btn {
			width: 80rpx;
			height: 80rpx;
			border-radius: 50%;
			background: var(--orange-color);
			display: flex;
			align-items: center;
			justify-content: center;
			box-shadow: 0 4rpx 20rpx rgba(228, 92, 26, 0.24);
			margin-top: -30rpx;

			&.active {
				box-shadow: 0 2rpx 10rpx rgba(228, 92, 26, 0.18);
				opacity: 0.9;
			}

			&:active { opacity: 0.8; }
		}
	}

	.tab-label {
		font-size: 18rpx;
		color: rgba(26, 26, 26, 0.45);
		font-weight: 400;
		line-height: 1;

		&.center {
			color: rgba(26, 26, 26, 0.45);
		}
	}

	.tab-item.active .tab-label {
		color: var(--orange-color);
		font-weight: 600;
	}

	.safe-bottom {
		height: 0;
		height: constant(safe-area-inset-bottom);
		height: env(safe-area-inset-bottom);
	}
</style>
