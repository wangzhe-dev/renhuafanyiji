<template>
  <view class="page">
    <!-- Top nav -->
    <view class="top-bar">
      <text class="top-cancel" @tap="goBack">取消</text>
      <view class="btn-pub" :class="{ on: canPublish }" @tap="publish">
        <text class="btn-pub-t">发布</text>
      </view>
    </view>

    <scroll-view class="body" scroll-y :show-scrollbar="false">
      <!-- Rich text editor -->
      <editor id="rec-editor" class="content-ed" placeholder="做了什么？效果怎么样？踩了什么坑，或者有什么心得..." show-img-size
        show-img-toolbar @ready="onEditorReady" @input="onEditorInput" @statuschange="onEditorStatusChange" />

      <view class="divider" />

      <!-- Media grid -->
      <view class="media-grid">
        <view v-for="(src, i) in form.images" :key="i" class="m-cell">
          <app-image :src="src" mode="aspectFill" class="m-img" />
          <view class="m-del" @tap.stop="removeImage(i)">
            <text class="m-x">×</text>
          </view>
        </view>
        <view v-if="form.images.length < 9" class="m-add" @tap="addImage">
          <text class="m-plus">+</text>
          <text class="m-lbl">加张图</text>
        </view>
      </view>

      <view class="divider" />

      <!-- Model selector -->
      <view class="meta-section">
        <view class="meta-row">
          <text class="meta-label">AI 模型</text>
          <view class="meta-row-right">
            <text v-if="form.model" class="meta-selected">{{ form.model }}</text>
            <text v-else class="meta-hint">选一个</text>
            <text class="meta-link" @tap="openModelSheet">全部模型</text>
          </view>
        </view>
        <scroll-view class="scene-scroll" scroll-x :show-scrollbar="false">
          <view class="scene-list">
            <view
              v-for="m in recommendedModels"
              :key="modelViewKey('recommend', m)"
              class="scene-chip"
              :class="{ on: isModelSelected(m) }"
              @tap="pickModel(m)"
            >
              <text class="scene-chip-t">{{ m.modelName }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <view class="divider" />

      <!-- Cost data -->
      <view class="meta-section">
        <view class="meta-row">
          <text class="meta-label">消耗数据</text>
          <text class="meta-hint">可选</text>
        </view>
        <view class="cost-row">
          <view class="cost-box">
            <text class="cost-pre">¥</text>
            <input class="cost-inp" v-model="form.cost" type="digit" placeholder="花费金额" />
          </view>
          <view class="cost-bar" />
          <view class="cost-box">
            <input class="cost-inp" v-model="form.tokens" type="number" placeholder="Token 数量" />
            <text class="cost-suf">tokens</text>
          </view>
        </view>
      </view>

      <view class="divider" />

      <!-- Reactions -->
      <view class="meta-section meta-section-btm">
        <view class="meta-row">
          <text class="meta-label">值不值</text>
          <text class="meta-hint">可选</text>
        </view>
        <view class="rxn-row">
          <view v-for="r in reactions" :key="r.key" class="rxn-chip" :class="{ on: form.reaction === r.key }" :style="form.reaction === r.key
            ? { background: r.bgColor, borderColor: r.borderColor }
            : {}" @tap="toggleReaction(r.key)">
            <uni-icons class="rxn-ico" :type="r.icon" size="20"
              :color="form.reaction === r.key ? r.activeColor : '#9CA3AF'" />
            <text class="rxn-lab" :style="form.reaction === r.key ? { color: r.activeColor } : {}">
              {{ r.text }}
            </text>
          </view>
        </view>
      </view>

      <view class="body-gap" />
    </scroll-view>

    <!-- 全部模型弹框 -->
    <uni-popup
      ref="modelPopup"
      type="bottom"
      border-radius="32rpx 32rpx 0 0"
      background-color="var(--card-bg)"
      :safe-area="true"
      @change="onPopupChange"
    >
      <view class="ms-wrap">
        <!-- 拖拽条 -->
        <view class="ms-handle" />

        <!-- 头部 -->
        <view class="ms-hd">
          <view class="ms-hd-left">
            <text class="ms-title">全部模型</text>
            <text class="ms-count">{{ groupedModelOptions.reduce((s, g) => s + g.items.length, 0) }} 个</text>
          </view>
          <view class="ms-close" @tap="closeModelSheet">
            <text class="ms-close-t">×</text>
          </view>
        </view>

        <!-- 搜索栏 -->
        <view class="ms-search-wrap">
          <view class="ms-search">
            <uni-icons type="search" size="15" color="#9CA3AF" />
            <input
              v-model="modelKeyword"
              class="ms-search-inp"
              type="text"
              placeholder="搜索模型名 / 厂商"
              placeholder-class="ms-search-ph"
            />
            <view v-if="modelKeyword" class="ms-search-clear" @tap="modelKeyword = ''">
              <uni-icons type="closeempty" size="12" color="#9CA3AF" />
            </view>
          </view>
        </view>

        <!-- 模型列表 -->
        <scroll-view
          class="ms-body"
          scroll-y
          :show-scrollbar="false"
          enhanced
          :bounces="false"
        >
          <view v-for="group in groupedModelOptions" :key="group.providerCode" class="ms-group">
            <view class="ms-group-hd">
              <view class="ms-group-dot" />
              <text class="ms-group-name">{{ group.providerName }}</text>
              <text class="ms-group-cnt">{{ group.items.length }}</text>
            </view>
            <view class="ms-grid">
              <view
                v-for="m in group.items"
                :key="modelViewKey('all', m)"
                class="ms-cell"
                :class="{ on: isModelSelected(m) }"
                @tap="pickModel(m, true)"
              >
                <text class="ms-cell-name">{{ m.modelName }}</text>
                <view v-if="isModelSelected(m)" class="ms-cell-check">
                  <text class="ms-cell-check-t">✓</text>
                </view>
                <text v-else-if="m.isRecommended" class="ms-cell-badge">荐</text>
              </view>
            </view>
          </view>

          <view v-if="groupedModelOptions.length === 0" class="ms-empty">
            <text class="ms-empty-t">暂无匹配模型</text>
          </view>

          <view class="ms-gap" />
        </scroll-view>
      </view>
    </uni-popup>

    <!-- Formatting bar (above bottom toolbar) -->
    <view v-if="showFormatBar" class="format-bar">
      <view class="fb-btn" :class="{ on: !!formats.bold }" @tap="applyFormat('bold')">
        <text class="fb-t fb-bold">B</text>
      </view>
      <view class="fb-btn" :class="{ on: !!formats.italic }" @tap="applyFormat('italic')">
        <text class="fb-t fb-italic">I</text>
      </view>
      <view class="fb-btn" :class="{ on: !!formats.underline }" @tap="applyFormat('underline')">
        <text class="fb-t fb-ul">U</text>
      </view>
      <view class="fb-btn" :class="{ on: formats.header === 2 }" @tap="applyFormat('header', 2)">
        <text class="fb-t">H2</text>
      </view>
      <view class="fb-btn" :class="{ on: formats.list === 'bullet' }" @tap="applyFormat('list', 'bullet')">
        <text class="fb-t">• 列</text>
      </view>
      <view class="fb-sep" />
      <view class="fb-btn" @tap="undo">
        <text class="fb-t">↩</text>
      </view>
      <view class="fb-btn" @tap="redo">
        <text class="fb-t">↪</text>
      </view>
      <view class="fb-btn" @tap="removeFormat">
        <text class="fb-t fb-clr">清</text>
      </view>
    </view>

    <!-- Bottom toolbar -->
    <view class="btm-bar">
      <view class="btm-icons">
        <view class="bi" @tap="addImage">
          <uni-icons type="image" size="22" color="#3C3C3C" />
        </view>
        <view class="bi" :class="{ 'bi-act': showFormatBar }" @tap="toggleFormatBar">
          <uni-icons type="compose" size="22" :color="showFormatBar ? '#5B5BD6' : '#3C3C3C'" />
        </view>
        <view class="bi" @tap="onEmoji">
          <uni-icons type="emojiface" size="22" color="#3C3C3C" />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { FeedReaction } from '@/api/feed'
import { createFeedPost, updateFeedPostImages } from '@/api/feed'
import { getModelList, type AiModelItem } from '@/api/model'
import { createSkillFeedback } from '@/api/skill'
import { uploadImageFile } from '@/api/upload'
import AppImage from '@/components/app-image/index.vue'
import { useUserStore } from '@/stores'
import { requireLogin } from '@/utils/auth-guard'
import { computed, reactive, ref } from 'vue'

const fallbackModelList: AiModelItem[] = [
  { id: 0, providerCode: 'deepseek', modelKey: 'deepseek-chat', modelName: 'deepseek-chat', isActive: true, isRecommended: true, sortNo: 10 },
  { id: 0, providerCode: 'deepseek', modelKey: 'deepseek-reasoner', modelName: 'deepseek-reasoner', isActive: true, isRecommended: true, sortNo: 20 },
  { id: 0, providerCode: 'qwen', modelKey: 'qwen-plus', modelName: 'qwen-plus', isActive: true, isRecommended: true, sortNo: 30 },
  { id: 0, providerCode: 'qwen', modelKey: 'qwen-max', modelName: 'qwen-max', isActive: true, isRecommended: true, sortNo: 40 },
  { id: 0, providerCode: 'zhipu', modelKey: 'glm-4-plus', modelName: 'glm-4-plus', isActive: true, isRecommended: true, sortNo: 50 },
  { id: 0, providerCode: 'moonshot', modelKey: 'moonshot-v1-128k', modelName: 'moonshot-v1-128k', isActive: true, isRecommended: true, sortNo: 60 },
  { id: 0, providerCode: 'doubao', modelKey: 'doubao-pro-32k', modelName: 'doubao-pro-32k', isActive: true, isRecommended: true, sortNo: 70 },
  { id: 0, providerCode: 'baidu_qianfan', modelKey: 'ernie-4.0-8k', modelName: 'ernie-4.0-8k', isActive: true, isRecommended: false, sortNo: 80 },
  { id: 0, providerCode: 'tencent_hunyuan', modelKey: 'hunyuan-standard', modelName: 'hunyuan-standard', isActive: true, isRecommended: false, sortNo: 90 },
  { id: 0, providerCode: 'minimax', modelKey: 'abab6.5s-chat', modelName: 'abab6.5s-chat', isActive: true, isRecommended: false, sortNo: 100 },
  { id: 0, providerCode: 'xfyun_spark', modelKey: 'spark-max', modelName: 'spark-max', isActive: true, isRecommended: false, sortNo: 110 },
  { id: 0, providerCode: 'anthropic', modelKey: 'claude-sonnet-4-5', modelName: 'claude-sonnet-4-5', isActive: true, isRecommended: true, sortNo: 120 },
  { id: 0, providerCode: 'openai', modelKey: 'gpt-4o', modelName: 'gpt-4o', isActive: true, isRecommended: true, sortNo: 130 },
  { id: 0, providerCode: 'openai', modelKey: 'gpt-4.1', modelName: 'gpt-4.1', isActive: true, isRecommended: false, sortNo: 140 },
  { id: 0, providerCode: 'google', modelKey: 'gemini-2.0-flash', modelName: 'gemini-2.0-flash', isActive: true, isRecommended: false, sortNo: 150 },
]

const providerNameMap: Record<string, string> = {
  deepseek: 'DeepSeek',
  qwen: '通义千问',
  zhipu: '智谱',
  moonshot: 'Moonshot',
  doubao: '豆包',
  baidu_qianfan: '百度千帆',
  tencent_hunyuan: '腾讯混元',
  minimax: 'MiniMax',
  xfyun_spark: '讯飞星火',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  other: '其他'
}

const reactions = [
  { key: 'worth', icon: 'checkmarkempty', text: '超值', activeColor: '#2F8A57', bgColor: 'rgba(47,138,87,0.10)', borderColor: 'rgba(47,138,87,0.28)' },
  { key: 'ok', icon: 'info', text: '可接受', activeColor: '#5B5BD6', bgColor: 'rgba(91,91,214,0.10)', borderColor: 'rgba(91,91,214,0.28)' },
  { key: 'regret', icon: 'clear', text: '偏亏', activeColor: '#C84634', bgColor: 'rgba(200,70,52,0.10)', borderColor: 'rgba(200,70,52,0.28)' },
  { key: 'addicted', icon: 'fire-filled', text: '上头', activeColor: '#FF7A45', bgColor: 'rgba(255,122,69,0.10)', borderColor: 'rgba(255,122,69,0.28)' },
]

const editorCtx = ref<any>(null)
const formats = ref<Record<string, any>>({})
const showFormatBar = ref(false)
const publishing = ref(false)
const userStore = useUserStore()
const skillId = ref('')
const FEED_POST_PUBLISHED_KEY = 'feed_post_published_v1'
const modelCatalog = ref<AiModelItem[]>([])

const modelPopup = ref<any>(null)
const modelKeyword = ref('')

const form = reactive({
  modelId: null as number | null,
  model: '',
  content: '',
  text: '',
  cost: '',
  tokens: '',
  reaction: '',
  images: [] as string[],
})

const canPublish = computed(() => !!form.model && !!form.text.trim())
const hasContent = computed(() => !!form.text.trim() || form.images.length > 0)
const recommendedModels = computed(() => {
  const source = modelCatalog.value.length ? modelCatalog.value : fallbackModelList
  const preferred = source.filter((m) => m.isRecommended)
  return (preferred.length ? preferred : source).slice(0, 10)
})
const groupedModelOptions = computed(() => {
  const source = modelCatalog.value.length ? modelCatalog.value : fallbackModelList
  const keyword = modelKeyword.value.trim().toLowerCase()
  const filtered = keyword
    ? source.filter((m) => {
      const providerName = providerNameMap[m.providerCode] || m.providerCode
      return (
        m.modelName.toLowerCase().includes(keyword) ||
        m.modelKey.toLowerCase().includes(keyword) ||
        m.providerCode.toLowerCase().includes(keyword) ||
        providerName.toLowerCase().includes(keyword)
      )
    })
    : source

  const groups = new Map<string, AiModelItem[]>()
  filtered.forEach((model) => {
    const key = model.providerCode || 'other'
    const list = groups.get(key) || []
    list.push(model)
    groups.set(key, list)
  })

  return Array.from(groups.entries())
    .map(([providerCode, items]) => ({
      providerCode,
      providerName: providerNameMap[providerCode] || providerCode,
      items: items.sort((a, b) => a.sortNo - b.sortNo || a.modelName.localeCompare(b.modelName))
    }))
    .sort((a, b) => a.providerName.localeCompare(b.providerName))
})

const dedupeModels = (rows: AiModelItem[]): AiModelItem[] => {
  const seen = new Set<string>()
  const list: AiModelItem[] = []
  rows.forEach((row) => {
    const modelName = `${row.modelName || ''}`.trim()
    if (!modelName) return
    const uniqueKey = `${row.providerCode || 'other'}::${row.modelKey || modelName}`
    if (seen.has(uniqueKey)) return
    seen.add(uniqueKey)
    list.push({
      id: Number(row.id || 0),
      providerCode: `${row.providerCode || 'other'}`.trim() || 'other',
      modelKey: `${row.modelKey || modelName}`.trim() || modelName,
      modelName,
      isActive: !!row.isActive,
      isRecommended: !!row.isRecommended,
      sortNo: Number.isFinite(Number(row.sortNo)) ? Number(row.sortNo) : 999
    })
  })
  return list
}

const modelViewKey = (prefix: string, model: AiModelItem): string => {
  const provider = `${model.providerCode || 'other'}`.trim() || 'other'
  const key = `${model.modelKey || model.modelName || model.id || 'unknown'}`.trim()
  return `${prefix}-${provider}-${key}`
}

const isModelSelected = (model: AiModelItem): boolean => {
  if (form.modelId && model.id > 0) return form.modelId === model.id
  return form.model === model.modelName
}

const pickModel = (model: AiModelItem, closeAfter = false) => {
  form.modelId = model.id > 0 ? model.id : null
  form.model = model.modelName
  if (closeAfter) closeModelSheet()
}

const openModelSheet = () => {
  modelPopup.value?.open()
}

const closeModelSheet = () => {
  modelPopup.value?.close()
  modelKeyword.value = ''
}

const onPopupChange = (e: { show: boolean }) => {
  if (!e.show) modelKeyword.value = ''
}

const loadModelCatalog = async () => {
  try {
    const list = await getModelList({ active: 1, limit: 500 })
    modelCatalog.value = dedupeModels(Array.isArray(list) ? list : [])
  } catch {
    modelCatalog.value = [...fallbackModelList]
  }
}


const reactionToStatus = (reaction: string): 'success' | 'normal' | 'fail' => {
  if (reaction === 'worth' || reaction === 'addicted') return 'success'
  if (reaction === 'regret') return 'fail'
  return 'normal'
}

/* ── editor ── */
const onEditorReady = () => {
  uni.createSelectorQuery()
    .select('#rec-editor')
    .context((res: any) => { editorCtx.value = res?.context ?? null })
    .exec()
}

const onEditorInput = (e: any) => {
  const d = e?.detail ?? {}
  form.content = d.html ?? ''
  form.text = (d.text ?? '').trim()
}

const onEditorStatusChange = (e: any) => {
  formats.value = e?.detail ?? {}
}

const ensureEditor = () => {
  if (editorCtx.value) return true
  uni.showToast({ title: '编辑器初始化中', icon: 'none' })
  return false
}

/* ── formatting ── */
const toggleFormatBar = () => { showFormatBar.value = !showFormatBar.value }
const applyFormat = (name: string, value?: string | number | boolean) => { if (ensureEditor()) editorCtx.value.format(name, value) }
const undo = () => { if (ensureEditor()) editorCtx.value.undo() }
const redo = () => { if (ensureEditor()) editorCtx.value.redo() }
const removeFormat = () => { if (ensureEditor()) editorCtx.value.removeFormat() }

/* ── reactions ── */
const toggleReaction = (key: string) => {
  form.reaction = form.reaction === key ? '' : key
}

/* ── images ── */
const addImage = () => {
  uni.chooseImage({
    count: 9 - form.images.length,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => { form.images.push(...res.tempFilePaths) },
  })
}

const removeImage = (idx: number) => { form.images.splice(idx, 1) }

const onEmoji = () => uni.showToast({ title: '表情功能开发中', icon: 'none' })

const uploadFeedImages = async (usageRecordId: number, localPaths: string[]) => {
  const urls: string[] = []

  for (let i = 0; i < localPaths.length; i += 1) {
    const uploaded = await uploadImageFile({
      filePath: localPaths[i],
      usage: 'feed_image',
      usageRecordId,
      index: i + 1
    })
    urls.push(uploaded.imageUrl)
  }

  return urls
}

/* ── nav ── */
const goBack = () => {
  if (!hasContent.value) {
    uni.navigateBack()
    return
  }
  uni.showModal({
    title: '确认离开？',
    content: '内容未保存，离开后将丢失',
    confirmText: '离开',
    confirmColor: '#E45C1A',
    success: (res) => { if (res.confirm) uni.navigateBack() }
  })
}

const publish = () => {
  if (publishing.value) return
  if (!canPublish.value) {
    uni.showToast({ title: '请选择模型并填写内容', icon: 'none' })
    return
  }

  if (!requireLogin(userStore.token, '发布内容')) return

  const doSubmit = async () => {
    const noteText = form.text.trim()
    if (noteText.length > 2000) {
      uni.showToast({ title: '内容最多 2000 字', icon: 'none' })
      return
    }

    publishing.value = true
    uni.showLoading({ title: '发布中...' })
    try {
      const toNumber = (raw: string): number | undefined => {
        if (!raw) return undefined
        const n = Number(raw)
        if (!Number.isFinite(n) || n < 0) return undefined
        return n
      }

      const maybeSkillId = skillId.value ? Number(skillId.value) : undefined

      const reaction = form.reaction ? (form.reaction as FeedReaction) : undefined

      const feedPost = await createFeedPost({
        skillId: Number.isInteger(maybeSkillId) && (maybeSkillId as number) > 0 ? maybeSkillId : undefined,
        modelId: form.modelId ?? undefined,
        modelName: form.model,
        totalTokens: toNumber(form.tokens),
        costAmount: toNumber(form.cost),
        reaction,
        noteText,
        images: []
      })

      const usageRecordId = Number(feedPost?.id)
      if (Number.isInteger(usageRecordId) && usageRecordId > 0 && form.images.length > 0) {
        try {
          const imageUrls = await uploadFeedImages(usageRecordId, form.images)
          await updateFeedPostImages(usageRecordId, { images: imageUrls })
        } catch {
          uni.showToast({ title: '图片上传失败，已发布文字内容', icon: 'none' })
        }
      }

      if (skillId.value && Number.isInteger(usageRecordId) && usageRecordId > 0) {
        try {
          await createSkillFeedback(skillId.value, {
            status: reactionToStatus(form.reaction),
            comment: noteText,
            usageRecordId,
            modelName: form.model,
            totalTokens: toNumber(form.tokens),
            costAmount: toNumber(form.cost),
            isPublic: true
          })
        } catch {
          // 记录已发布，Skill 反馈写入失败不影响主流程
        }
      }

      uni.setStorageSync(FEED_POST_PUBLISHED_KEY, { id: usageRecordId, publishedAt: Date.now() })
      uni.hideLoading()
      uni.showToast({ title: '发布成功', icon: 'success' })
      setTimeout(() => uni.navigateBack(), 800)
    } catch {
      uni.hideLoading()
      uni.showToast({ title: '发布失败，请稍后重试', icon: 'none' })
    } finally {
      publishing.value = false
    }
  }

  void doSubmit()
}

onLoad((query: any) => {
  skillId.value = `${query?.skillId || ''}`.replace(/[^0-9]/g, '')
  void loadModelCatalog()
})

onShow(() => {
  void loadModelCatalog()
})
</script>

<style lang="scss" scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--card-bg);
  font-family: 'PingFang SC', 'Hiragino Sans GB', sans-serif;
}

