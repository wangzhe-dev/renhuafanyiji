<template>
	<view class="page">
		<uni-nav-bar status-bar left-icon="left" title="意见反馈" @click-left="goBack" />

		<scroll-view class="content" scroll-y :show-scrollbar="false">

			<!-- 类型选择 -->
			<view class="section">
				<text class="section-label">反馈类型</text>
				<view class="type-row">
					<view
						v-for="t in typeOptions"
						:key="t.value"
						class="type-tag"
						:class="{ active: selectedType === t.value }"
						hover-class="type-tag-hover"
						hover-stay-time="80"
						@tap="selectedType = t.value"
					>
						<view class="type-tag-main">
							<uni-icons
								class="type-tag-icon"
								:type="t.icon"
								size="16"
								:color="selectedType === t.value ? '#5B5BD6' : '#9CA3AF'"
							/>
							<text class="type-tag-text">{{ t.label }}</text>
						</view>
						<uni-icons
							v-if="selectedType === t.value"
							type="checkmarkempty"
							size="16"
							color="#5B5BD6"
						/>
					</view>
				</view>
			</view>

			<!-- 内容输入 -->
			<view class="section">
				<text class="section-label">反馈内容 <text class="required">*</text></text>
				<view class="textarea-wrap">
					<textarea
						class="feedback-textarea"
						v-model="content"
						placeholder="请描述你遇到的问题或建议，我们会认真阅读每一条反馈..."
						placeholder-class="textarea-placeholder"
						:maxlength="500"
						:auto-height="false"
					/>
					<text class="word-count" :class="{ warn: content.length > 450 }">
						{{ content.length }}/500
					</text>
				</view>
			</view>

			<!-- 联系方式 -->
			<view class="section">
				<text class="section-label">联系方式 <text class="optional">（选填，方便回复你）</text></text>
				<view class="input-wrap">
					<input
						class="contact-input"
						v-model="contact"
						placeholder="手机号 / 邮箱 / 微信号"
						placeholder-class="input-placeholder"
						:maxlength="120"
					/>
				</view>
			</view>

			<!-- 提交按钮 -->
			<view class="submit-area">
				<view
					class="submit-btn"
					:class="{ disabled: !canSubmit || submitting }"
					@tap="handleSubmit"
				>
					<text class="submit-text">{{ submitting ? '提交中...' : '提交反馈' }}</text>
				</view>
			</view>

			<view class="page-bottom" />
		</scroll-view>
	</view>
</template>

<script setup lang="ts">
	import { submitAppFeedback, type FeedbackType } from '@/api/appFeedback'

	const typeOptions: { value: FeedbackType; label: string; icon: string }[] = [
		{ value: 'suggestion', label: '功能建议', icon: 'compose' },
		{ value: 'bug', label: '问题反馈', icon: 'info-filled' },
		{ value: 'content', label: '内容问题', icon: 'list' },
		{ value: 'other', label: '其他', icon: 'chat' }
	]

	const selectedType = ref<FeedbackType>('suggestion')
	const content = ref('')
	const contact = ref('')
	const submitting = ref(false)

	const canSubmit = computed(() => content.value.trim().length > 0 && !submitting.value)

	const goBack = () => uni.navigateBack()

	const handleSubmit = async () => {
		if (submitting.value) return
		const trimmedContent = content.value.trim()
		const trimmedContact = contact.value.trim()
		if (!trimmedContent) {
			uni.showToast({ title: '请先填写反馈内容', icon: 'none' })
			return
		}

		submitting.value = true
		try {
			await submitAppFeedback({
				type: selectedType.value,
				content: trimmedContent,
				contact: trimmedContact || undefined
			})
			uni.showToast({ title: '感谢反馈！', icon: 'success' })
			content.value = ''
			contact.value = ''
			setTimeout(() => uni.navigateBack(), 1200)
		} catch {
			// 错误已由 request 拦截器统一提示
		} finally {
			submitting.value = false
		}
	}
</script>

<style lang="scss" scoped>
.page {
	min-height: 100vh;
	background: var(--bg-secondary);
	display: flex;
	flex-direction: column;
}


/* ── 滚动内容 ── */
.content {
	flex: 1;
	padding: 24rpx;
}

/* ── 通用 section ── */
.section {
	margin-bottom: 24rpx;
}

.section-label {
	display: block;
	font-size: 26rpx; font-weight: 600; color: var(--text-primary);
	margin-bottom: 16rpx;

	.required { color: var(--orange-color); }
	.optional { font-size: 22rpx; color: var(--text-muted); font-weight: 400; }
}

/* ── 类型标签 ── */
.type-row {
	display: flex;
	flex-wrap: wrap;
	gap: 16rpx;
}

.type-tag {
	width: calc((100% - 16rpx) / 2);
	padding: 18rpx 22rpx;
	border-radius: 20rpx;
	background: var(--card-bg);
	border: 1.5rpx solid var(--border-light);
	display: flex;
	align-items: center;
	justify-content: space-between;
	box-sizing: border-box;
	transition: all 0.15s;

	&.active {
		background: var(--primary-light);
		border-color: var(--primary-color);
	}
}

.type-tag-hover {
	opacity: 0.85;
}

.type-tag-main {
	display: flex;
	align-items: center;
	gap: 10rpx;
}

.type-tag-text {
	font-size: 26rpx;
	color: var(--text-gray);
}

.type-tag.active .type-tag-text {
	color: var(--primary-color);
	font-weight: 600;
}

/* ── 文本框 ── */
.textarea-wrap {
	background: var(--card-bg);
	border-radius: 20rpx;
	padding: 24rpx;
	position: relative;
	border: 1.5rpx solid var(--border-light);
}

.feedback-textarea {
	width: 100%;
	height: 280rpx;
	font-size: 28rpx;
	color: var(--text-primary);
	line-height: 1.7;
}

.textarea-placeholder {
	color: var(--text-placeholder);
	font-size: 28rpx;
}

.word-count {
	display: block;
	text-align: right;
	font-size: 22rpx;
	color: var(--text-placeholder);
	margin-top: 12rpx;

	&.warn { color: var(--accent-color); }
}

/* ── 联系方式输入 ── */
.input-wrap {
	background: var(--card-bg);
	border-radius: 20rpx;
	padding: 0 24rpx;
	border: 1.5rpx solid var(--border-light);
}

.contact-input {
	height: 88rpx;
	width: 100%;
	font-size: 28rpx;
	color: var(--text-primary);
}

.input-placeholder {
	color: var(--text-placeholder);
	font-size: 28rpx;
}

/* ── 提交按钮 ── */
.submit-area {
	margin-top: 16rpx;
}

.submit-btn {
	height: 96rpx;
	background: var(--primary-color);
	border-radius: 28rpx;
	display: flex; align-items: center; justify-content: center;
	box-shadow: 0 8rpx 24rpx rgba(91, 91, 214, 0.32);
	&:active { opacity: 0.85; }

	&.disabled {
		background: var(--text-placeholder);
		box-shadow: none;
	}
}

.submit-text {
	font-size: 30rpx; font-weight: 700; color: var(--card-bg);
}

.page-bottom { height: calc(60rpx + env(safe-area-inset-bottom)); }
</style>
