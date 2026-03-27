import { defineStore } from 'pinia'
import { mpShareFriend as mpShareFriendConfig, mpShareTimeline as mpShareTimelineConfig } from '@/config'

export const useShareStore = defineStore('share', () => {
	// 分享给朋友
	const mpShareFriend = ref<Page.CustomShareContent>(mpShareFriendConfig)
	// 分享到朋友圈
	const mpShareTimeline = ref<Page.ShareTimelineContent>(mpShareTimelineConfig)

	const setMpShareFriend = (val : Page.CustomShareContent) => {
		mpShareFriend.value = val
	}

	const setMpShareTimeline = (val : Page.ShareTimelineContent) => {
		mpShareTimeline.value = val
	}

	return { mpShareFriend, mpShareTimeline, setMpShareFriend, setMpShareTimeline }
})