/* ── top bar ── */
.top-bar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 24rpx 16rpx;
  flex-shrink: 0;
}

/* #ifndef H5 */
.top-bar {
  padding-top: calc(20rpx + constant(safe-area-inset-top));
  padding-top: calc(20rpx + env(safe-area-inset-top));
}

/* #endif */

/* #ifdef H5 */
.top-bar {
  padding-top: calc(20rpx + var(--h5-safe-area-inset-top, 0px));
}

/* #endif */

.top-cancel {
  font-size: 30rpx;
  color: var(--text-gray);
  font-weight: 500;
  position: relative;
  z-index: 1;
}

.top-title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 34rpx;
  color: var(--text-color);
  font-weight: 700;
  line-height: 1;
  pointer-events: none;
}

.btn-pub {
  position: relative;
  z-index: 1;
  height: 60rpx;
  min-width: 120rpx;
  padding: 0 32rpx;
  border-radius: 100rpx;
  background: rgba(91, 91, 214, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  .btn-pub-t {
    font-size: 26rpx;
    font-weight: 700;
    line-height: 1;
    white-space: nowrap;
    color: rgba(91, 91, 214, 0.45);
  }

  &.on {
    background: var(--primary-color);

    .btn-pub-t {
      color: var(--card-bg);
    }
  }
}

/* ── body ── */
.body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* ── editor ── */
.content-ed {
  width: 100%;
  min-height: 280rpx;
  padding: 20rpx 28rpx;
  font-size: 30rpx;
  line-height: 1.75;
  color: var(--text-primary);
  box-sizing: border-box;
}

.divider {
  height: 1rpx;
  background: rgba(0, 0, 0, 0.06);
  margin: 0 28rpx;
}

/* ── media grid ── */
.media-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
  padding: 20rpx 28rpx;
}

