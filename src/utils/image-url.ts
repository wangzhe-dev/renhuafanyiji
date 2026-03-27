import { apiPrefix } from '@/config'

const PROXY_HOST_ALLOWLIST = new Set(['file.shaobuqi.com'])

const safeParseUrl = (raw: string): URL | null => {
  try {
    return new URL(raw)
  } catch {
    return null
  }
}

export const normalizeImageUrl = (raw: string | null | undefined): string => {
  const value = `${raw || ''}`.trim()
  if (!value) return ''

  const parsed = safeParseUrl(value)
  if (!parsed) return value

  if (
    typeof window !== 'undefined' &&
    window.location?.protocol === 'https:' &&
    parsed.protocol === 'http:' &&
    PROXY_HOST_ALLOWLIST.has(parsed.hostname.toLowerCase())
  ) {
    return `/${apiPrefix}/uploads/proxy?url=${encodeURIComponent(parsed.toString())}`
  }

  return parsed.toString()
}

