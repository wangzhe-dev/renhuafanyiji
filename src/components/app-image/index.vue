<template>
	<view class="sbq-image" :class="{ 'is-error': isError }">
		<image
			class="sbq-image-el"
			:class="{ ready: !isLoading && !isError }"
			:src="src"
			:mode="mode"
			:lazy-load="lazyLoad"
			:show-menu-by-longpress="showMenuByLongpress"
			@load="handleLoad"
			@error="handleError"
		/>

		<view v-if="isLoading && !isError" class="sbq-image-mask">
			<view class="sbq-image-shimmer" />
		</view>

		<view v-if="isError" class="sbq-image-mask sbq-image-error">
			<text class="sbq-image-error-text">图片加载失败</text>
		</view>
	</view>
</template>

<script setup lang="ts">
type Props = {
	src: string
	mode?: string
	lazyLoad?: boolean
	showMenuByLongpress?: boolean
}

const props = withDefaults(defineProps<Props>(), {
	mode: 'aspectFill',
	lazyLoad: true,
	showMenuByLongpress: true
})

const isLoading = ref(!!props.src)
const isError = ref(false)

watch(() => props.src, (next) => {
	isLoading.value = !!next
	isError.value = false
}, { immediate: true })

const handleLoad = () => {
	isLoading.value = false
	isError.value = false
}

const handleError = () => {
	isLoading.value = false
	isError.value = true
}
</script>

<style scoped lang="scss">
.sbq-image {
	position: relative;
	display: block;
	width: 100%;
	height: 100%;
	overflow: hidden;
	background: #f3f4f6;
}

.sbq-image-el {
	display: block;
	width: 100%;
	height: 100%;
	opacity: 0;
	transition: opacity 0.24s ease;

	&.ready {
		opacity: 1;
	}
}

.sbq-image-mask {
	position: absolute;
	inset: 0;
	overflow: hidden;
	pointer-events: none;
}

.sbq-image-shimmer {
	position: absolute;
	inset: 0;
	background:
		linear-gradient(
			110deg,
			rgba(255, 255, 255, 0) 0%,
			rgba(255, 255, 255, 0.6) 45%,
			rgba(255, 255, 255, 0) 100%
		),
		#eceff3;
	background-size: 240% 100%, 100% 100%;
	animation: shimmer 1.15s linear infinite;
}

.sbq-image-error {
	display: flex;
	align-items: center;
	justify-content: center;
	background: #eef1f5;
}

.sbq-image-error-text {
	font-size: 22rpx;
	color: var(--text-muted);
}

@keyframes shimmer {
	from { background-position: 200% 0, 0 0; }
	to { background-position: -40% 0, 0 0; }
}
</style>