.m-cell {
  position: relative;
  width: 200rpx;
  height: 200rpx;
  border-radius: 16rpx;
  overflow: hidden;
  flex-shrink: 0;

  .m-img {
    width: 100%;
    height: 100%;
    display: block;
  }

  .m-del {
    position: absolute;
    top: 8rpx;
    right: 8rpx;
    width: 40rpx;
    height: 40rpx;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;

    .m-x {
      font-size: 28rpx;
      color: #FFF;
      line-height: 1;
      margin-top: -2rpx;
    }
  }
}

.m-add {
  width: 200rpx;
  height: 200rpx;
  border-radius: 16rpx;
  background: var(--bg-secondary);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  flex-shrink: 0;

  .m-plus {
    font-size: 48rpx;
    color: #AAACB0;
    line-height: 1;
    font-weight: 300;
  }

  .m-lbl {
    font-size: 22rpx;
    color: #AAACB0;
  }
}

/* ── meta sections ── */
.meta-section {
  padding: 20rpx 28rpx 0;
}

.meta-section-btm {
  padding-bottom: 28rpx;
}

.meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.meta-label {
  font-size: 24rpx;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.55);
}

.meta-hint {
  font-size: 22rpx;
  color: #C8CACC;
}

.meta-selected {
  font-size: 22rpx;
  font-weight: 700;
  color: var(--primary-color);
  max-width: 280rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta-row-right {
  display: inline-flex;
  align-items: center;
  gap: 14rpx;
}

.meta-link {
  font-size: 22rpx;
  font-weight: 600;
  color: var(--primary-color);
}

.model-block {
  margin-bottom: 12rpx;
}

.model-block-t {
  display: block;
  font-size: 20rpx;
  color: var(--text-muted);
  margin-bottom: 10rpx;
}

/* ── model / scene chips ── */
.scene-scroll {
  width: 100%;
}

.scene-list {
  display: inline-flex;
  gap: 12rpx;
  padding-bottom: 20rpx;
}

.scene-chip {
  display: inline-flex;
  align-items: center;
  height: 60rpx;
  padding: 0 22rpx;
  border-radius: 12rpx;
  background: rgba(0, 0, 0, 0.04);
  border: 1rpx solid rgba(0, 0, 0, 0.08);
  white-space: nowrap;
  flex-shrink: 0;

  .scene-chip-t {
    font-size: 24rpx;
    font-weight: 600;
    color: rgba(0, 0, 0, 0.55);
  }

  &.on {
    background: var(--primary-light-10);
    border-color: rgba(91, 91, 214, 0.30);

    .scene-chip-t {
      color: var(--primary-color);
    }
  }
}

/* ── model sheet (uni-popup 内容) ── */
.ms-wrap {
  width: 100%;
  display: flex;
  flex-direction: column;
  background: var(--card-bg);
  border-radius: 32rpx 32rpx 0 0;
  /* 最大高度由内容撑开，scroll-view 限高 */
}

/* 拖拽条 */
.ms-handle {
  width: 56rpx;
  height: 6rpx;
  border-radius: 999rpx;
  background: rgba(0, 0, 0, 0.10);
  margin: 14rpx auto 8rpx;
  flex-shrink: 0;
}

/* 头部 */
.ms-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8rpx 28rpx 16rpx;
}

