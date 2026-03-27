<template>
	<view class="page">

		<scroll-view class="main-scroll" scroll-y :show-scrollbar="false">

			<!-- 页面标题 -->
			<view class="page-header">
				<text class="page-title">趋势</text>
				<text class="page-subtitle">社区 AI Skill 消耗与洞察</text>
			</view>

			<!-- 模块1：今日最烧榜 -->
			<view class="trend-module">
				<view class="module-header">
					<view class="module-badge">
						<uni-icons type="fire-filled" size="20" color="#C84634" />
					</view>
					<text class="module-title">今日最烧榜</text>
				</view>

				<view class="burn-tabs">
					<view
						v-for="tab in burnTabs"
						:key="tab"
						class="burn-tab"
						:class="{ active: activeBurnTab === tab }"
						@tap="activeBurnTab = tab"
					>
						<text class="burn-tab-text">{{ tab }}</text>
					</view>
				</view>

				<!-- 最烧 Skill -->
				<view v-if="activeBurnTab === 'Skill'" class="burn-list">
					<view v-for="(item, idx) in topBurnSkills" :key="item.id" class="burn-rank-item" @tap="toSkill(item.id)">
						<view class="bri-rank" :class="'rank-' + (idx + 1)">
							<text class="bri-rank-text">{{ idx + 1 }}</text>
						</view>
						<view class="bri-info">
							<text class="bri-title">{{ item.title }}</text>
							<text class="bri-scene">{{ item.scene }}</text>
						</view>
						<view class="bri-token">
							<text class="bri-token-val">{{ item.avgToken }}</text>
							<text class="bri-token-unit">tokens/次</text>
						</view>
					</view>
				</view>

				<!-- 最烧场景 -->
				<view v-if="activeBurnTab === '场景'" class="burn-list">
					<view v-for="(item, idx) in topBurnScenes" :key="item.name" class="burn-rank-item">
						<view class="bri-rank" :class="'rank-' + (idx + 1)">
							<text class="bri-rank-text">{{ idx + 1 }}</text>
						</view>
						<uni-icons class="bri-scene-icon" :type="item.icon" :color="item.color" size="22" />
						<view class="bri-info">
							<text class="bri-title">{{ item.name }}</text>
							<text class="bri-scene">今日 {{ item.count }} 次使用</text>
						</view>
						<text class="bri-token-val orange">{{ item.avgToken }}</text>
					</view>
				</view>

				<!-- 最烧模型 -->
				<view v-if="activeBurnTab === '模型'" class="burn-list">
					<view v-for="(item, idx) in topBurnModels" :key="item.name" class="burn-rank-item">
						<view class="bri-rank" :class="'rank-' + (idx + 1)">
							<text class="bri-rank-text">{{ idx + 1 }}</text>
						</view>
						<view class="bri-info">
							<text class="bri-title">{{ item.name }}</text>
							<text class="bri-scene">社区今日使用 {{ item.count }}k 次</text>
						</view>
						<text class="bri-token-val orange">{{ item.avgCost }}</text>
					</view>
				</view>
			</view>

			<!-- 模块2：低成本高收益榜 -->
			<view class="trend-module">
				<view class="module-header">
					<view class="module-badge">
						<uni-icons type="wallet-filled" size="20" color="#2F8A57" />
					</view>
					<text class="module-title">低成本高收益</text>
					<text class="module-subtitle">token 低 · 复现率高</text>
				</view>

				<view class="value-list">
					<view
						v-for="skill in highValueSkills"
						:key="skill.id"
						class="value-item"
						@tap="toSkill(skill.id)"
					>
						<view class="vi-head">
							<view class="vi-scene-tag">{{ skill.scene }}</view>
							<view class="vi-badge-row">
								<view class="vi-badge badge-green">低成本</view>
								<view class="vi-badge badge-blue">{{ skill.successRate }} 复现</view>
							</view>
						</view>
						<text class="vi-title">{{ skill.title }}</text>
						<view class="vi-metrics">
							<view class="vim-item">
								<view class="vim-token">
									<uni-icons type="fire-filled" size="14" color="#E45C1A" />
									<text class="vim-val orange">{{ skill.avgToken }}</text>
								</view>
								<text class="vim-label">平均token</text>
							</view>
							<view class="vim-item">
								<text class="vim-val">{{ skill.copyCount }}</text>
								<text class="vim-label">复制数</text>
							</view>
							<view class="vim-item">
								<text class="vim-val green">{{ skill.successRate }}</text>
								<text class="vim-label">复现率</text>
							</view>
						</view>
						<view class="vi-copy-btn" @tap.stop="copySkill(skill)">
							<text class="vi-copy-text">复制 Skill</text>
						</view>
					</view>
				</view>
			</view>

			<!-- 模块3：模型消耗对比 -->
			<view class="trend-module">
				<view class="module-header">
					<view class="module-badge">
						<uni-icons type="bars" size="20" color="#5E738A" />
					</view>
					<text class="module-title">模型消耗对比</text>
					<text class="module-subtitle">社区平均 / 本周</text>
				</view>

				<view class="model-compare-list">
					<view v-for="model in modelCompare" :key="model.name" class="mc-item">
						<view class="mc-head">
							<view class="mc-name-dot" :style="{ background: model.color }" />
							<text class="mc-name">{{ model.name }}</text>
							<view class="mc-family">{{ model.family }}</view>
						</view>
						<view class="mc-bars">
							<view class="mc-bar-row">
								<text class="mc-bar-label">输入</text>
								<view class="mc-bar-track">
									<view class="mc-bar-fill" :style="{ width: model.inputPct + '%', background: model.color }" />
								</view>
								<text class="mc-bar-val">{{ model.avgInput }}</text>
							</view>
							<view class="mc-bar-row">
								<text class="mc-bar-label">输出</text>
								<view class="mc-bar-track">
									<view class="mc-bar-fill" :style="{ width: model.outputPct + '%', background: model.color + '99' }" />
								</view>
								<text class="mc-bar-val">{{ model.avgOutput }}</text>
							</view>
						</view>
						<view class="mc-total">
							<text class="mc-total-label">平均总token</text>
							<text class="mc-total-val orange">{{ model.avgTotal }}</text>
						</view>
					</view>
				</view>
			</view>

			<!-- 模块4：场景趋势 -->
			<view class="trend-module">
				<view class="module-header">
					<view class="module-badge">
						<uni-icons type="arrow-up" size="20" color="#E45C1A" />
					</view>
					<text class="module-title">场景趋势</text>
					<text class="module-subtitle">本周增长最快</text>
				</view>

				<view class="scene-trend-list">
					<view v-for="(scene, idx) in sceneTrends" :key="scene.name" class="st-item">
						<view class="st-rank">{{ idx + 1 }}</view>
						<uni-icons class="st-icon" :type="scene.icon" :color="scene.color" size="22" />
						<view class="st-info">
							<text class="st-name">{{ scene.name }}</text>
							<view class="st-bar-wrap">
								<view class="st-bar" :style="{ width: scene.pct + '%' }" />
							</view>
						</view>
						<view class="st-growth">
							<text class="st-growth-val">+{{ scene.growth }}%</text>
							<text class="st-growth-label">周增</text>
						</view>
					</view>
				</view>
			</view>

			<!-- 模块5：我的消耗洞察 -->
			<view class="trend-module">
				<view class="module-header">
					<view class="module-badge">
						<uni-icons type="person-filled" size="20" color="#7B5B3C" />
					</view>
					<text class="module-title">我的消耗洞察</text>
				</view>

				<view class="my-insight-grid">
					<view class="mi-item">
						<text class="mi-label">常用场景</text>
						<text class="mi-val">写作</text>
						<text class="mi-sub">占使用的 42%</text>
					</view>
					<view class="mi-item">
						<text class="mi-label">最爱模型</text>
						<text class="mi-val">Claude Sonnet</text>
						<text class="mi-sub">使用 31 次</text>
					</view>
					<view class="mi-item">
						<text class="mi-label">本月复制 Skill</text>
						<text class="mi-val orange">18 个</text>
						<text class="mi-sub">较上月 +6</text>
					</view>
					<view class="mi-item">
						<text class="mi-label">平均 token/次</text>
						<text class="mi-val orange">2.4k</text>
						<text class="mi-sub">低于社区均值</text>
					</view>
				</view>

				<view class="mi-history">
					<text class="mi-history-title">最近复制的 Skill</text>
					<view v-for="s in myRecentSkills" :key="s.id" class="mi-history-item" @tap="toSkill(s.id)">
						<text class="mi-h-title">{{ s.title }}</text>
						<text class="mi-h-time">{{ s.time }}</text>
					</view>
				</view>
			</view>

			<!-- 模块6：最新消耗动态 -->
			<view class="feed-section-label">
				<text class="fsl-title">最新动态</text>
				<text class="fsl-sub">社区实时消耗记录</text>
			</view>
			<view class="community-feed">
				<view
					v-for="post in communityPosts"
					:key="post.id"
					class="post-card"
					@tap="toPost(post.id)"
				>
					<!-- 头部 -->
					<view class="pc-header">
						<view class="pc-av" :style="{ background: post.authorColor }">
							<text class="pc-av-t">{{ post.author[0] }}</text>
						</view>
						<view class="pc-info">
							<text class="pc-name">{{ post.author }}</text>
							<view class="pc-meta-row">
								<view class="pc-model-tag">
									<view class="pc-model-dot" />
									<text class="pc-model-text">{{ post.model }}</text>
								</view>
								<text class="pc-time">{{ post.time }}</text>
							</view>
						</view>
						<view class="pc-more">
							<text class="pc-more-dot">·</text>
							<text class="pc-more-dot">·</text>
							<text class="pc-more-dot">·</text>
						</view>
					</view>

					<!-- 花费 + Token 数据块 -->
					<view class="pc-cost-block">
						<view class="pcb-left">
							<uni-icons type="wallet-filled" size="18" color="#E45C1A" />
							<text class="pcb-label">花费</text>
							<text class="pcb-cost-val">¥{{ post.cost }}</text>
						</view>
						<view class="pcb-divider" />
						<view class="pcb-right">
							<uni-icons type="bars" size="18" color="#FF7A45" />
							<text class="pcb-label">Token</text>
							<text class="pcb-token-val">{{ post.tokens }}</text>
						</view>
					</view>

					<!-- 正文 -->
					<text class="pc-content">{{ post.content }}</text>

					<!-- 情绪反应 -->
					<view class="pc-reactions">
						<view
							class="pc-reaction"
							:class="{ selected: post.myReaction === r.key }"
							v-for="r in reactions"
							:key="r.key"
							@tap.stop="post.myReaction = r.key"
						>
							<uni-icons :type="r.icon" :size="16" :color="post.myReaction === r.key ? r.activeColor : '#9CA3AF'" />
							<text class="pr-text">{{ r.text }}</text>
						</view>
					</view>

					<!-- 底部操作 -->
					<view class="pc-actions">
						<view class="pc-action" @tap.stop>
							<uni-icons type="heart-filled" size="16" color="#9CA3AF" />
							<text class="pa-val">{{ post.likes }}</text>
						</view>
						<view class="pc-action" @tap.stop>
							<uni-icons type="chat" size="16" color="#9CA3AF" />
							<text class="pa-val">{{ post.comments }}</text>
						</view>
						<view class="pc-action meoo" @tap.stop>
							<uni-icons type="hand-up" size="16" color="#6B7280" />
							<text class="pa-meoo-text">我也是</text>
							<text class="pa-val">{{ post.meoo }}</text>
						</view>
						<view class="pc-action" @tap.stop>
							<uni-icons type="redo" size="16" color="#9CA3AF" />
						</view>
					</view>
				</view>
			</view>

			<view class="trend-bottom" />
		</scroll-view>

	</view>
