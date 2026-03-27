<template>
	<view class="tab-bar">
		<view class="tab-bar-inner">

			<view
				v-for="(item, i) in leftTabs"
				:key="item.path"
				class="tab-item"
				:class="{ active: selected === i }"
				@tap="go(i, item.path)"
			>
				<uni-icons
					:type="selected === i ? item.activeIcon : item.icon"
					:color="selected === i ? '#E45C1A' : 'rgba(26, 26, 26,0.35)'"
					size="24"
				/>
				<text class="tab-label">{{ item.label }}</text>
			</view>

			<view class="tab-center" @tap="go(2, '/pages/publish/index')">
				<view class="pub-btn" :class="{ active: selected === 2 }">
					<uni-icons
						:type="selected === 2 ? 'plus-filled' : 'plusempty'"
						:color="selected === 2 ? '#FFFFFF' : '#E45C1A'"
						size="22"
					/>
				</view>
				<text class="tab-label">发布</text>
			</view>

			<view
				v-for="(item, i) in rightTabs"
				:key="item.path"
				class="tab-item"
				:class="{ active: selected === i + 3 }"
				@tap="go(i + 3, item.path)"
			>
				<uni-icons
					:type="selected === i + 3 ? item.activeIcon : item.icon"
					:color="selected === i + 3 ? '#E45C1A' : 'rgba(26, 26, 26,0.35)'"
					size="24"
				/>
				<text class="tab-label">{{ item.label }}</text>
			</view>

		</view>
		<view class="safe-bottom" />
	</view>
</template>

<script>
import UniIcons from '@dcloudio/uni-ui/lib/uni-icons/uni-icons.vue'

export default {
	components: { UniIcons },
	data() {
		return {
			selected: 0,
			leftTabs: [
				{ path: '/pages/index/index',     label: '首页', icon: 'home',   activeIcon: 'home-filled' },
				{ path: '/pages/community/index', label: '趋势', icon: 'fire',   activeIcon: 'fire-filled' }
			],
			rightTabs: [
				{ path: '/pages/skill/index', label: 'Skill', icon: 'star',   activeIcon: 'star-filled' },
				{ path: '/pages/my/my',       label: '我的',  icon: 'person', activeIcon: 'person-filled' }
			]
		}
	},
	methods: {
		go(index, path) {
			if (this.selected === index) return
			this.selected = index
			uni.switchTab({ url: path })
		},
		setData(data) {
			if (data.selected !== undefined) {
				this.selected = data.selected
			}
		}
	}
}
</script>

<style lang="scss">
	.tab-bar {
		background: var(--card-bg);
		border-top: none;
		box-shadow: 0 -8rpx 24rpx rgba(26, 26, 26, 0.06);
	}

	.tab-bar-inner {
		display: flex;
		align-items: center;
		height: 104rpx;
		padding: 0 8rpx;
	}

	.tab-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6rpx;
		justify-content: center;

		.tab-label {
			font-size: 20rpx;
			color: rgba(0,0,0,0.42);
			font-weight: 500;
			line-height: 1;
		}

		&.active .tab-label {
			color: var(--orange-color);
			font-weight: 700;
		}
	}

	.tab-center {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6rpx;
		justify-content: center;

		.pub-btn {
			width: 58rpx;
			height: 58rpx;
			border-radius: 16rpx;
			background: rgba(228, 92, 26, 0.08);
			border: 1rpx solid rgba(228, 92, 26, 0.32);
			display: flex;
			align-items: center;
			justify-content: center;
			transition: all 0.2s ease;

			&.active {
				background: var(--orange-color);
				border-color: var(--orange-color);
				box-shadow: 0 6rpx 18rpx rgba(228, 92, 26, 0.24);
			}
		}

		.tab-label {
			font-size: 20rpx;
			color: rgba(0,0,0,0.42);
			font-weight: 500;
			line-height: 1;
		}
	}

	.safe-bottom {
		height: 0;
		height: constant(safe-area-inset-bottom);
		height: env(safe-area-inset-bottom);
	}
</style>