.ms-hd-left {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
}

.ms-title {
  font-size: 34rpx;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.5rpx;
}

.ms-count {
  font-size: 22rpx;
  color: var(--text-muted);
}

.ms-close {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.055);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  .ms-close-t {
    font-size: 32rpx;
    color: var(--text-muted);
    line-height: 1;
    margin-top: -2rpx;
  }
}

/* 搜索栏容器（加水平 padding，让输入框有呼吸感） */
.ms-search-wrap {
  padding: 0 20rpx 16rpx;
}

.ms-search {
  height: 76rpx;
  border-radius: 20rpx;
  background: var(--bg-secondary, rgba(0, 0, 0, 0.045));
  border: 1.5rpx solid rgba(0, 0, 0, 0.07);
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 0 20rpx;
}

.ms-search-inp {
  flex: 1;
  font-size: 27rpx;
  color: var(--text-primary);
  height: 100%;
  line-height: 76rpx;
}

.ms-search-ph { color: #C0C4CC; font-size: 27rpx; }

.ms-search-clear {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* 列表区（高度固定，内部滚动） */
.ms-body {
  height: 54vh;
  padding: 0 20rpx;
  box-sizing: border-box;
}

/* 厂商分组 */
.ms-group {
  padding: 16rpx 0 12rpx;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.05);

  &:last-child { border-bottom: none; }
}

.ms-group-hd {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 16rpx;
}

.ms-group-dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background: var(--primary-color);
  opacity: 0.5;
  flex-shrink: 0;
}

