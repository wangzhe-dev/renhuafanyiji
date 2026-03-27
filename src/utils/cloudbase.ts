export async function requestTranslation(
  systemPrompt: string,
  userText: string,
  sceneId: string
): Promise<any> {
  const functionNames = ['translate_latest', 'translate']
  const cloud = (wx as any)?.cloud
  if (!cloud || typeof cloud.callFunction !== 'function') {
    throw new Error('wx.cloud 不可用，请确认在微信开发者工具运行且 onLaunch 已执行 wx.cloud.init')
  }

  let res: any = null
  let usedFunctionName = ''

  for (const functionName of functionNames) {
    try {
      console.log('[cloud] callFunction start', {
        name: functionName,
        sceneId,
        textLength: userText.trim().length
      })

      res = await withTimeout(
        cloud.callFunction({
          name: functionName,
          data: {
            text: userText,
            sceneId,
            systemPrompt
          }
        }),
        30000,
        '云函数调用超时。若你在“本地云函数调试”，请切换为云端函数运行。'
      )
      usedFunctionName = functionName
      break
    } catch (error: any) {
      const msg = `${error?.errMsg || error?.message || error || ''}`
      const isFunctionNotFound =
        /FUNCTION_NOT_FOUND|FunctionName parameter could not be found|errCode:\s*-501000/i.test(msg)

      if (!isFunctionNotFound || functionName === functionNames[functionNames.length - 1]) {
        throw error
      }

      console.warn(
        `[cloud] function ${functionName} not found, fallback to ${functionNames[functionNames.length - 1]}`
      )
    }
  }

  console.log('[cloud] callFunction done', {
    name: usedFunctionName,
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

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), timeoutMs)
    })
  ])
}