</template>

<script setup lang="ts">
	import { getCurrentInstance } from 'vue'
	import { copySkill as copySkillApi, getSkillDetail, getSkillList, getTrends } from '@/api/skill'
	import { useGuideStore, useUserStore } from '@/stores'
	import { requireLogin } from '@/utils/auth-guard'

	const instance = getCurrentInstance()
	const userStore = useUserStore()
	const guideStore = useGuideStore()
	onShow(() => {
		;(uni as any).getTabBar(instance?.proxy)?.setData({ selected: 1 })
	})
	const activeBurnTab = ref('Skill')

	const reactions = [
		{ key: 'worth', icon: 'checkmarkempty', activeColor: '#2F8A57', text: '超值' },
		{ key: 'ok', icon: 'info', activeColor: '#5B5BD6', text: '可接受' },
		{ key: 'regret', icon: 'clear', activeColor: '#C84634', text: '偏亏' },
		{ key: 'addicted', icon: 'fire-filled', activeColor: '#FF7A45', text: '上头' },
	]

	const communityPosts = ref([
		{
			id: 'cp1',
			author: '王建明',
			authorColor: '#5B5BD6',
			model: 'GPT-4o',
			time: '今天 11:08',
			cost: '56.20',
			tokens: '890,000',
			content: '写了一篇技术文档，反复让它改格式改措辞，改了12轮。最后发现直接把要求写清楚第一轮就出来了。这课交得值。',
			likes: '156',
			comments: '23',
			meoo: '89',
			myReaction: '',
		},
		{
			id: 'cp2',
			author: '李设计',
			authorColor: '#D6943A',
			model: 'Claude Sonnet',
			time: '今天 09:45',
			cost: '12.80',
			tokens: '198,000',
			content: '用 AI 生成了 20 套 UI 配色方案，筛出 3 套给客户选。以前这活得半天，现在 30 分钟搞定。但 token 消耗也是真不少……',
			likes: '98',
			comments: '15',
			meoo: '44',
			myReaction: '',
		},
		{
			id: 'cp3',
			author: '陈省钱',
			authorColor: '#2F8A57',
			model: 'Claude Haiku',
			time: '昨天 22:30',
			cost: '1.20',
			tokens: '24,000',
			content: '把日常总结任务从 Sonnet 换到 Haiku，用了两周，质量没啥差别，费用降了 80%。Haiku 真的被低估了，适合结构化、格式化任务。',
			likes: '342',
			comments: '67',
			meoo: '178',
			myReaction: '',
		},
	])
	const burnTabs = ['Skill', '场景', '模型']
	const sceneIconMap: Record<string, { icon: string; color: string }> = {
		写作: { icon: 'compose', color: '#C84634' },
		编程: { icon: 'gear-filled', color: '#5E738A' },
		办公: { icon: 'calendar-filled', color: '#4F6C82' },
		自媒体: { icon: 'videocam-filled', color: '#7B5B3C' },
		学习: { icon: 'staff-filled', color: '#2F8A57' },
		设计: { icon: 'color', color: '#9A6530' },
		电商: { icon: 'shop-filled', color: '#D6943A' },
		运营: { icon: 'chart-filled', color: '#5B5BD6' }
	}

	const modelFamily = (modelName: string) => {
		const name = modelName.toLowerCase()
		if (name.includes('claude')) return 'Claude 系'
		if (name.includes('gpt')) return 'GPT 系'
		if (name.includes('deepseek')) return 'DeepSeek 系'
		if (name.includes('gemini')) return 'Gemini 系'
		return '其他'
	}

	const modelColor = (modelName: string) => {
		const name = modelName.toLowerCase()
		if (name.includes('claude')) return '#C7A06A'
		if (name.includes('gpt')) return '#2F8A57'
		if (name.includes('deepseek')) return '#5E738A'
		if (name.includes('gemini')) return '#D6943A'
		return '#5B5BD6'
	}

	const formatCount = (value: number | null | undefined) => {
		const n = Number(value ?? 0)
		if (!Number.isFinite(n) || n <= 0) return '0'
		if (n >= 10000) return `${(n / 1000).toFixed(1)}k`
		return `${Math.round(n)}`
	}

	const formatToken = (value: number | null | undefined) => {
		const n = Number(value ?? 0)
		if (!Number.isFinite(n) || n <= 0) return '--'
		if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
		return `${Math.round(n)}`
	}

	const formatRate = (value: number | null | undefined) => {
		if (value === null || value === undefined || Number.isNaN(Number(value))) return '--'
		return `${Number(value).toFixed(0)}%`
	}

	const normalizePlainText = (value: unknown) => `${value ?? ''}`
		.replace(/<[^>]*>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()

	const normalizeUsageModelName = (value: unknown): string => {
		const modelName = `${value ?? ''}`.trim()
		if (!modelName || modelName === '--' || modelName === '未知模型') return ''
		return modelName
	}

	const topBurnSkills = ref([
		{ id: 's5', title: '全自动 PRD 文档生成', scene: '办公', avgToken: '6.5k' },
		{ id: 's7', title: '长篇小说创作助手', scene: '写作', avgToken: '12.3k' },
		{ id: 's8', title: '代码全量重构专家', scene: '编程', avgToken: '8.1k' },
		{ id: 's9', title: '多语言教材制作', scene: '学习', avgToken: '5.7k' },
		{ id: 's10', title: '品牌视觉方案生成', scene: '设计', avgToken: '4.9k' }
	])

	const topBurnScenes = ref([
		{ name: '编程', icon: 'gear-filled', color: '#5E738A', count: '12.4k', avgToken: '4.2k' },
		{ name: '写作', icon: 'compose', color: '#C84634', count: '10.1k', avgToken: '3.8k' },
		{ name: '办公', icon: 'calendar-filled', color: '#4F6C82', count: '8.7k', avgToken: '3.1k' },
		{ name: '自媒体', icon: 'videocam-filled', color: '#7B5B3C', count: '6.3k', avgToken: '2.4k' }
	])

	const topBurnModels = ref([
		{ name: 'Claude Opus', count: '8.2', avgCost: '¥0.28/k' },
		{ name: 'GPT-4o', count: '6.7', avgCost: '¥0.12/k' },
		{ name: 'Claude Sonnet', count: '15.3', avgCost: '¥0.04/k' },
		{ name: 'Gemini Pro', count: '4.1', avgCost: '¥0.08/k' }
	])

	const highValueSkills = ref([
		{
			id: 'e1', title: '极简翻译润色器', scene: '写作',
			avgToken: '800', copyCount: '5.2k', successRate: '96%', modelName: ''
		},
		{
			id: 'e2', title: '会议纪要速记模板', scene: '办公',
			avgToken: '1.2k', copyCount: '4.1k', successRate: '92%', modelName: ''
		},
		{
			id: 'e3', title: '商品描述批量生成', scene: '电商',
			avgToken: '1.5k', copyCount: '3.8k', successRate: '89%', modelName: ''
		}
	])

	const modelCompare = ref([
		{
			name: 'Claude Sonnet', family: 'Claude 系', color: '#C7A06A',
			avgInput: '1.1k', avgOutput: '2.0k', avgTotal: '3.1k',
			inputPct: 55, outputPct: 75
		},
		{
			name: 'GPT-4o', family: 'GPT 系', color: '#2F8A57',
			avgInput: '1.4k', avgOutput: '1.6k', avgTotal: '3.0k',
			inputPct: 70, outputPct: 60
		},
		{
			name: 'DeepSeek', family: 'DeepSeek 系', color: '#5E738A',
			avgInput: '1.8k', avgOutput: '1.2k', avgTotal: '3.0k',
			inputPct: 90, outputPct: 45
		},
		{
			name: 'Gemini Pro', family: 'Gemini 系', color: '#D6943A',
			avgInput: '1.0k', avgOutput: '1.8k', avgTotal: '2.8k',
			inputPct: 50, outputPct: 68
		}
	])

	const sceneTrends = ref([
		{ name: '编程辅助', icon: 'gear-filled', color: '#5E738A', pct: 95, growth: 34 },
		{ name: '自媒体运营', icon: 'videocam-filled', color: '#7B5B3C', pct: 82, growth: 28 },
		{ name: '电商文案', icon: 'shop-filled', color: '#9A6530', pct: 71, growth: 22 },
		{ name: '办公效率', icon: 'calendar-filled', color: '#4F6C82', pct: 63, growth: 18 },
		{ name: '学习辅助', icon: 'staff-filled', color: '#2F8A57', pct: 54, growth: 14 }
	])

	const myRecentSkills = ref([
		{ id: 'r1', title: '万能长文写作框架', time: '2小时前' },
		{ id: 'r2', title: '代码审查专家 Prompt', time: '昨天' },
		{ id: 'r3', title: '极简翻译润色器', time: '3天前' }
	])

	const loadTrendData = async () => {
		try {
			const [trendData, skillData] = await Promise.all([
				getTrends({ days: 7 }),
				getSkillList({ page: 1, pageSize: 20, sort: 'mostCopy' })
			])

			const sceneStats = Array.isArray(trendData?.sceneStats) ? trendData.sceneStats : []
			if (sceneStats.length) {
				const maxUsage = Math.max(...sceneStats.map((item: any) => Number(item?.usageCount ?? 0)), 1)
				topBurnScenes.value = sceneStats.slice(0, 5).map((item: any) => {
					const scene = `${item?.scene || '其他'}`
					const iconMeta = sceneIconMap[scene] || { icon: 'help-filled', color: '#9CA3AF' }
					return {
						name: scene,
						icon: iconMeta.icon,
						color: iconMeta.color,
						count: formatCount(item?.usageCount),
						avgToken: formatToken(item?.avgTotalTokens)
					}
				})
				sceneTrends.value = sceneStats.slice(0, 5).map((item: any) => {
					const scene = `${item?.scene || '其他'}`
					const iconMeta = sceneIconMap[scene] || { icon: 'help-filled', color: '#9CA3AF' }
					const usage = Number(item?.usageCount ?? 0)
					return {
						name: scene,
						icon: iconMeta.icon,
						color: iconMeta.color,
						pct: Math.round((usage / maxUsage) * 100),
						growth: Math.max(5, Math.round((usage / maxUsage) * 35))
					}
				})
			}

			const modelStats = Array.isArray(trendData?.modelStats) ? trendData.modelStats : []
			if (modelStats.length) {
				const maxInput = Math.max(...modelStats.map((item: any) => Number(item?.avgInputTokens ?? 0)), 1)
				const maxOutput = Math.max(...modelStats.map((item: any) => Number(item?.avgOutputTokens ?? 0)), 1)

				topBurnModels.value = modelStats.slice(0, 5).map((item: any) => {
					const usage = Number(item?.usageCount ?? 0)
					const usageInK = usage <= 0 ? '0' : `${(usage / 1000).toFixed(1)}`.replace(/\.0$/, '')
					return {
						name: `${item?.modelName || '未知模型'}`,
						count: usageInK,
						avgCost: item?.avgCost === null || item?.avgCost === undefined ? '--' : `¥${Number(item.avgCost).toFixed(2)}`
					}
				})

				modelCompare.value = modelStats.slice(0, 4).map((item: any) => {
					const modelName = `${item?.modelName || '未知模型'}`
					const input = Number(item?.avgInputTokens ?? 0)
					const output = Number(item?.avgOutputTokens ?? 0)
					return {
						name: modelName,
						family: modelFamily(modelName),
						color: modelColor(modelName),
						avgInput: formatToken(input),
						avgOutput: formatToken(output),
						avgTotal: formatToken(item?.avgTotalTokens),
						inputPct: Math.max(12, Math.round((input / maxInput) * 100)),
						outputPct: Math.max(12, Math.round((output / maxOutput) * 100))
					}
				})
			}

			const highValue = Array.isArray(trendData?.highValueSkills) ? trendData.highValueSkills : []
			if (highValue.length) {
				highValueSkills.value = highValue.slice(0, 5).map((item: any) => ({
					id: `${item?.id || ''}`,
					title: `${item?.title || '未命名 Skill'}`,
					scene: `${item?.scene || '其他'}`,
					avgToken: formatToken(item?.avgTotalTokens),
					copyCount: formatCount(item?.copyCount),
					successRate: formatRate(item?.successRate),
					modelName: normalizeUsageModelName(item?.modelName)
				}))
				myRecentSkills.value = highValue.slice(0, 3).map((item: any) => ({
					id: `${item?.id || ''}`,
					title: `${item?.title || '未命名 Skill'}`,
					time: '近期'
				}))
			}

			const skillList = Array.isArray(skillData?.list) ? skillData.list : []
			const sortedByToken = skillList
				.filter((item: any) => Number(item?.avgTotalTokens ?? 0) > 0)
				.sort((a: any, b: any) => Number(b?.avgTotalTokens ?? 0) - Number(a?.avgTotalTokens ?? 0))
				.slice(0, 5)

			if (sortedByToken.length) {
				topBurnSkills.value = sortedByToken.map((item: any) => ({
					id: `${item?.id || ''}`,
					title: `${item?.title || '未命名 Skill'}`,
					scene: `${item?.scene || '其他'}`,
					avgToken: formatToken(item?.avgTotalTokens)
				}))
			}
		} catch {}
	}

	onMounted(() => {
		void loadTrendData()
	})

	const toSkill = (id: string) => {
		if (!id) return
		uni.navigateTo({ url: `/pages/detail/skill?id=${id}` })
	}

	const toPost = (id: string) => {
		uni.navigateTo({ url: `/pages/detail/post?id=${id}` })
	}

	const copySkill = async (skill: any) => {
		if (!requireLogin(userStore.token, '复制 Skill')) return
		let copyText = ''
		try {
			const detail = await getSkillDetail(skill?.id)
			copyText = normalizePlainText(detail?.content?.fullPrompt)
		} catch {}
		if (!copyText) copyText = normalizePlainText(skill?.title)
		if (!copyText) {
			uni.showToast({ title: '暂无可复制内容', icon: 'none' })
			return
		}
		const copied = await new Promise<boolean>((resolve) => {
			uni.setClipboardData({
				data: copyText,
				showToast: false,
				success: () => resolve(true),
				fail: () => resolve(false)
			})
		})
		if (!copied) {
			uni.showToast({ title: '复制失败', icon: 'none' })
			return
		}

		if (skill?.id) {
			try {
				const modelName = normalizeUsageModelName(skill?.modelName)
				await copySkillApi(
					skill.id,
					modelName
						? { sourceChannel: 'trend', usage: { modelName } }
						: { sourceChannel: 'trend' }
				)
			} catch {}
		}
		guideStore.markFirstSkillCopy()
		uni.showToast({ title: '已复制 Skill', icon: 'success' })
	}
</script>

<style lang="scss" scoped>
	.page {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--card-bg);
	}

	.main-scroll { flex: 1; overflow: hidden; }

	/* 页面标题 */
	.page-header {
		padding: 36rpx 24rpx 24rpx;

		.page-title { display: block; font-size: 44rpx; font-weight: 900; color: var(--text-color); margin-bottom: 8rpx; }
		.page-subtitle { display: block; font-size: 24rpx; color: rgba(0,0,0,0.40); }
	}

	/* 通用模块 */
	.trend-module {
		margin: 0 24rpx 28rpx;
		background: var(--card-bg);
		border-radius: 28rpx;
		border: 1rpx solid rgba(0,0,0,0.07);
		padding: 28rpx;
	}

	.module-header {
		display: flex;
		align-items: center;
		gap: 10rpx;
		margin-bottom: 24rpx;

		.module-badge {
			width: 36rpx;
			height: 36rpx;
			display: flex;
			align-items: center;
			justify-content: center;
			flex-shrink: 0;
		}
		.module-title { font-size: 28rpx; font-weight: 700; color: var(--text-color); flex: 1; }
		.module-subtitle { font-size: 20rpx; color: rgba(0,0,0,0.35); }
	}

	/* 模块1：烧榜 */
	.burn-tabs {
		display: flex;
		gap: 8rpx;
		margin-bottom: 20rpx;

		.burn-tab {
			height: 56rpx;
			padding: 0 24rpx;
			background: rgba(0,0,0,0.05);
			border-radius: 100rpx;
			display: flex;
			align-items: center;

			.burn-tab-text { font-size: 22rpx; color: rgba(0,0,0,0.50); }

			&.active {
				background: rgba(228, 92, 26,0.15);
				border: 1rpx solid rgba(228, 92, 26, 0.18);

				.burn-tab-text { color: var(--orange-color); font-weight: 600; }
			}
		}
	}

	.burn-list {
		display: flex;
		flex-direction: column;
		gap: 0;

		.burn-rank-item {
			display: flex;
			align-items: center;
			gap: 16rpx;
			padding: 18rpx 0;
			border-bottom: 1rpx solid rgba(0,0,0,0.04);

			&:last-child { border-bottom: none; }
			&:active { background: rgba(0,0,0,0.02); }

			.bri-rank {
				width: 44rpx;
				height: 44rpx;
				border-radius: 50%;
				display: flex;
				align-items: center;
				justify-content: center;
				background: rgba(0,0,0,0.07);
				flex-shrink: 0;

				.bri-rank-text { font-size: 22rpx; font-weight: 700; color: rgba(0,0,0,0.50); }

				&.rank-1 { background: var(--yellow-color); .bri-rank-text { color: #fff; } }
				&.rank-2 { background: rgba(0,0,0,0.10); .bri-rank-text { color: rgba(255,255,255,0.8); } }
				&.rank-3 { background: var(--orange-color); .bri-rank-text { color: #fff; } }
			}

			.bri-scene-icon {
				width: 36rpx;
				height: 36rpx;
				display: flex;
				align-items: center;
				justify-content: center;
				flex-shrink: 0;
			}

			.bri-info {
				flex: 1;

				.bri-title { display: block; font-size: 26rpx; font-weight: 600; color: var(--text-color); margin-bottom: 4rpx; }
				.bri-scene { display: block; font-size: 20rpx; color: rgba(0,0,0,0.40); }
			}

			.bri-token {
				display: flex;
				flex-direction: column;
				align-items: flex-end;
				gap: 2rpx;

				.bri-token-val { font-size: 24rpx; font-weight: 700; color: var(--orange-color); }
				.bri-token-unit { font-size: 18rpx; color: rgba(0,0,0,0.35); }
			}

			.bri-token-val.orange { font-size: 24rpx; font-weight: 700; color: var(--orange-color); }
		}
	}

	/* 模块2：高价值榜 */
	.value-list {
		display: flex;
		flex-direction: column;
		gap: 20rpx;

		.value-item {
			background: rgba(0,0,0,0.03);
			border-radius: 20rpx;
			padding: 20rpx;

			&:active { background: rgba(0,0,0,0.06); }

			.vi-head {
				display: flex;
				align-items: center;
				justify-content: space-between;
				margin-bottom: 12rpx;

				.vi-scene-tag {
					font-size: 18rpx;
					color: rgba(0,0,0,0.40);
					background: rgba(0,0,0,0.06);
					padding: 4rpx 12rpx;
					border-radius: 6rpx;
				}

				.vi-badge-row {
					display: flex;
					gap: 8rpx;

					.vi-badge {
						font-size: 18rpx;
						font-weight: 600;
						padding: 3rpx 12rpx;
						border-radius: 6rpx;

						&.badge-green { color: var(--green-color); background: rgba(47, 138, 87,0.12); }
						&.badge-blue { color: var(--blue-color); background: rgba(94, 115, 138,0.12); }
					}
				}
			}

			.vi-title {
				display: block;
				font-size: 26rpx;
				font-weight: 700;
				color: var(--text-color);
				margin-bottom: 16rpx;
			}

			.vi-metrics {
				display: flex;
				align-items: center;
				gap: 0;
				margin-bottom: 16rpx;

				.vim-item {
					flex: 1;
					display: flex;
					flex-direction: column;
					align-items: center;
					gap: 4rpx;

					.vim-token {
						display: flex;
						align-items: center;
						gap: 4rpx;
					}

					.vim-val { font-size: 24rpx; font-weight: 700; color: var(--text-color); }
					.vim-val.orange { color: var(--orange-color); }
					.vim-val.green { color: var(--green-color); }
					.vim-label { font-size: 18rpx; color: rgba(0,0,0,0.40); }
				}
			}

			.vi-copy-btn {
				width: 100%;
				height: 72rpx;
				background: var(--orange-color);
				border-radius: 16rpx;
				display: flex;
				align-items: center;
				justify-content: center;
				box-shadow: 0 4rpx 16rpx rgba(228, 92, 26, 0.18);

				.vi-copy-text { font-size: 26rpx; font-weight: 700; color: #fff; }
			}
		}
	}

	/* 模块3：模型对比 */
	.model-compare-list {
		display: flex;
		flex-direction: column;
		gap: 20rpx;

		.mc-item {
			background: rgba(0,0,0,0.03);
			border-radius: 20rpx;
			padding: 20rpx;

			.mc-head {
				display: flex;
				align-items: center;
				gap: 12rpx;
				margin-bottom: 16rpx;

				.mc-name-dot {
					width: 16rpx;
					height: 16rpx;
					border-radius: 50%;
					flex-shrink: 0;
				}

				.mc-name { font-size: 26rpx; font-weight: 700; color: var(--text-color); flex: 1; }

				.mc-family {
					font-size: 18rpx;
					color: rgba(0,0,0,0.35);
					background: rgba(0,0,0,0.05);
					padding: 3rpx 12rpx;
					border-radius: 6rpx;
				}
			}

			.mc-bars {
				display: flex;
				flex-direction: column;
				gap: 10rpx;
				margin-bottom: 14rpx;

				.mc-bar-row {
					display: flex;
					align-items: center;
					gap: 12rpx;

					.mc-bar-label { font-size: 18rpx; color: rgba(0,0,0,0.40); width: 40rpx; flex-shrink: 0; }

					.mc-bar-track {
						flex: 1;
						height: 10rpx;
						background: rgba(0,0,0,0.06);
						border-radius: 5rpx;
						overflow: hidden;

						.mc-bar-fill {
							height: 100%;
							border-radius: 5rpx;
							transition: width 0.3s;
						}
					}

					.mc-bar-val { font-size: 20rpx; color: rgba(0,0,0,0.55); width: 60rpx; text-align: right; flex-shrink: 0; }
				}
			}

			.mc-total {
				display: flex;
				align-items: center;
				justify-content: space-between;
				padding-top: 12rpx;
				border-top: 1rpx solid rgba(0,0,0,0.05);

				.mc-total-label { font-size: 20rpx; color: rgba(0,0,0,0.40); }
				.mc-total-val { font-size: 26rpx; font-weight: 700; }
				.orange { color: var(--orange-color); }
			}
		}
	}

	/* 模块4：场景趋势 */
	.scene-trend-list {
		display: flex;
		flex-direction: column;
		gap: 16rpx;

		.st-item {
			display: flex;
			align-items: center;
			gap: 14rpx;

			.st-rank {
				width: 36rpx;
				font-size: 22rpx;
				font-weight: 700;
				color: rgba(0,0,0,0.35);
				text-align: center;
				flex-shrink: 0;
			}

			.st-icon {
				width: 36rpx;
				height: 36rpx;
				display: flex;
				align-items: center;
				justify-content: center;
				flex-shrink: 0;
			}

			.st-info {
				flex: 1;

				.st-name { display: block; font-size: 24rpx; font-weight: 600; color: var(--text-color); margin-bottom: 8rpx; }

				.st-bar-wrap {
					height: 8rpx;
					background: rgba(0,0,0,0.06);
					border-radius: 4rpx;
					overflow: hidden;

					.st-bar {
						height: 100%;
						background: var(--orange-color);
						border-radius: 4rpx;
					}
				}
			}

			.st-growth {
				display: flex;
				flex-direction: column;
				align-items: flex-end;
				gap: 2rpx;
				flex-shrink: 0;

				.st-growth-val { font-size: 24rpx; font-weight: 700; color: var(--green-color); }
				.st-growth-label { font-size: 18rpx; color: rgba(0,0,0,0.35); }
			}
		}
	}

	/* 模块5：我的洞察 */
	.my-insight-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 14rpx;
		margin-bottom: 20rpx;

		.mi-item {
			background: rgba(0,0,0,0.03);
			border-radius: 16rpx;
			padding: 20rpx 16rpx;
			display: flex;
			flex-direction: column;
			gap: 6rpx;

			.mi-label { font-size: 20rpx; color: rgba(0,0,0,0.40); }
			.mi-val { font-size: 28rpx; font-weight: 800; color: var(--text-color); }
			.mi-val.orange { color: var(--orange-color); }
			.mi-sub { font-size: 18rpx; color: rgba(0,0,0,0.35); }
		}
	}

	.mi-history {
		background: rgba(0,0,0,0.03);
		border-radius: 16rpx;
		padding: 18rpx 20rpx;

		.mi-history-title {
			display: block;
			font-size: 22rpx;
			font-weight: 600;
			color: rgba(0,0,0,0.50);
			margin-bottom: 14rpx;
		}

		.mi-history-item {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 12rpx 0;
			border-bottom: 1rpx solid rgba(0,0,0,0.04);

			&:last-child { border-bottom: none; }
			&:active { opacity: 0.7; }

			.mi-h-title { font-size: 24rpx; color: rgba(0,0,0,0.70); font-weight: 500; }
			.mi-h-time { font-size: 20rpx; color: rgba(0,0,0,0.35); }
		}
	}

	.trend-bottom { height: calc(160rpx + env(safe-area-inset-bottom)); }

	/* 最新动态 section label */
	.feed-section-label {
		display: flex;
		align-items: baseline;
		gap: 12rpx;
		padding: 8rpx 24rpx 16rpx;

		.fsl-title { font-size: 30rpx; font-weight: 800; color: var(--text-primary); }
		.fsl-sub { font-size: 22rpx; color: var(--text-muted); }
	}

	/* 社区动态 feed */
	.community-feed {
		padding: 0 24rpx;
		display: flex;
		flex-direction: column;
		gap: 20rpx;
		margin-bottom: 8rpx;
	}

	/* 消耗记录 card */
	.post-card {
		background: var(--card-bg);
		border-radius: 28rpx;
		border: 1rpx solid rgba(0,0,0,0.06);
		padding: 28rpx;
		box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);

		.pc-header {
			display: flex;
			align-items: center;
			gap: 16rpx;
			margin-bottom: 24rpx;

			.pc-av {
				width: 72rpx;
				height: 72rpx;
				border-radius: 50%;
				display: flex;
				align-items: center;
				justify-content: center;
				flex-shrink: 0;

				.pc-av-t { font-size: 26rpx; color: #fff; font-weight: 800; }
			}

			.pc-info {
				flex: 1;

				.pc-name { display: block; font-size: 30rpx; font-weight: 700; color: var(--text-primary); margin-bottom: 8rpx; }

				.pc-meta-row {
					display: flex;
					align-items: center;
					gap: 14rpx;

					.pc-model-tag {
						display: flex;
						align-items: center;
						gap: 8rpx;
						background: rgba(47,138,87,0.08);
						border: 1rpx solid rgba(47,138,87,0.15);
						border-radius: 100rpx;
						padding: 5rpx 14rpx;

						.pc-model-dot {
							width: 12rpx;
							height: 12rpx;
							border-radius: 50%;
							background: var(--green-color);
							flex-shrink: 0;
						}

						.pc-model-text { font-size: 20rpx; color: var(--green-color); font-weight: 500; }
					}

					.pc-time { font-size: 20rpx; color: var(--text-muted); }
				}
			}

			.pc-more {
				display: flex;
				gap: 5rpx;
				padding: 8rpx;

				.pc-more-dot { font-size: 20rpx; color: var(--text-muted); line-height: 1; }
			}
		}

		.pc-cost-block {
			display: flex;
			align-items: center;
			background: rgba(255, 122, 69, 0.07);
			border-radius: 20rpx;
			margin-bottom: 24rpx;
			overflow: hidden;

			.pcb-left, .pcb-right {
				flex: 1;
				display: flex;
				flex-direction: column;
				align-items: center;
				padding: 20rpx 16rpx;
				gap: 6rpx;

				.pcb-label { font-size: 20rpx; color: var(--text-muted); }
			}

			.pcb-left .pcb-cost-val {
				font-size: 40rpx;
				font-weight: 900;
				color: var(--orange-color);
				letter-spacing: -1rpx;
				font-variant-numeric: tabular-nums;
			}

			.pcb-right .pcb-token-val {
				font-size: 36rpx;
				font-weight: 900;
				color: var(--accent-color);
				letter-spacing: -1rpx;
				font-variant-numeric: tabular-nums;
			}

			.pcb-divider {
				width: 1rpx;
				height: 80rpx;
				background: rgba(255,122,69,0.2);
				flex-shrink: 0;
			}
		}

		.pc-content {
			display: block;
			font-size: 30rpx;
			color: var(--text-dark);
			line-height: 1.75;
			margin-bottom: 24rpx;
		}

		.pc-reactions {
			display: flex;
			gap: 12rpx;
			margin-bottom: 24rpx;

			.pc-reaction {
				flex: 1;
				display: flex;
				align-items: center;
				justify-content: center;
				gap: 6rpx;
				background: rgba(0,0,0,0.04);
				border: 1rpx solid rgba(0,0,0,0.06);
				border-radius: 100rpx;
				padding: 12rpx 0;

				.pr-emoji { font-size: 24rpx; }
				.pr-text { font-size: 20rpx; color: var(--text-gray); font-weight: 500; }

				&.selected {
					background: rgba(255,122,69,0.12);
					border-color: rgba(255,122,69,0.25);

					.pr-text { color: var(--accent-color); }
				}
			}
		}

		.pc-actions {
			display: flex;
			align-items: center;
			padding-top: 18rpx;
			border-top: 1rpx solid rgba(0,0,0,0.05);

			.pc-action {
				display: flex;
				align-items: center;
				gap: 8rpx;
				padding-right: 20rpx;

				.pa-heart { font-size: 28rpx; }
				.pa-val { font-size: 24rpx; color: var(--text-muted); }

				&.meoo {
					flex: 1;
					background: rgba(0,0,0,0.04);
					border-radius: 100rpx;
					padding: 10rpx 20rpx;
					margin-left: auto;
					justify-content: center;
					gap: 6rpx;

					.pa-meoo-emoji { font-size: 24rpx; }
					.pa-meoo-text { font-size: 22rpx; color: var(--text-gray); font-weight: 500; }
					.pa-val { font-size: 22rpx; }
				}
			}
		}
	}
</style>