.ms-group-name {
  font-size: 23rpx;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.40);
  letter-spacing: 0.3rpx;
}

.ms-group-cnt {
  font-size: 20rpx;
  color: rgba(0, 0, 0, 0.22);
  margin-left: 2rpx;
}

/* 模型 chip 网格 */
.ms-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.ms-cell {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  height: 60rpx;
  padding: 0 18rpx;
  border-radius: 999rpx;
  background: rgba(0, 0, 0, 0.035);
  border: 1.5rpx solid rgba(0, 0, 0, 0.08);

  .ms-cell-name {
    font-size: 24rpx;
    font-weight: 600;
    color: rgba(0, 0, 0, 0.52);
  }

  .ms-cell-badge {
    font-size: 18rpx;
    font-weight: 700;
    color: var(--accent-color);
    background: rgba(255, 122, 69, 0.12);
    border-radius: 100rpx;
    padding: 2rpx 10rpx;
    line-height: 1.6;
  }

  .ms-cell-check {
    width: 30rpx;
    height: 30rpx;
    border-radius: 50%;
    background: var(--primary-color);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    .ms-cell-check-t {
      font-size: 17rpx;
      color: #fff;
      font-weight: 900;
      line-height: 1;
    }
  }

  &.on {
    background: rgba(91, 91, 214, 0.09);
    border-color: rgba(91, 91, 214, 0.28);

    .ms-cell-name {
      color: var(--primary-color);
      font-weight: 700;
    }
  }
}

