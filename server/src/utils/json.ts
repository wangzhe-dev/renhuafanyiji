export const safeParseJson = <T>(value: unknown, fallback: T): T => {
  if (value === null || value === undefined) return fallback

  if (typeof value === 'object') {
    return value as T
  }

  if (typeof value !== 'string') return fallback

  const trimmed = value.trim()
  if (!trimmed) return fallback

  try {
    return JSON.parse(trimmed) as T
  } catch {
    return fallback
  }
}

export const stringifyJson = (value: unknown): string | null => {
  if (value === undefined) return null
  if (value === null) return null
  return JSON.stringify(value)
}
