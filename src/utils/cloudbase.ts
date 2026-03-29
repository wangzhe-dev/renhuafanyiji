declare const wx: any

export async function requestTranslation(
  systemPrompt: string,
  userText: string,
  sceneId: string,
  temperature: number
): Promise<any> {
  const functionName = 'translate_latest'
  const cloud = (wx as any)?.cloud
  if (!cloud || typeof cloud.callFunction !== 'function') {
    throw new Error('wx.cloud 不可用，请确认在微信开发者工具运行且 onLaunch 已执行 wx.cloud.init')
  }

  console.log('[cloud] callFunction start', {
    name: functionName,
    sceneId,
    textLength: userText.trim().length
  })

  const res: any = await withTimeout(
    cloud.callFunction({
      name: functionName,
      data: {
        text: userText,
        sceneId,
        systemPrompt,
        temperature
      }
    }),
    30000,
    '云函数调用超时。若你在”本地云函数调试”，请切换为云端函数运行。'
  )

  console.log('[cloud] callFunction done', {
    name: functionName,
    hasResult: Boolean(res?.result),
    hasError: Boolean(res?.result?.error),
    debug: res?.result?._debug ?? null,
    debugInfo: res?.result?.debugInfo ?? null,
    resultKeys: res?.result && typeof res.result === 'object' ? Object.keys(res.result) : []
  })

  const result = res.result
  if (result && result.error) {
    throw new Error(result.error)
  }

  if (
    result &&
    typeof result === 'object' &&
    !Array.isArray(result) &&
    !result._debug &&
    !result.debugInfo
  ) {
    console.warn('[cloud] legacy function response detected: missing debug fields')
  }

  return result
}

export async function requestImageGeneration(sceneId: string, humanText: string): Promise<string> {
  const cloud = (wx as any)?.cloud
  if (!cloud || typeof cloud.callFunction !== 'function') {
    throw new Error('wx.cloud 不可用')
  }
  const res: any = await withTimeout(
    cloud.callFunction({ name: 'generate_image', data: { sceneId, humanText } }),
    60000,
    '图片生成超时，请重试'
  )
  const result = res?.result
  if (!result?.success) throw new Error(result?.message || '生成失败')
  if (!result?.imageUrl) throw new Error('未获取到图片地址')
  return result.imageUrl
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), timeoutMs)
    })
  ])
}