/* 空状态 */
.ms-empty {
  padding: 80rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ms-empty-t {
  font-size: 26rpx;
  color: var(--text-muted);
}

/* 底部安全区留白 */
.ms-gap {
  height: 16rpx;
}

/* ── cost row ── */
.cost-row {
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 16rpx;
  padding: 0 16rpx;
  height: 88rpx;
  margin-bottom: 20rpx;
}

.cost-box {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.cost-pre {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--orange-color);
  flex-shrink: 0;
}

.cost-suf {
  font-size: 22rpx;
  color: var(--text-muted);
  flex-shrink: 0;
}

.cost-inp {
  flex: 1;
  font-size: 26rpx;
  color: var(--text-primary);
  height: 60rpx;
}

.cost-bar {
  width: 1rpx;
  height: 40rpx;
  background: rgba(0, 0, 0, 0.10);
  margin: 0 16rpx;
  flex-shrink: 0;
}

/* ── reactions ── */
.rxn-row {
  display: flex;
  gap: 12rpx;
  margin-bottom: 4rpx;
}

.rxn-chip {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 18rpx 0;
  border-radius: 18rpx;
  background: rgba(0, 0, 0, 0.04);
  border: 2rpx solid transparent;

  .rxn-ico {
    flex-shrink: 0;
  }

  .rxn-lab {
    font-size: 20rpx;
    color: rgba(0, 0, 0, 0.50);
    font-weight: 600;
  }

  &.on .rxn-lab {
    font-weight: 700;
  }
}

.body-gap {
  height: calc(200rpx + env(safe-area-inset-bottom));
}

/* ── formatting bar ── */
.format-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(96rpx + env(safe-area-inset-bottom));
  height: 80rpx;
  background: rgba(248, 248, 250, 0.98);
  border-top: 1rpx solid rgba(0, 0, 0, 0.07);
  display: flex;
  align-items: center;
  padding: 0 12rpx;
  gap: 4rpx;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.04);
  z-index: 10;
}

