const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event) => {
  const { text, sceneId, systemPrompt } = event

  // 校验
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return { error: '请输入要翻译的文本' }
  }
  if (text.length > 500) {
    return { error: '文本不能超过500字' }
  }

  try {
    const ai = cloud.getAI()
    const res = await ai.createCompletion({
      model: 'hunyuan-lite',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      temperature: 0.8,
      max_tokens: 1024
    })

    const content = res.choices?.[0]?.message?.content || ''

    // 解析 JSON（容错处理）
    const parsed = parseAIResponse(content)
    if (!parsed) {
      return {
        humanText: '翻译官罢工了，请再试一次～',
        score: 50,
        verdict: '解析失败',
        breakdown: []
      }
    }

    // score 范围校验
    parsed.score = Math.min(100, Math.max(0, Number(parsed.score) || 50))

    return parsed
  } catch (err) {
    console.error('translate error:', err)
    return {
      humanText: '翻译官开小差了，请稍后再试～',
      score: 0,
      verdict: '服务异常',
      breakdown: []
    }
  }
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
