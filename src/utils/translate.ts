import type { TranslationBreakdown, TranslationResult } from '@/config/scenes'

type AnyRecord = Record<string, unknown>

function isRecord(value: unknown): value is AnyRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function parseJsonLikeString(content: string): AnyRecord | null {
  const raw = content.trim()
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as unknown
    return isRecord(parsed) ? parsed : null
  } catch {
    // continue
  }

  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  if (!cleaned) return null

  try {
    const parsed = JSON.parse(cleaned) as unknown
    return isRecord(parsed) ? parsed : null
  } catch {
    // continue
  }

  const match = cleaned.match(/\{[\s\S]*\}/)
  if (!match) return null

  try {
    const parsed = JSON.parse(match[0]) as unknown
    return isRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

function coerceString(value: unknown): string | null {
  if (typeof value === 'string') {
    const text = value.trim()
    return text ? text : null
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => {
        if (typeof item === 'string') return item.trim()
        if (isRecord(item)) return coerceString(item.text ?? item.content ?? item.value) ?? ''
        return ''
      })
      .filter(Boolean)

    return parts.length ? parts.join('\n') : null
  }

  if (isRecord(value)) {
    return coerceString(value.text ?? value.content ?? value.value ?? value.message)
  }

  return null
}

function pickString(record: AnyRecord, keys: string[]): string | null {
  for (const key of keys) {
    const text = coerceString(record[key])
    if (text) return text
  }
  return null
}

function pushBreakdown(list: TranslationBreakdown[], from: unknown, to: unknown) {
  const toText = coerceString(to)
  if (!toText) return
  const fromText = coerceString(from) ?? '原句'
  list.push({ from: fromText, to: toText })
}

function parseBreakdownLine(list: TranslationBreakdown[], line: string) {
  const pair = line.match(/^(.+?)(?:->|=>|→|:|：|=)(.+)$/)
  if (pair) {
    pushBreakdown(list, pair[1], pair[2])
  } else {
    pushBreakdown(list, '原句', line)
  }
}

function normalizeBreakdown(value: unknown): TranslationBreakdown[] {
  const list: TranslationBreakdown[] = []

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string') {
        parseBreakdownLine(list, item)
        continue
      }
      if (!isRecord(item)) continue
      pushBreakdown(
        list,
        item.from ?? item.source ?? item.term ?? item.keyword ?? item.key,
        item.to ?? item.target ?? item.meaning ?? item.explain ?? item.translation ?? item.value ?? item.text
      )
    }
    return list.slice(0, 12)
  }

  if (isRecord(value)) {
    for (const [from, to] of Object.entries(value)) {
      pushBreakdown(list, from, to)
    }
    return list.slice(0, 12)
  }

  const text = coerceString(value)
  if (!text) return []

  for (const line of text.split(/\n+/).map((item) => item.trim()).filter(Boolean)) {
    parseBreakdownLine(list, line)
  }

  return list.slice(0, 12)
}

function normalizeFromRecord(record: AnyRecord): TranslationResult | null {
  const humanText = pickString(record, [
    'humanText',
    'human_text',
    'human',
    'translation',
    'translatedText',
    'rewrite',
    'output',
    'answer'
  ])

  if (!humanText) return null

  return {
    humanText,
    breakdown: normalizeBreakdown(record.breakdown ?? record.explain ?? record.explanation ?? record.details)
  }
}

function extractChoicesContent(record: AnyRecord): unknown {
  const choices = record.choices
  if (!Array.isArray(choices) || choices.length === 0) return null
  const first = choices[0]
  if (!isRecord(first)) return null

  if (isRecord(first.message)) {
    return first.message.content ?? first.message.text
  }
  return first.content ?? first.text
}

function normalizeTranslationResultInternal(payload: unknown, depth: number): TranslationResult | null {
  if (depth > 6 || payload == null) return null

  if (typeof payload === 'string') {
    const parsed = parseJsonLikeString(payload)
    if (parsed) {
      return normalizeTranslationResultInternal(parsed, depth + 1)
    }

    const cleaned = payload.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
    if (!cleaned) return null
    return {
      humanText: cleaned,
      breakdown: []
    }
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const normalized = normalizeTranslationResultInternal(item, depth + 1)
      if (normalized) return normalized
    }
    return null
  }

  if (!isRecord(payload)) return null

  const direct = normalizeFromRecord(payload)
  if (direct) return direct

  for (const key of ['data', 'result', 'output', 'message', 'payload']) {
    if (!(key in payload)) continue
    const normalized = normalizeTranslationResultInternal(payload[key], depth + 1)
    if (normalized) return normalized
  }

  const choiceContent = extractChoicesContent(payload)
  if (choiceContent != null) {
    const normalized = normalizeTranslationResultInternal(choiceContent, depth + 1)
    if (normalized) return normalized
  }

  const fallbackText = pickString(payload, ['content', 'text'])
  if (!fallbackText) return null
  return normalizeTranslationResultInternal(fallbackText, depth + 1)
}

export function parseTranslationResult(content: string): TranslationResult | null {
  const parsed = parseJsonLikeString(content)
  if (!parsed) return null
  return normalizeTranslationResultInternal(parsed, 0)
}

export function normalizeTranslationResult(payload: unknown): TranslationResult | null {
  return normalizeTranslationResultInternal(payload, 0)
}
