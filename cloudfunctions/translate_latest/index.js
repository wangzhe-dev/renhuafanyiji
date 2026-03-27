const cloud = require('wx-server-sdk')
const tcb = require('@cloudbase/node-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const app = tcb.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const aiModel = app.ai().createModel('hunyuan-exp')
const BUILD_TAG = 'translate_latest-2026-03-27-2035'

exports.main = async (event) => {
  const { text, sceneId, systemPrompt } = event
  const temperature = normalizeTemperature(event?.temperature)
  const requestId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const wxContext = cloud.getWXContext()
  const envId = wxContext?.ENV || process.env.TCB_ENV || process.env.SCF_NAMESPACE || 'unknown-env'

  console.log('[translate] request received', {
    requestId,
    envId,
    sceneId,
    textLength: typeof text === 'string' ? text.length : 0,
    systemPromptLength: typeof systemPrompt === 'string' ? systemPrompt.length : 0,
    temperature
  })

  // 校验
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return { error: '请输入要翻译的文本' }
  }
  if (!sceneId || typeof sceneId !== 'string') {
    return { error: '缺少场景标识' }
  }
  if (!systemPrompt || typeof systemPrompt !== 'string') {
    return { error: '缺少系统提示词' }
  }
  if (text.length > 500) {
    return { error: '文本不能超过500字' }
  }

  if (isLikelyLocalDebug(envId)) {
    return {
      error:
        '检测到本地云函数调试环境，AI 调用需要云端凭证。请关闭本地调试，上传并部署 translate（云端安装依赖）后再试。'
    }
  }

  try {
    console.log('[translate] calling model', {
      requestId,
      provider: 'hunyuan-exp',
      model: 'hunyuan-turbos-latest',
      temperature
    })
    const res = await withTimeout(
      aiModel.generateText({
        model: 'hunyuan-turbos-latest',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        temperature,
        max_tokens: 1024
      }),
      25000,
      'AI 模型调用超时，请检查网络和云端环境'
    )

    const content = extractTextContent(res)
    const usage = extractUsage(res)
    console.log('[translate] model returned', {
      requestId,
      envId,
      choicesCount: Array.isArray(res.choices) ? res.choices.length : 0,
      contentLength: typeof content === 'string' ? content.length : 0,
      usage
    })

    // 解析 JSON（容错处理）
    const parsed = parseAIResponse(content)
    if (!parsed) {
      // 兜底：AI 没有按 JSON 格式输出，把原始文本作为 humanText 返回
      if (content && content.trim().length > 0) {
        return {
          humanText: content.trim(),
          score: 50,
          verdict: '未知浓度',
          breakdown: [],
          _debug: { requestId, envId, usage, temperature },
          debugInfo: {
            build: BUILD_TAG,
            requestId,
            envId,
            usage,
            temperature,
            systemPromptLength: systemPrompt.length
          }
        }
      }
      return { error: 'AI 没有返回有效内容，请重试一次' }
    }

    // score 范围校验
    parsed.score = Math.min(100, Math.max(0, Number(parsed.score) || 50))
    console.log('[translate] parsed success', {
      requestId,
      envId,
      hasHumanText: Boolean(parsed.humanText),
      score: parsed.score,
      usage
    })

    return {
      ...parsed,
      _debug: { requestId, envId, usage, temperature },
      debugInfo: {
        build: BUILD_TAG,
        requestId,
        envId,
        usage,
        temperature,
        systemPromptLength: systemPrompt.length
      }
    }
  } catch (err) {
    console.error('[translate] error', { requestId, err })
    return { error: normalizeTranslateError(err) }
  }
}

function normalizeTranslateError(err) {
  const message = `${err?.errMsg || err?.message || err || ''}`

  if (!message) {
    return '云函数执行失败，请稍后重试'
  }

  if (/missing secretId or secretKey|secret id error/i.test(message)) {
    return '当前是本地云函数调试环境，缺少云端凭证。请改为云端函数运行（不要本地调试）。'
  }

  if (/AI能力|ai.*not.*open|not.*activated/i.test(message)) {
    return 'AI 能力未开通，请先参加 AI 小程序成长计划'
  }

  if (/timeout|超时/i.test(message)) {
    return '云函数超时，请到云开发控制台把 translate 超时时间改到 60 秒'
  }

  if (/hunyuan|model/i.test(message)) {
    return '混元模型调用失败，请确认 AI 配额和模型权限已开通'
  }

  if (/permission|auth|unauthorized|forbidden/i.test(message)) {
    return '云函数权限不足，请确认当前环境和账号权限正确'
  }

  return `云函数报错：${message.slice(0, 120)}`
}

function parseAIResponse(content) {
  try {
    // 尝试直接解析
    return JSON.parse(content)
  } catch {
    // 去除 ```json``` 包裹
    const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
    try {
      return JSON.parse(cleaned)
    } catch {
      // 尝试匹配花括号
      const match = cleaned.match(/\{[\s\S]*\}/)
      if (match) {
        try {
          return JSON.parse(match[0])
        } catch {
          return null
        }
      }
      return null
    }
  }
}

function extractTextContent(res) {
  if (res && typeof res.text === 'string' && res.text.trim()) {
    return res.text
  }

  if (res && Array.isArray(res.messages) && res.messages.length > 0) {
    const last = res.messages[res.messages.length - 1]
    if (last && typeof last.content === 'string' && last.content.trim()) {
      return last.content
    }
  }

  if (res && Array.isArray(res.choices) && res.choices.length > 0) {
    const content = res.choices[0]?.message?.content
    if (typeof content === 'string' && content.trim()) {
      return content
    }
  }

  return ''
}

function extractUsage(res) {
  if (res && typeof res === 'object') {
    if (res.usage && typeof res.usage === 'object') return res.usage

    const firstChoice = Array.isArray(res.choices) ? res.choices[0] : null
    if (firstChoice && typeof firstChoice === 'object' && firstChoice.usage) {
      return firstChoice.usage
    }

    const firstRaw = Array.isArray(res.rawResponses) ? res.rawResponses[0] : null
    if (firstRaw && typeof firstRaw === 'object' && firstRaw.usage) {
      return firstRaw.usage
    }

    if (firstChoice && typeof firstChoice === 'object' && firstChoice.rawResponse?.usage) {
      return firstChoice.rawResponse.usage
    }
  }
  return null
}

function normalizeTemperature(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0.35
  return Math.min(1, Math.max(0, num))
}

function isLikelyLocalDebug(envId) {
  // 本地调试下通常拿不到真实环境与临时凭证，调用 AI 会卡住或报 secret 错误
  const hasSecret = Boolean(process.env.TENCENTCLOUD_SECRETID && process.env.TENCENTCLOUD_SECRETKEY)
  return envId === 'unknown-env' || !hasSecret
}

function withTimeout(promise, timeoutMs, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), timeoutMs)
    })
  ])
}
