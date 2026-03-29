const cloud = require('wx-server-sdk')
const tcb = require('@cloudbase/node-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 提取核心吐槽：取第一个完整句，最多 28 字
function extractPunchline(humanText) {
  if (!humanText) return ''
  return humanText
    .replace(/[""''「」【】《》]/g, '')
    .split(/[。！？!?\n]/)[0]
    .trim()
    .slice(0, 28)
}

// 动漫讽刺插画 prompt
function buildPrompt(sceneId, punchline) {
  const p = punchline || '现实就这样'
  const style = '日系黑色幽默动漫风格，夸张表情，大眼睛，鲜明轮廓线，高饱和度色彩，manga漫画分镜感'
  const TEMPLATES = {
    work: `${style}，场景：格子间办公室，`
      + `主角：精疲力竭的社畜，白眼上翻眼神涣散趴在键盘上，屏幕发蓝光全是改不完的PPT，`
      + `背后：西装领导满脸假笑拍肩膀，手背后藏着文件，`
      + `情绪基调："${p}"，暖橙黄背景`,

    agent: `${style}，场景：破旧出租屋，`
      + `主角：油腻中介张开双臂假笑介绍，墙皮大块脱落天花板滴水，`
      + `配角：租客瞪大眼睛张嘴惊叫向后跳，`
      + `情绪基调："${p}"，暖色系背景`,

    date: `${style}，场景：咖啡馆相亲，`
      + `主角一：低头90度刷手机嘴角冷笑，眼神完全不在对方身上，`
      + `主角二：抱着玫瑰满眼爱心期待，两人气氛反差强烈，`
      + `情绪基调："${p}"，粉色系背景`,

    client: `${style}，场景：会议室，`
      + `主角：西装甲方踩上椅子指着屏幕大吼，表情傲慢，`
      + `配角：乙方90度鞠躬点头冒汗，身后堆着高过天花板的修改稿纸山，`
      + `情绪基调："${p}"，暖黄背景`,

    hr: `${style}，场景：面试室，`
      + `主角：HR端着职业假笑递出offer，眼角下垂，背后巨大剪刀清晰可见，`
      + `配角：求职者眼睛变成星星兴奋接过offer，对危险毫不知情，`
      + `情绪基调："${p}"，暖色背景`
  }
  return TEMPLATES[sceneId]
    || `${style}，黑色幽默讽刺场景，人物表情极度夸张，情绪基调："${p}"，暖色背景`
}

exports.main = async (event) => {
  const { sceneId, humanText } = event
  const requestId = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

  const punchline = extractPunchline(humanText)
  const prompt = buildPrompt(sceneId, punchline)

  console.log('[generate_image] start', { requestId, sceneId, punchline, prompt })

  try {
    const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
    const imageModel = app.ai().createImageModel('hunyuan-image')

    const res = await imageModel.generateImage({ model: 'hunyuan-image', prompt })

    console.log('[generate_image] raw response', { requestId, res: JSON.stringify(res) })

    const { data, error } = res

    if (error) {
      console.error('[generate_image] model error', { requestId, error })
      return { success: false, code: error.code || 'MODEL_ERROR', message: error.message || '模型返回错误' }
    }

    const imageUrl = data?.[0]?.url || ''
    if (!imageUrl) {
      return { success: false, code: 'NO_URL', message: '模型未返回图片地址，请查看日志确认响应格式' }
    }

    const revised_prompt = data?.[0]?.revised_prompt || ''
    console.log('[generate_image] success', { requestId, imageUrl })
    return { success: true, imageUrl, revised_prompt }
  } catch (err) {
    const msg = `${err?.message || err || ''}`
    console.error('[generate_image] error', { requestId, msg, err: JSON.stringify(err) })

    if (/quota|limit|exceed/i.test(msg))
      return { success: false, code: 'QUOTA', message: '文生图额度已用完' }
    if (/timeout|超时/i.test(msg))
      return { success: false, code: 'TIMEOUT', message: '生成超时，请重试' }

    return { success: false, code: 'UNKNOWN', message: msg.slice(0, 100) || '未知错误' }
  }
}
