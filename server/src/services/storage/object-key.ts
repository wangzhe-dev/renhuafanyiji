export type UploadUsage = 'skill_cover' | 'skill_content' | 'user_avatar' | 'feed_image' | 'draft_image'

type BuildObjectKeyInput = {
  usage: UploadUsage
  userId: number
  extension: string
  skillId?: number
  usageRecordId?: number
  draftId?: number
  index?: number
}

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/bmp': 'bmp',
  'image/tiff': 'tiff',
  'image/svg+xml': 'svg',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/avif': 'avif'
}

const normalizeExtension = (ext: string): string => {
  const normalized = ext.toLowerCase().replace(/[^a-z0-9]/g, '')
  return normalized || 'bin'
}

export const resolveImageExtension = (mimeType: string, originalName: string): string => {
  const byMime = MIME_EXTENSION_MAP[mimeType.toLowerCase()]
  if (byMime) return byMime

  const byName = originalName.trim().toLowerCase().match(/\.([a-z0-9]+)$/)?.[1]
  if (byName) return normalizeExtension(byName)

  return 'bin'
}

export const buildObjectKey = (input: BuildObjectKeyInput): string => {
  const ext = normalizeExtension(input.extension)
  const index = Number.isInteger(input.index) && (input.index as number) > 0 ? (input.index as number) : 1

  if (input.usage === 'skill_cover') {
    if (!input.skillId) throw new Error('skillId is required for skill_cover upload')
    return `skills/${input.skillId}/cover.${ext}`
  }

  if (input.usage === 'skill_content') {
    if (!input.skillId) throw new Error('skillId is required for skill_content upload')
    return `skills/${input.skillId}/content-${index}.${ext}`
  }

  if (input.usage === 'user_avatar') {
    return `users/${input.userId}/avatar.${ext}`
  }

  if (input.usage === 'feed_image') {
    if (!input.usageRecordId) throw new Error('usageRecordId is required for feed_image upload')
    return `feed/${input.usageRecordId}/${index}.${ext}`
  }

  if (!input.draftId) throw new Error('draftId is required for draft_image upload')
  return `drafts/${input.userId}/${input.draftId}/tmp-${index}.${ext}`
}