.fb-btn {
  height: 60rpx;
  min-width: 60rpx;
  padding: 0 14rpx;
  border-radius: 10rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  .fb-t {
    font-size: 24rpx;
    font-weight: 700;
    color: rgba(0, 0, 0, 0.60);
  }

  .fb-bold {
    font-weight: 900;
  }

  .fb-italic {
    font-style: italic;
  }

  .fb-ul {
    text-decoration: underline;
  }

  .fb-clr {
    font-size: 20rpx;
    color: rgba(0, 0, 0, 0.40);
  }

  &.on {
    background: var(--primary-light-12);

    .fb-t {
      color: var(--primary-color);
    }
  }
}

.fb-sep {
  width: 1rpx;
  height: 36rpx;
  background: rgba(0, 0, 0, 0.10);
  margin: 0 6rpx;
  flex-shrink: 0;
}

/* ── bottom toolbar ── */
.btm-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: calc(96rpx + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: rgba(255, 255, 255, 0.97); /* card-bg with slight transparency */
  border-top: 1rpx solid rgba(0, 0, 0, 0.07);
  display: flex;
  align-items: center;
}

.btm-icons {
  display: flex;
  align-items: center;
  padding: 0 8rpx;
  gap: 4rpx;
}

.bi {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;

  &.bi-act {
    background: var(--primary-light-10);
  }
}
</style>
