/// <reference path="../types/express.d.ts" />

import { Router } from 'express'
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { z } from 'zod'
import { env } from '../config'
import { queryRows, withTransaction } from '../db'
import { optionalAuth, requireAuth } from '../middlewares/auth'
import { safeParseJson, stringifyJson } from '../utils/json'
import { buildPaginationMeta, parsePagination } from '../utils/pagination'
import { sendError, sendSuccess } from '../utils/response'

type CountRow = RowDataPacket & { total: number }

type SkillListRow = RowDataPacket & {
  id: number
  title: string
  brief: string | null
  prompt_preview: string | null
  scene: string | null
  publish_at: string | null
  is_featured: number
  copy_count: number
  favorite_count: number
  feedback_count: number
  success_rate: number | null
  avg_total_tokens: number | null
  recommended_model_name: string | null
  common_model_name: string | null
  creator_id: number
  creator_nickname: string
  creator_avatar_url: string | null
  creator_color: string | null
  category_id: number | null
  category_name: string | null
  cover_image: string | null
}

type SkillDetailRow = SkillListRow & {
  status: number
  avg_input_tokens: number | null
  avg_output_tokens: number | null
  estimated_cost_low: number | null
  estimated_cost_high: number | null
  total_uses: number
  week_uses: number
}

type SkillTagRow = RowDataPacket & {
  skill_id: number
  tag_id: number
  tag_name: string
}

type SkillImageRow = RowDataPacket & {
  id: number
  image_url: string
  image_type: 'cover' | 'content'
  sort_no: number
  storage_provider: string | null
  bucket_name: string | null
  object_key: string | null
  mime_type: string | null
  file_size: number | null
  width: number | null
  height: number | null
}

type SkillContentRow = RowDataPacket & {
  id: number
  skill_id: number
  version_no: number
  is_current: number
  prompt: string | null
  system_prompt: string | null
  user_template: string | null
  full_prompt: string | null
  full_prompt_html: string | null
  variable_notes: string | null
  variables_json: unknown
  steps_json: unknown
  use_scenes_json: unknown
  created_at: string
  updated_at: string
}

type SkillFeedbackRow = RowDataPacket & {
  id: number
  status: 'success' | 'normal' | 'fail'
  comment: string
  model_name: string | null
  input_tokens: number | null
  output_tokens: number | null
  total_tokens: number | null
  cost_amount: number | null
  created_at: string
  user_id: number
  user_nickname: string
  user_avatar_url: string | null
  user_color: string | null
}

type SimilarSkillRow = RowDataPacket & {
  id: number
  title: string
  scene: string | null
  avg_total_tokens: number | null
  success_rate: number | null
  copy_count: number
}

type FavoriteRow = RowDataPacket & {
  skill_id: number
}

type ModelLookupRow = RowDataPacket & {
  id: number
  model_name: string
  is_active: number
}

type CreatorProfileRow = RowDataPacket & {
  id: number
  nickname: string
  bio: string | null
  display_color: string | null
  avatar_url: string | null
  published_skill_count: number
  total_copy_count: number
  avg_success_rate: number | null
  follower_count: number
  following_count: number
}

type FollowRow = RowDataPacket & { cnt: number }

type CategoryRow = RowDataPacket & {
  id: number
  name: string
  sort_no: number
}

type TagRow = RowDataPacket & {
  id: number
  name: string
  use_count: number
  category_id: number | null
}

type SkillOwnerRow = RowDataPacket & {
  id: number
  creator_id: number
  status: number
  category_id: number | null
  scene: string | null
}

type MaxVersionRow = RowDataPacket & {
  max_version: number
}

type FeedbackAggRow = RowDataPacket & {
  total: number
  success_total: number | null
}

type SkillImageInput = {
  imageUrl: string
  storageProvider: string | null
  bucketName: string | null
  objectKey: string | null
  mimeType: string | null
  fileSize: number | null
}

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  sort: z.enum(['recommend', 'newest', 'mostCopy', 'lowestToken', 'bestValue', 'highRate']).optional(),
  scene: z.string().trim().max(32).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  creatorId: z.coerce.number().int().positive().optional(),
  keyword: z.string().trim().max(120).optional(),
  tag: z.string().trim().max(32).optional(),
  minSuccessRate: z.coerce.number().min(0).max(100).optional(),
  maxAvgTotalTokens: z.coerce.number().int().positive().optional()
})

const skillImagePayloadSchema = z.string().trim().min(1).max(500).or(
  z.object({
    imageUrl: z.string().trim().min(1).max(500),
    storageProvider: z.string().trim().max(32).optional().nullable(),
    bucketName: z.string().trim().max(64).optional().nullable(),
    objectKey: z.string().trim().max(255).optional().nullable(),
    mimeType: z.string().trim().max(64).optional().nullable(),
    fileSize: z.coerce.number().int().nonnegative().optional().nullable()
  })
)

const skillPayloadSchema = z.object({
  title: z.string().trim().min(1).max(120),
  brief: z.string().trim().max(500).optional().nullable(),
  categoryId: z.coerce.number().int().positive().optional().nullable(),
  scene: z.string().trim().max(32).optional().nullable(),
  status: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional().default(1),
  tags: z.array(z.string().trim().min(1).max(32)).max(10).optional().default([]),

  prompt: z.string().optional().nullable(),
  systemPrompt: z.string().optional().nullable(),
  userTemplate: z.string().optional().nullable(),
  fullPrompt: z.string().optional().nullable(),
  fullPromptHtml: z.string().optional().nullable(),
  variableNotes: z.string().optional().nullable(),
  variables: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(64),
        desc: z.string().trim().max(255).optional().nullable()
      })
    )
    .max(50)
    .optional()
    .default([]),
  steps: z.array(z.string().trim().min(1).max(255)).max(80).optional().default([]),
  useScenes: z.array(z.string().trim().min(1).max(64)).max(50).optional().default([]),

  coverImages: z.array(skillImagePayloadSchema).max(9).optional().default([]),
  contentImages: z.array(skillImagePayloadSchema).max(30).optional().default([]),

  recommendedModelName: z.string().trim().max(64).optional().nullable(),
  commonModelName: z.string().trim().max(64).optional().nullable()
})

const updateSkillSchema = skillPayloadSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: '至少提供一个要更新的字段' })

const copySchema = z.object({
  sourceChannel: z.string().trim().max(32).optional().nullable(),
  copiedTextHash: z.string().trim().length(64).optional().nullable(),
  usage: z
    .object({
      modelId: z.coerce.number().int().positive().optional().nullable(),
      modelName: z.string().trim().max(64).optional().nullable(),
      inputTokens: z.coerce.number().int().nonnegative().optional().nullable(),
      outputTokens: z.coerce.number().int().nonnegative().optional().nullable(),
      totalTokens: z.coerce.number().int().nonnegative().optional().nullable(),
      costAmount: z.coerce.number().nonnegative().optional().nullable(),
      currency: z.string().trim().length(3).optional().default('CNY'),
      reaction: z.enum(['worth', 'ok', 'regret', 'addicted']).optional().nullable(),
      noteText: z.string().trim().max(2000).optional().nullable(),
      images: z.array(z.string().trim().min(1).max(500)).max(9).optional().default([])
    })
    .refine((usage) => {
      return Boolean(usage.modelId) || Boolean(`${usage.modelName ?? ''}`.trim())
    }, { message: 'usage.modelId 或 usage.modelName 至少提供一个' })
    .optional()
})

const feedbackSchema = z.object({
  status: z.enum(['success', 'normal', 'fail']),
  comment: z.string().trim().min(1).max(1000),
  usageRecordId: z.coerce.number().int().positive().optional().nullable(),
  modelName: z.string().trim().max(64).optional().nullable(),
  inputTokens: z.coerce.number().int().nonnegative().optional().nullable(),
  outputTokens: z.coerce.number().int().nonnegative().optional().nullable(),
  totalTokens: z.coerce.number().int().nonnegative().optional().nullable(),
  costAmount: z.coerce.number().nonnegative().optional().nullable(),
  isPublic: z.boolean().optional().default(true)
})

const feedbackListSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional()
})

const ORDER_BY_MAP: Record<string, string> = {
  recommend: 's.week_uses DESC, s.total_uses DESC, s.copy_count DESC, s.publish_at DESC',
  newest: 's.publish_at DESC, s.id DESC',
  mostCopy: 's.copy_count DESC, s.publish_at DESC',
  lowestToken:
    '(COALESCE(s.avg_total_tokens, usage_agg.avg_total_tokens) IS NULL), COALESCE(s.avg_total_tokens, usage_agg.avg_total_tokens) ASC, s.publish_at DESC',
  bestValue:
    '(COALESCE(s.success_rate, 0) * LOG10(COALESCE(s.copy_count, 0) + 10) / GREATEST(COALESCE(s.avg_total_tokens, usage_agg.avg_total_tokens, 1), 1)) DESC, s.publish_at DESC',
  highRate: 'COALESCE(s.success_rate, 0) DESC, s.copy_count DESC, s.publish_at DESC'
}

const buildInPlaceholders = (count: number): string => new Array(count).fill('?').join(', ')

const normalizeTagNames = (tags: string[]): string[] => {
  const seen = new Set<string>()
  const result: string[] = []

  for (const rawTag of tags) {
    const tag = rawTag.trim()
    if (!tag) continue
    if (seen.has(tag)) continue
    seen.add(tag)
    result.push(tag)
  }

  return result
}

const parseSkillId = (value: unknown): number | null => {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed <= 0) return null
  return parsed
}

const inferObjectKeyFromUrl = (imageUrl: string): string | null => {
  const base = env.MINIO_PUBLIC_BASE_URL.replace(/\/+$/, '')
  if (!imageUrl.startsWith(`${base}/`)) return null

  const objectKey = imageUrl.slice(base.length + 1).trim().replace(/^\/+/, '')
  return objectKey || null
}

const normalizeSkillImage = (item: z.infer<typeof skillImagePayloadSchema>): SkillImageInput => {
  if (typeof item === 'string') {
    const objectKey = inferObjectKeyFromUrl(item)
    return {
      imageUrl: item,
      storageProvider: objectKey ? 'minio' : null,
      bucketName: objectKey ? env.MINIO_BUCKET : null,
      objectKey,
      mimeType: null,
      fileSize: null
    }
  }

  const objectKey = item.objectKey?.trim() || inferObjectKeyFromUrl(item.imageUrl)
  const storageProvider = item.storageProvider?.trim() || (objectKey ? 'minio' : null)
  const bucketName = item.bucketName?.trim() || (storageProvider === 'minio' ? env.MINIO_BUCKET : null)
  const fileSize = item.fileSize === null || item.fileSize === undefined
    ? null
    : Math.max(0, Math.trunc(item.fileSize))

  return {
    imageUrl: item.imageUrl,
    storageProvider,
    bucketName,
    objectKey,
    mimeType: item.mimeType?.trim() || null,
    fileSize
  }
}

const normalizeSkillImages = (items: Array<z.infer<typeof skillImagePayloadSchema>>): SkillImageInput[] => {
  return items
    .map((item) => normalizeSkillImage(item))
    .filter((item) => !!item.imageUrl)
}

const makeTagSlug = (name: string): string | null => {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '')

  return slug || null
}

const getSkillTagsMap = async (skillIds: number[]): Promise<Map<number, string[]>> => {
  const map = new Map<number, string[]>()
  if (skillIds.length === 0) return map

  const placeholders = buildInPlaceholders(skillIds.length)
  const rows = await queryRows<SkillTagRow[]>(
    `SELECT
      rel.skill_id,
      rel.tag_id,
      t.name AS tag_name
    FROM skill_tag_rel rel
    INNER JOIN tags t ON t.id = rel.tag_id
    WHERE rel.skill_id IN (${placeholders})
      AND t.status = 1
    ORDER BY t.use_count DESC, t.name ASC`,
    skillIds
  )

  for (const row of rows) {
    const list = map.get(row.skill_id) ?? []
    list.push(row.tag_name)
    map.set(row.skill_id, list)
  }

  return map
}

const getFavoriteSkillIdSet = async (userId: number, skillIds: number[]): Promise<Set<number>> => {
  if (skillIds.length === 0) return new Set<number>()

  const placeholders = buildInPlaceholders(skillIds.length)
  const rows = await queryRows<FavoriteRow[]>(
    `SELECT skill_id
    FROM skill_favorites
    WHERE user_id = ?
      AND skill_id IN (${placeholders})`,
    [userId, ...skillIds]
  )

  return new Set(rows.map((row) => row.skill_id))
}

const ensureTagIds = async (
  conn: PoolConnection,
  tagNames: string[],
  categoryId?: number | null
): Promise<number[]> => {
  const normalized = normalizeTagNames(tagNames)
  if (normalized.length === 0) return []

  const placeholders = buildInPlaceholders(normalized.length)
  const existingRows = await conn.query<RowDataPacket[]>(
    `SELECT id, name
    FROM tags
    WHERE name IN (${placeholders})`,
    normalized
  )

  const [existing] = existingRows
  const nameToId = new Map<string, number>()
  for (const row of existing as Array<{ id: number; name: string }>) {
    nameToId.set(row.name, row.id)
  }

  for (const name of normalized) {
    if (nameToId.has(name)) continue

    const slug = makeTagSlug(name)
    // 新建 tag 时继承 skill 的分类；已存在的 tag 不覆盖（保留原有归属）
    const [insertResult] = await conn.execute<ResultSetHeader>(
      `INSERT INTO tags (name, slug, use_count, status, category_id)
      VALUES (?, ?, 0, 1, ?)
      ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), updated_at = NOW()`,
      [name, slug, categoryId ?? null]
    )

    nameToId.set(name, Number(insertResult.insertId))
  }

  return normalized.map((name) => nameToId.get(name)!).filter((id) => !!id)
}

const refreshTagUseCount = async (conn: PoolConnection, tagIds: number[]): Promise<void> => {
  const uniqueTagIds = Array.from(new Set(tagIds))
  for (const tagId of uniqueTagIds) {
    await conn.execute(
      `UPDATE tags
      SET use_count = (
        SELECT COUNT(1)
        FROM skill_tag_rel
        WHERE tag_id = ?
      )
      WHERE id = ?`,
      [tagId, tagId]
    )
  }
}

const replaceSkillTags = async (
  conn: PoolConnection,
  skillId: number,
  tagNames: string[],
  categoryId?: number | null
): Promise<void> => {
  const [oldRows] = await conn.query<RowDataPacket[]>(
    `SELECT tag_id
    FROM skill_tag_rel
    WHERE skill_id = ?`,
    [skillId]
  )

  const oldTagIds = (oldRows as Array<{ tag_id: number }>).map((row) => row.tag_id)

  await conn.execute('DELETE FROM skill_tag_rel WHERE skill_id = ?', [skillId])

  const newTagIds = await ensureTagIds(conn, tagNames, categoryId)

  if (newTagIds.length > 0) {
    const placeholders = newTagIds.map(() => '(?, ?)').join(', ')
    const params: unknown[] = []
    for (const tagId of newTagIds) {
      params.push(skillId, tagId)
    }

    await conn.execute(`INSERT INTO skill_tag_rel (skill_id, tag_id) VALUES ${placeholders}`, params as any[])
  }

  await refreshTagUseCount(conn, [...oldTagIds, ...newTagIds])
}

const replaceSkillImages = async (
  conn: PoolConnection,
  skillId: number,
  coverImages: SkillImageInput[],
  contentImages: SkillImageInput[]
): Promise<void> => {
  await conn.execute('DELETE FROM skill_images WHERE skill_id = ?', [skillId])

  const values: Array<{
    imageUrl: string
    imageType: 'cover' | 'content'
    sortNo: number
    storageProvider: string | null
    bucketName: string | null
    objectKey: string | null
    mimeType: string | null
    fileSize: number | null
  }> = []

  coverImages.forEach((image, idx) => {
    values.push({
      imageUrl: image.imageUrl,
      imageType: 'cover',
      sortNo: idx,
      storageProvider: image.storageProvider,
      bucketName: image.bucketName,
      objectKey: image.objectKey,
      mimeType: image.mimeType,
      fileSize: image.fileSize
    })
  })
  contentImages.forEach((image, idx) => {
    values.push({
      imageUrl: image.imageUrl,
      imageType: 'content',
      sortNo: idx,
      storageProvider: image.storageProvider,
      bucketName: image.bucketName,
      objectKey: image.objectKey,
      mimeType: image.mimeType,
      fileSize: image.fileSize
    })
  })

  if (values.length === 0) return

  const placeholders = values.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')
  const params: unknown[] = []

  for (const item of values) {
    params.push(
      skillId,
      item.imageUrl,
      item.imageType,
      item.sortNo,
      item.storageProvider ?? null,
      item.bucketName ?? null,
      item.objectKey ?? null,
      item.mimeType ?? null,
      item.fileSize ?? null
    )
  }

  await conn.execute(
    `INSERT INTO skill_images (
      skill_id,
      image_url,
      image_type,
      sort_no,
      storage_provider,
      bucket_name,
      object_key,
      mime_type,
      file_size
    )
    VALUES ${placeholders}`,
    params as any[]
  )
}

const refreshUserPublishedSkillCount = async (conn: PoolConnection, userId: number): Promise<void> => {
  await conn.execute(
    `UPDATE users
    SET published_skill_count = (
      SELECT COUNT(1)
      FROM skills
      WHERE creator_id = ?
        AND status = 1
    )
    WHERE id = ?`,
    [userId, userId]
  )
}

type SkillContentInput = {
  prompt: string | null
  systemPrompt: string | null
  userTemplate: string | null
  fullPrompt: string | null
  fullPromptHtml: string | null
  variableNotes: string | null
  variables: Array<{ name: string; desc?: string | null }>
  steps: string[]
  useScenes: string[]
}

const getLatestSkillContentForUpdate = async (conn: PoolConnection, skillId: number): Promise<SkillContentInput> => {
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT
      prompt,
      system_prompt,
      user_template,
      full_prompt,
      full_prompt_html,
      variable_notes,
      variables_json,
      steps_json,
      use_scenes_json
    FROM skill_contents
    WHERE skill_id = ?
    ORDER BY is_current DESC, version_no DESC
    LIMIT 1`,
    [skillId]
  )

  const row = (rows as Array<Record<string, unknown>>)[0]
  if (!row) {
    return {
      prompt: null,
      systemPrompt: null,
      userTemplate: null,
      fullPrompt: null,
      fullPromptHtml: null,
      variableNotes: null,
      variables: [],
      steps: [],
      useScenes: []
    }
  }

  return {
    prompt: (row.prompt as string | null) ?? null,
    systemPrompt: (row.system_prompt as string | null) ?? null,
    userTemplate: (row.user_template as string | null) ?? null,
    fullPrompt: (row.full_prompt as string | null) ?? null,
    fullPromptHtml: (row.full_prompt_html as string | null) ?? null,
    variableNotes: (row.variable_notes as string | null) ?? null,
    variables: safeParseJson<Array<{ name: string; desc?: string | null }>>(row.variables_json, []),
    steps: safeParseJson<string[]>(row.steps_json, []),
    useScenes: safeParseJson<string[]>(row.use_scenes_json, [])
  }
}

const insertSkillContentVersion = async (
  conn: PoolConnection,
  skillId: number,
  content: SkillContentInput
): Promise<void> => {
  const [versionRows] = await conn.query<RowDataPacket[]>(
    `SELECT COALESCE(MAX(version_no), 0) AS max_version
    FROM skill_contents
    WHERE skill_id = ?`,
    [skillId]
  )

  const maxVersion = Number((versionRows as MaxVersionRow[])[0]?.max_version ?? 0)
  const nextVersion = maxVersion + 1

  await conn.execute('UPDATE skill_contents SET is_current = 0 WHERE skill_id = ?', [skillId])

  await conn.execute(
    `INSERT INTO skill_contents (
      skill_id,
      version_no,
      is_current,
      prompt,
      system_prompt,
      user_template,
      full_prompt,
      full_prompt_html,
      variable_notes,
      variables_json,
      steps_json,
      use_scenes_json
    ) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      skillId,
      nextVersion,
      content.prompt,
      content.systemPrompt,
      content.userTemplate,
      content.fullPrompt,
      content.fullPromptHtml,
      content.variableNotes,
      stringifyJson(content.variables),
      stringifyJson(content.steps),
      stringifyJson(content.useScenes)
    ]
  )
}

const toContentInputFromCreatePayload = (payload: z.infer<typeof skillPayloadSchema>): SkillContentInput => ({
  prompt: payload.prompt ?? null,
  systemPrompt: payload.systemPrompt ?? null,
  userTemplate: payload.userTemplate ?? null,
  fullPrompt: payload.fullPrompt ?? null,
  fullPromptHtml: payload.fullPromptHtml ?? null,
  variableNotes: payload.variableNotes ?? null,
  variables: payload.variables,
  steps: payload.steps,
  useScenes: payload.useScenes
})

const hasContentUpdate = (payload: z.infer<typeof updateSkillSchema>): boolean => {
  return (
    'prompt' in payload ||
    'systemPrompt' in payload ||
    'userTemplate' in payload ||
    'fullPrompt' in payload ||
    'fullPromptHtml' in payload ||
    'variableNotes' in payload ||
    'variables' in payload ||
    'steps' in payload ||
    'useScenes' in payload
  )
}

export const skillsRouter = Router()

skillsRouter.get('/meta/categories', async (_req, res) => {
  const rows = await queryRows<CategoryRow[]>(
    `SELECT id, name, sort_no
    FROM categories
    WHERE status = 1
    ORDER BY sort_no ASC, id ASC`
  )

  sendSuccess(res, rows.map((row) => ({ id: row.id, name: row.name, sortNo: row.sort_no })))
})

skillsRouter.get('/meta/tags', async (req, res) => {
  const keyword = `${req.query.keyword ?? ''}`.trim()
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize ?? 20)))
  const rawCategoryId = req.query.categoryId
  const categoryId = rawCategoryId ? Number(rawCategoryId) : null

  const where: string[] = ['status = 1']
  const params: unknown[] = []

  if (keyword) {
    where.push('name LIKE ?')
    params.push(`%${keyword}%`)
  }

  if (categoryId && Number.isInteger(categoryId) && categoryId > 0) {
    where.push('category_id = ?')
    params.push(categoryId)
  }

  const rows = await queryRows<TagRow[]>(
    `SELECT id, name, use_count
    FROM tags
    WHERE ${where.join(' AND ')}
    ORDER BY use_count DESC, id DESC
    LIMIT ?`,
    [...params, pageSize]
  )

  sendSuccess(
    res,
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      useCount: row.use_count
    }))
  )
})

// 公开创作者资料（无需登录，不含邮箱/手机等敏感信息）
skillsRouter.get('/creator/:id', optionalAuth, async (req, res) => {
  const userId = Number(req.params.id)
  if (!Number.isInteger(userId) || userId <= 0) {
    sendError(res, '参数错误', 400)
    return
  }

  const rows = await queryRows<CreatorProfileRow[]>(
    `SELECT id, nickname, bio, display_color, avatar_url,
            published_skill_count, total_copy_count, avg_success_rate,
            follower_count, following_count
     FROM users
     WHERE id = ? AND status = 1
     LIMIT 1`,
    [userId]
  )

  const user = rows[0]
  if (!user) {
    sendError(res, '用户不存在', 404)
    return
  }

  // 当前登录用户是否已关注
  let isFollowing = false
  if (req.auth?.userId && req.auth.userId !== userId) {
    const followRows = await queryRows<FollowRow[]>(
      `SELECT COUNT(1) AS cnt FROM user_follows
       WHERE follower_id = ? AND followed_id = ?`,
      [req.auth.userId, userId]
    )
    isFollowing = (followRows[0]?.cnt ?? 0) > 0
  }

  sendSuccess(res, {
    id: user.id,
    nickname: user.nickname,
    bio: user.bio,
    displayColor: user.display_color,
    avatarUrl: user.avatar_url,
    publishedSkillCount: user.published_skill_count,
    totalCopyCount: user.total_copy_count,
    avgSuccessRate: user.avg_success_rate,
    followerCount: user.follower_count,
    followingCount: user.following_count,
    isFollowing
  })
})

// 关注创作者
skillsRouter.post('/creator/:id/follow', requireAuth, async (req, res) => {
  const targetId = Number(req.params.id)
  if (!Number.isInteger(targetId) || targetId <= 0) {
    sendError(res, '参数错误', 400)
    return
  }

  const followerId = req.auth!.userId
  if (followerId === targetId) {
    sendError(res, '不能关注自己', 400)
    return
  }

  const targetRows = await queryRows<RowDataPacket[]>(
    'SELECT id FROM users WHERE id = ? AND status = 1 LIMIT 1',
    [targetId]
  )
  if (!targetRows[0]) {
    sendError(res, '用户不存在', 404)
    return
  }

  const changed = await withTransaction(async (conn) => {
    const [result] = await conn.execute<ResultSetHeader>(
      'INSERT IGNORE INTO user_follows (follower_id, followed_id) VALUES (?, ?)',
      [followerId, targetId]
    )
    if (result.affectedRows === 0) return false

    await conn.execute(
      'UPDATE users SET follower_count  = follower_count  + 1 WHERE id = ?',
      [targetId]
    )
    await conn.execute(
      'UPDATE users SET following_count = following_count + 1 WHERE id = ?',
      [followerId]
    )
    return true
  })

  sendSuccess(res, { targetId, isFollowing: true, changed })
})

// 取消关注创作者
skillsRouter.delete('/creator/:id/follow', requireAuth, async (req, res) => {
  const targetId = Number(req.params.id)
  if (!Number.isInteger(targetId) || targetId <= 0) {
    sendError(res, '参数错误', 400)
    return
  }

  const followerId = req.auth!.userId

  const changed = await withTransaction(async (conn) => {
    const [result] = await conn.execute<ResultSetHeader>(
      'DELETE FROM user_follows WHERE follower_id = ? AND followed_id = ? LIMIT 1',
      [followerId, targetId]
    )
    if (result.affectedRows === 0) return false

    await conn.execute(
      'UPDATE users SET follower_count  = GREATEST(follower_count  - 1, 0) WHERE id = ?',
      [targetId]
    )
    await conn.execute(
      'UPDATE users SET following_count = GREATEST(following_count - 1, 0) WHERE id = ?',
      [followerId]
    )
    return true
  })

  sendSuccess(res, { targetId, isFollowing: false, changed })
})

skillsRouter.get('/', optionalAuth, async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query)
  const query = parsed.success ? parsed.data : {}

  const { page, pageSize, offset } = parsePagination(query.page, query.pageSize)

  const sort = query.sort ?? 'recommend'
  const orderBy = ORDER_BY_MAP[sort]

  const where: string[] = ['s.status = 1']
  const params: unknown[] = []

  if (query.scene) {
    where.push('s.scene = ?')
    params.push(query.scene)
  }

  if (query.categoryId) {
    where.push('s.category_id = ?')
    params.push(query.categoryId)
  }

  if (query.creatorId) {
    where.push('s.creator_id = ?')
    params.push(query.creatorId)
  }

  if (query.keyword) {
    where.push('(s.title LIKE ? OR s.brief LIKE ?)')
    const keywordLike = `%${query.keyword}%`
    params.push(keywordLike, keywordLike)
  }

  if (query.tag) {
    where.push(
      `EXISTS (
        SELECT 1
        FROM skill_tag_rel rel
        INNER JOIN tags t ON t.id = rel.tag_id
        WHERE rel.skill_id = s.id
          AND t.name = ?
          AND t.status = 1
      )`
    )
    params.push(query.tag)
  }

  if (query.minSuccessRate !== undefined) {
    where.push('COALESCE(s.success_rate, 0) >= ?')
    params.push(query.minSuccessRate)
  }

  if (query.maxAvgTotalTokens !== undefined) {
    where.push('COALESCE(s.avg_total_tokens, 0) <= ?')
    params.push(query.maxAvgTotalTokens)
  }

  const whereSql = where.join(' AND ')

  const rows = await queryRows<SkillListRow[]>(
    `SELECT
      s.id,
      s.title,
      s.brief,
      s.scene,
      s.publish_at,
      s.is_featured,
      s.copy_count,
      s.favorite_count,
      s.feedback_count,
      s.success_rate,
      COALESCE(s.avg_total_tokens, usage_agg.avg_total_tokens) AS avg_total_tokens,
      s.recommended_model_name,
      s.common_model_name,
      u.id AS creator_id,
      u.nickname AS creator_nickname,
      u.avatar_url AS creator_avatar_url,
      u.display_color AS creator_color,
      c.id AS category_id,
      c.name AS category_name,
      (
        SELECT si.image_url
        FROM skill_images si
        WHERE si.skill_id = s.id
        ORDER BY (si.image_type = 'cover') DESC, si.sort_no ASC, si.id ASC
        LIMIT 1
      ) AS cover_image,
      (
        SELECT sc.full_prompt
        FROM skill_contents sc
        WHERE sc.skill_id = s.id
        ORDER BY sc.is_current DESC, sc.version_no DESC, sc.id DESC
        LIMIT 1
      ) AS prompt_preview
    FROM skills s
    INNER JOIN users u ON u.id = s.creator_id
    LEFT JOIN categories c ON c.id = s.category_id
    LEFT JOIN (
      SELECT
        ur.skill_id,
        ROUND(AVG(ur.total_tokens)) AS avg_total_tokens
      FROM skill_usage_records ur
      WHERE ur.skill_id IS NOT NULL
      GROUP BY ur.skill_id
    ) usage_agg ON usage_agg.skill_id = s.id
    WHERE ${whereSql}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  )

  const countRows = await queryRows<CountRow[]>(
    `SELECT COUNT(1) AS total
    FROM skills s
    WHERE ${whereSql}`,
    params
  )

  const total = countRows[0]?.total ?? 0
  const skillIds = rows.map((row) => row.id)
  const tagsMap = await getSkillTagsMap(skillIds)

  const favoriteSet = req.auth?.userId ? await getFavoriteSkillIdSet(req.auth.userId, skillIds) : new Set<number>()

  sendSuccess(res, {
    list: rows.map((row) => ({
      id: row.id,
      title: row.title,
      summary: row.brief,
      brief: row.brief,
      promptPreview: row.prompt_preview,
      scene: row.scene,
      publishAt: row.publish_at,
      featured: row.is_featured === 1,
      copyCount: row.copy_count,
      favoriteCount: row.favorite_count,
      feedbackCount: row.feedback_count,
      successRate: row.success_rate,
      avgTotalTokens: row.avg_total_tokens,
      modelName: row.recommended_model_name || row.common_model_name,
      coverImage: row.cover_image,
      tags: tagsMap.get(row.id) ?? [],
      category: row.category_id
        ? {
            id: row.category_id,
            name: row.category_name
          }
        : null,
      creator: {
        id: row.creator_id,
        nickname: row.creator_nickname,
        avatarUrl: row.creator_avatar_url,
        displayColor: row.creator_color
      },
      isFavorited: favoriteSet.has(row.id)
    })),
    pagination: buildPaginationMeta(page, pageSize, total)
  })
})

skillsRouter.get('/:id', optionalAuth, async (req, res) => {
  const skillId = parseSkillId(req.params.id)
  if (!skillId) {
    sendError(res, 'Skill ID 不合法', 400)
    return
  }

  const detailRows = await queryRows<SkillDetailRow[]>(
    `SELECT
      s.id,
      s.creator_id,
      s.title,
      s.brief,
      s.category_id,
      s.scene,
      s.status,
      s.publish_at,
      s.copy_count,
      s.favorite_count,
      s.feedback_count,
      s.success_rate,
      s.avg_input_tokens,
      s.avg_output_tokens,
      s.avg_total_tokens,
      s.estimated_cost_low,
      s.estimated_cost_high,
      s.recommended_model_name,
      s.common_model_name,
      s.total_uses,
      s.week_uses,
      u.nickname AS creator_nickname,
      u.avatar_url AS creator_avatar_url,
      u.display_color AS creator_color,
      c.id AS category_id,
      c.name AS category_name,
      (
        SELECT si.image_url
        FROM skill_images si
        WHERE si.skill_id = s.id
        ORDER BY (si.image_type = 'cover') DESC, si.sort_no ASC, si.id ASC
        LIMIT 1
      ) AS cover_image
    FROM skills s
    INNER JOIN users u ON u.id = s.creator_id
    LEFT JOIN categories c ON c.id = s.category_id
    WHERE s.id = ?
    LIMIT 1`,
    [skillId]
  )

  const detail = detailRows[0]
  if (!detail) {
    sendError(res, 'Skill 不存在', 404)
    return
  }

  if (detail.status !== 1 && req.auth?.userId !== detail.creator_id) {
    sendError(res, 'Skill 不存在或无权限查看', 404)
    return
  }

  const contentRows = await queryRows<SkillContentRow[]>(
    `SELECT
      id,
      skill_id,
      version_no,
      is_current,
      prompt,
      system_prompt,
      user_template,
      full_prompt,
      full_prompt_html,
      variable_notes,
      variables_json,
      steps_json,
      use_scenes_json,
      created_at,
      updated_at
    FROM skill_contents
    WHERE skill_id = ?
    ORDER BY is_current DESC, version_no DESC
    LIMIT 1`,
    [skillId]
  )

  const imageRows = await queryRows<SkillImageRow[]>(
    `SELECT
      id,
      image_url,
      image_type,
      sort_no,
      width,
      height
    FROM skill_images
    WHERE skill_id = ?
    ORDER BY image_type ASC, sort_no ASC, id ASC`,
    [skillId]
  )

  const tagRows = await queryRows<SkillTagRow[]>(
    `SELECT
      rel.skill_id,
      rel.tag_id,
      t.name AS tag_name
    FROM skill_tag_rel rel
    INNER JOIN tags t ON t.id = rel.tag_id
    WHERE rel.skill_id = ?
      AND t.status = 1
    ORDER BY t.use_count DESC, t.name ASC`,
    [skillId]
  )

  const feedbackRows = await queryRows<SkillFeedbackRow[]>(
    `SELECT
      fb.id,
      fb.status,
      fb.comment,
      fb.model_name,
      fb.input_tokens,
      fb.output_tokens,
      fb.total_tokens,
      fb.cost_amount,
      fb.created_at,
      u.id AS user_id,
      u.nickname AS user_nickname,
      u.avatar_url AS user_avatar_url,
      u.display_color AS user_color
    FROM skill_feedbacks fb
    INNER JOIN users u ON u.id = fb.user_id
    WHERE fb.skill_id = ?
      AND fb.is_public = 1
    ORDER BY fb.created_at DESC
    LIMIT 20`,
    [skillId]
  )

  const similarRows = await queryRows<SimilarSkillRow[]>(
    `SELECT
      id,
      title,
      scene,
      avg_total_tokens,
      success_rate,
      copy_count
    FROM skills
    WHERE status = 1
      AND id <> ?
      AND (
        category_id <=> ?
        OR scene <=> ?
      )
    ORDER BY copy_count DESC, publish_at DESC
    LIMIT 6`,
    [skillId, detail.category_id, detail.scene]
  )

  const content = contentRows[0]
  const contentVariables = content
    ? safeParseJson<Array<{ name: string; desc?: string | null }>>(content.variables_json, [])
    : []
  const contentSteps = content ? safeParseJson<string[]>(content.steps_json, []) : []
  const contentUseScenes = content ? safeParseJson<string[]>(content.use_scenes_json, []) : []

  const isFavoritedSet = req.auth?.userId ? await getFavoriteSkillIdSet(req.auth.userId, [skillId]) : new Set<number>()

  sendSuccess(res, {
    id: detail.id,
    title: detail.title,
    brief: detail.brief,
    summary: detail.brief,
    scene: detail.scene,
    status: detail.status,
    publishAt: detail.publish_at,
    coverImage: detail.cover_image,
    stats: {
      copyCount: detail.copy_count,
      favoriteCount: detail.favorite_count,
      feedbackCount: detail.feedback_count,
      successRate: detail.success_rate,
      totalUses: detail.total_uses,
      weekUses: detail.week_uses
    },
    tokenInfo: {
      avgInputTokens: detail.avg_input_tokens,
      avgOutputTokens: detail.avg_output_tokens,
      avgTotalTokens: detail.avg_total_tokens,
      estimatedCostLow: detail.estimated_cost_low,
      estimatedCostHigh: detail.estimated_cost_high,
      recommendedModelName: detail.recommended_model_name,
      commonModelName: detail.common_model_name
    },
    category: detail.category_id
      ? {
          id: detail.category_id,
          name: detail.category_name
        }
      : null,
    tags: tagRows.map((row) => row.tag_name),
    useScenes: contentUseScenes,
    creator: {
      id: detail.creator_id,
      nickname: detail.creator_nickname,
      avatarUrl: detail.creator_avatar_url,
      displayColor: detail.creator_color
    },
    isFavorited: isFavoritedSet.has(skillId),
    canEdit: req.auth?.userId === detail.creator_id,
    content: content
      ? {
          id: content.id,
          versionNo: content.version_no,
          prompt: content.prompt,
          systemPrompt: content.system_prompt,
          userTemplate: content.user_template,
          fullPrompt: content.full_prompt,
          fullPromptHtml: content.full_prompt_html,
          variableNotes: content.variable_notes,
          variables: contentVariables,
          steps: contentSteps,
          useScenes: contentUseScenes,
          createdAt: content.created_at,
          updatedAt: content.updated_at
        }
      : null,
    images: {
      cover: imageRows.filter((row) => row.image_type === 'cover').map((row) => row.image_url),
      content: imageRows.filter((row) => row.image_type === 'content').map((row) => row.image_url)
    },
    feedbacks: feedbackRows.map((row) => ({
      id: row.id,
      status: row.status,
      comment: row.comment,
      modelName: row.model_name,
      inputTokens: row.input_tokens,
      outputTokens: row.output_tokens,
      totalTokens: row.total_tokens,
      costAmount: row.cost_amount,
      createdAt: row.created_at,
      user: {
        id: row.user_id,
        nickname: row.user_nickname,
        avatarUrl: row.user_avatar_url,
        displayColor: row.user_color
      }
    })),
    similarSkills: similarRows.map((row) => ({
      id: row.id,
      title: row.title,
      scene: row.scene,
      avgTotalTokens: row.avg_total_tokens,
      successRate: row.success_rate,
      copyCount: row.copy_count
    }))
  })
})

skillsRouter.post('/', requireAuth, async (req, res) => {
  const parsed = skillPayloadSchema.safeParse(req.body)
  if (!parsed.success) {
    sendError(res, '发布参数不合法', 400)
    return
  }

  const payload = parsed.data
  const userId = req.auth!.userId

  const skillId = await withTransaction(async (conn) => {
    const [insertSkillResult] = await conn.execute<ResultSetHeader>(
      `INSERT INTO skills (
        creator_id,
        title,
        brief,
        category_id,
        scene,
        status,
        publish_at,
        recommended_model_name,
        common_model_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        payload.title,
        payload.brief ?? null,
        payload.categoryId ?? null,
        payload.scene ?? null,
        payload.status,
        payload.status === 1 ? new Date() : null,
        payload.recommendedModelName ?? null,
        payload.commonModelName ?? null
      ]
    )

    const newSkillId = Number(insertSkillResult.insertId)

    await insertSkillContentVersion(conn, newSkillId, toContentInputFromCreatePayload(payload))
    await replaceSkillImages(
      conn,
      newSkillId,
      normalizeSkillImages(payload.coverImages),
      normalizeSkillImages(payload.contentImages)
    )
    await replaceSkillTags(conn, newSkillId, payload.tags, payload.categoryId ?? null)
    await refreshUserPublishedSkillCount(conn, userId)

    return newSkillId
  })

  sendSuccess(res, { id: skillId }, '发布成功')
})

skillsRouter.put('/:id', requireAuth, async (req, res) => {
  const skillId = parseSkillId(req.params.id)
  if (!skillId) {
    sendError(res, 'Skill ID 不合法', 400)
    return
  }

  const parsed = updateSkillSchema.safeParse(req.body)
  if (!parsed.success) {
    sendError(res, parsed.error.issues[0]?.message || '更新参数不合法', 400)
    return
  }

  const payload = parsed.data
  const userId = req.auth!.userId

  const ownerRows = await queryRows<SkillOwnerRow[]>(
    `SELECT id, creator_id, status, category_id, scene
    FROM skills
    WHERE id = ?
    LIMIT 1`,
    [skillId]
  )

  const owner = ownerRows[0]
  if (!owner) {
    sendError(res, 'Skill 不存在', 404)
    return
  }

  if (owner.creator_id !== userId) {
    sendError(res, '无权限编辑该 Skill', 403)
    return
  }

  await withTransaction(async (conn) => {
    const sets: string[] = []
    const values: unknown[] = []

    if ('title' in payload) {
      sets.push('title = ?')
      values.push(payload.title)
    }
    if ('brief' in payload) {
      sets.push('brief = ?')
      values.push(payload.brief ?? null)
    }
    if ('categoryId' in payload) {
      sets.push('category_id = ?')
      values.push(payload.categoryId ?? null)
    }
    if ('scene' in payload) {
      sets.push('scene = ?')
      values.push(payload.scene ?? null)
    }
    if ('status' in payload) {
      sets.push('status = ?')
      values.push(payload.status)
      if (payload.status === 1) sets.push('publish_at = COALESCE(publish_at, NOW())')
    }
    if ('recommendedModelName' in payload) {
      sets.push('recommended_model_name = ?')
      values.push(payload.recommendedModelName ?? null)
    }
    if ('commonModelName' in payload) {
      sets.push('common_model_name = ?')
      values.push(payload.commonModelName ?? null)
    }

    if (sets.length > 0) {
      await conn.execute(`UPDATE skills SET ${sets.join(', ')} WHERE id = ?`, [...values, skillId] as any[])
    }

    if ('tags' in payload) {
      // 用本次请求生效的 category_id：如果同时更新了分类就取新值，否则沿用原有值
      const effectiveCategoryId = 'categoryId' in payload ? (payload.categoryId ?? null) : (owner.category_id ?? null)
      await replaceSkillTags(conn, skillId, payload.tags ?? [], effectiveCategoryId)
    }

    if ('coverImages' in payload || 'contentImages' in payload) {
      const [imageRows] = await conn.query<RowDataPacket[]>(
        `SELECT
          image_url,
          image_type,
          storage_provider,
          bucket_name,
          object_key,
          mime_type,
          file_size
        FROM skill_images
        WHERE skill_id = ?
        ORDER BY sort_no ASC, id ASC`,
        [skillId]
      )

      const currentCover = (imageRows as Array<{
        image_url: string
        image_type: 'cover' | 'content'
        storage_provider: string | null
        bucket_name: string | null
        object_key: string | null
        mime_type: string | null
        file_size: number | null
      }>)
        .filter((row) => row.image_type === 'cover')
        .map((row) => ({
          imageUrl: row.image_url,
          storageProvider: row.storage_provider,
          bucketName: row.bucket_name,
          objectKey: row.object_key,
          mimeType: row.mime_type,
          fileSize: row.file_size === null ? null : Number(row.file_size)
        }))

      const currentContent = (imageRows as Array<{
        image_url: string
        image_type: 'cover' | 'content'
        storage_provider: string | null
        bucket_name: string | null
        object_key: string | null
        mime_type: string | null
        file_size: number | null
      }>)
        .filter((row) => row.image_type === 'content')
        .map((row) => ({
          imageUrl: row.image_url,
          storageProvider: row.storage_provider,
          bucketName: row.bucket_name,
          objectKey: row.object_key,
          mimeType: row.mime_type,
          fileSize: row.file_size === null ? null : Number(row.file_size)
        }))

      const nextCover = 'coverImages' in payload ? normalizeSkillImages(payload.coverImages ?? []) : currentCover
      const nextContent = 'contentImages' in payload ? normalizeSkillImages(payload.contentImages ?? []) : currentContent

      await replaceSkillImages(conn, skillId, nextCover, nextContent)
    }

    if (hasContentUpdate(payload)) {
      const currentContent = await getLatestSkillContentForUpdate(conn, skillId)

      const merged: SkillContentInput = {
        prompt: 'prompt' in payload ? payload.prompt ?? null : currentContent.prompt,
        systemPrompt: 'systemPrompt' in payload ? payload.systemPrompt ?? null : currentContent.systemPrompt,
        userTemplate: 'userTemplate' in payload ? payload.userTemplate ?? null : currentContent.userTemplate,
        fullPrompt: 'fullPrompt' in payload ? payload.fullPrompt ?? null : currentContent.fullPrompt,
        fullPromptHtml: 'fullPromptHtml' in payload ? payload.fullPromptHtml ?? null : currentContent.fullPromptHtml,
        variableNotes: 'variableNotes' in payload ? payload.variableNotes ?? null : currentContent.variableNotes,
        variables: 'variables' in payload ? payload.variables ?? [] : currentContent.variables,
        steps: 'steps' in payload ? payload.steps ?? [] : currentContent.steps,
        useScenes: 'useScenes' in payload ? payload.useScenes ?? [] : currentContent.useScenes
      }

      await insertSkillContentVersion(conn, skillId, merged)
    }

    await refreshUserPublishedSkillCount(conn, userId)
  })

  sendSuccess(res, { id: skillId }, '更新成功')
})

skillsRouter.post('/:id/favorite', requireAuth, async (req, res) => {
  const skillId = parseSkillId(req.params.id)
  if (!skillId) {
    sendError(res, 'Skill ID 不合法', 400)
    return
  }

  const skillRows = await queryRows<SkillOwnerRow[]>(
    `SELECT id, creator_id, status, category_id, scene
    FROM skills
    WHERE id = ?
    LIMIT 1`,
    [skillId]
  )

  if (!skillRows[0] || skillRows[0].status !== 1) {
    sendError(res, 'Skill 不存在或未发布', 404)
    return
  }

  const userId = req.auth!.userId

  const changed = await withTransaction(async (conn) => {
    const [insertResult] = await conn.execute<ResultSetHeader>(
      `INSERT IGNORE INTO skill_favorites (user_id, skill_id)
      VALUES (?, ?)`,
      [userId, skillId]
    )

    const inserted = insertResult.affectedRows > 0
    if (inserted) {
      await conn.execute(
        `UPDATE skills
        SET favorite_count = favorite_count + 1
        WHERE id = ?`,
        [skillId]
      )
    }

    return inserted
  })

  sendSuccess(res, { skillId, favorited: true, changed })
})

skillsRouter.delete('/:id/favorite', requireAuth, async (req, res) => {
  const skillId = parseSkillId(req.params.id)
  if (!skillId) {
    sendError(res, 'Skill ID 不合法', 400)
    return
  }

  const userId = req.auth!.userId

  const changed = await withTransaction(async (conn) => {
    const [deleteResult] = await conn.execute<ResultSetHeader>(
      `DELETE FROM skill_favorites
      WHERE user_id = ?
        AND skill_id = ?
      LIMIT 1`,
      [userId, skillId]
    )

    const deleted = deleteResult.affectedRows > 0
    if (deleted) {
      await conn.execute(
        `UPDATE skills
        SET favorite_count = GREATEST(favorite_count - 1, 0)
        WHERE id = ?`,
        [skillId]
      )
    }

    return deleted
  })

  sendSuccess(res, { skillId, favorited: false, changed })
})

skillsRouter.post('/:id/copies', requireAuth, async (req, res) => {
  const skillId = parseSkillId(req.params.id)
  if (!skillId) {
    sendError(res, 'Skill ID 不合法', 400)
    return
  }

  const parsed = copySchema.safeParse(req.body)
  if (!parsed.success) {
    sendError(res, '复制参数不合法', 400)
    return
  }

  const skillRows = await queryRows<SkillOwnerRow[]>(
    `SELECT id, creator_id, status, category_id, scene
    FROM skills
    WHERE id = ?
    LIMIT 1`,
    [skillId]
  )

  const skill = skillRows[0]
  if (!skill || skill.status !== 1) {
    sendError(res, 'Skill 不存在或未发布', 404)
    return
  }

  const { sourceChannel, copiedTextHash, usage } = parsed.data
  const userId = req.auth!.userId

  let usageModelId: number | null = null
  let usageModelName = ''
  if (usage) {
    usageModelName = `${usage.modelName ?? ''}`.trim()
    if (usage.modelId) {
      try {
        const modelRows = await queryRows<ModelLookupRow[]>(
          `SELECT id, model_name, is_active
          FROM ai_models
          WHERE id = ?
          LIMIT 1`,
          [usage.modelId]
        )
        const model = modelRows[0]
        if (!model || model.is_active !== 1) {
          sendError(res, '模型不存在或已下线', 400)
          return
        }
        usageModelId = model.id
        usageModelName = model.model_name
      } catch {
        // 旧库可能尚未创建 ai_models 表，回退为 modelName 兼容路径
      }
    }

    if (!usageModelId && usageModelName) {
      try {
        const modelRows = await queryRows<ModelLookupRow[]>(
          `SELECT id, model_name, is_active
          FROM ai_models
          WHERE LOWER(TRIM(model_name)) = LOWER(TRIM(?))
            OR LOWER(TRIM(model_key)) = LOWER(TRIM(?))
          ORDER BY is_recommended DESC, sort_no ASC, id ASC
          LIMIT 1`,
          [usageModelName, usageModelName]
        )
        const model = modelRows[0]
        if (model) {
          if (model.is_active !== 1) {
            sendError(res, '模型已下线，请重新选择', 400)
            return
          }
          usageModelId = model.id
          usageModelName = model.model_name
        }
      } catch {
        // 旧库可能尚未创建 ai_models 表，回退为 modelName 兼容路径
      }
    }

    if (!usageModelName) {
      sendError(res, '复制参数不合法', 400)
      return
    }
  }

  const result = await withTransaction(async (conn) => {
    const [copyResult] = await conn.execute<ResultSetHeader>(
      `INSERT INTO skill_copies (
        user_id,
        skill_id,
        source_channel,
        copied_text_hash
      ) VALUES (?, ?, ?, ?)`,
      [userId, skillId, sourceChannel ?? null, copiedTextHash ?? null]
    )

    const copyId = Number(copyResult.insertId)

    if (usage) {
      const [usageInsertResult] = await conn.execute<ResultSetHeader>(
        `INSERT INTO skill_usage_records (
          user_id,
          skill_id,
          copy_id,
          model_name,
          input_tokens,
          output_tokens,
          total_tokens,
          cost_amount,
          currency,
          reaction,
          note_text,
          images_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          skillId,
          copyId,
          usageModelName,
          usage.inputTokens ?? null,
          usage.outputTokens ?? null,
          usage.totalTokens ?? null,
          usage.costAmount ?? null,
          usage.currency,
          usage.reaction ?? null,
          usage.noteText ?? null,
          stringifyJson(usage.images ?? [])
        ]
      )

      if (usageModelId) {
        const usageRecordId = Number(usageInsertResult.insertId)
        try {
          await conn.execute(
            `UPDATE skill_usage_records
            SET model_id = ?
            WHERE id = ?`,
            [usageModelId, usageRecordId]
          )
        } catch {
          // 旧库可能未执行 model_id 升级，保持兼容
        }

        try {
          await conn.execute(
            `INSERT INTO user_recent_models (user_id, model_id, last_used_at, use_count)
            VALUES (?, ?, CURRENT_TIMESTAMP, 1)
            ON DUPLICATE KEY UPDATE
              last_used_at = CURRENT_TIMESTAMP,
              use_count = use_count + 1`,
            [userId, usageModelId]
          )
        } catch {
          // 旧库可能未执行 user_recent_models 升级，保持兼容
        }
      }
    }

    await conn.execute(
      `UPDATE skills
      SET
        copy_count = copy_count + 1,
        total_uses = total_uses + 1,
        week_uses = week_uses + 1
      WHERE id = ?`,
      [skillId]
    )

    await conn.execute(
      `UPDATE users
      SET total_copy_count = total_copy_count + 1
      WHERE id = ?`,
      [skill.creator_id]
    )

    return { copyId }
  })

  sendSuccess(res, { skillId, ...result }, '复制记录成功')
})

skillsRouter.post('/:id/feedbacks', requireAuth, async (req, res) => {
  const skillId = parseSkillId(req.params.id)
  if (!skillId) {
    sendError(res, 'Skill ID 不合法', 400)
    return
  }

  const parsed = feedbackSchema.safeParse(req.body)
  if (!parsed.success) {
    sendError(res, '反馈参数不合法', 400)
    return
  }

  const skillRows = await queryRows<SkillOwnerRow[]>(
    `SELECT id, creator_id, status, category_id, scene
    FROM skills
    WHERE id = ?
    LIMIT 1`,
    [skillId]
  )

  const skill = skillRows[0]
  if (!skill || skill.status !== 1) {
    sendError(res, 'Skill 不存在或未发布', 404)
    return
  }

  const userId = req.auth!.userId
  const payload = parsed.data

  const result = await withTransaction(async (conn) => {
    const [insertResult] = await conn.execute<ResultSetHeader>(
      `INSERT INTO skill_feedbacks (
        skill_id,
        user_id,
        usage_record_id,
        status,
        comment,
        model_name,
        input_tokens,
        output_tokens,
        total_tokens,
        cost_amount,
        is_public
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        skillId,
        userId,
        payload.usageRecordId ?? null,
        payload.status,
        payload.comment,
        payload.modelName ?? null,
        payload.inputTokens ?? null,
        payload.outputTokens ?? null,
        payload.totalTokens ?? null,
        payload.costAmount ?? null,
        payload.isPublic ? 1 : 0
      ]
    )

    const feedbackId = Number(insertResult.insertId)

    const [aggRows] = await conn.query<RowDataPacket[]>(
      `SELECT
        COUNT(1) AS total,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS success_total
      FROM skill_feedbacks
      WHERE skill_id = ?`,
      [skillId]
    )

    const agg = (aggRows as FeedbackAggRow[])[0]
    const total = agg?.total ?? 0
    const successTotal = agg?.success_total ?? 0
    const successRate = total > 0 ? Number(((successTotal / total) * 100).toFixed(2)) : null

    await conn.execute(
      `UPDATE skills
      SET
        feedback_count = ?,
        success_rate = ?
      WHERE id = ?`,
      [total, successRate, skillId]
    )

    return {
      id: feedbackId,
      feedbackCount: total,
      successRate
    }
  })

  sendSuccess(res, result, '反馈提交成功')
})

skillsRouter.get('/:id/feedbacks', async (req, res) => {
  const skillId = parseSkillId(req.params.id)
  if (!skillId) {
    sendError(res, 'Skill ID 不合法', 400)
    return
  }

  const parsed = feedbackListSchema.safeParse(req.query)
  const { page, pageSize, offset } = parsePagination(
    parsed.success ? parsed.data.page : undefined,
    parsed.success ? parsed.data.pageSize : undefined,
    { pageSize: 20 }
  )

  const rows = await queryRows<SkillFeedbackRow[]>(
    `SELECT
      fb.id,
      fb.status,
      fb.comment,
      fb.model_name,
      fb.input_tokens,
      fb.output_tokens,
      fb.total_tokens,
      fb.cost_amount,
      fb.created_at,
      u.id AS user_id,
      u.nickname AS user_nickname,
      u.avatar_url AS user_avatar_url,
      u.display_color AS user_color
    FROM skill_feedbacks fb
    INNER JOIN users u ON u.id = fb.user_id
    WHERE fb.skill_id = ?
      AND fb.is_public = 1
    ORDER BY fb.created_at DESC
    LIMIT ? OFFSET ?`,
    [skillId, pageSize, offset]
  )

  const countRows = await queryRows<CountRow[]>(
    `SELECT COUNT(1) AS total
    FROM skill_feedbacks
    WHERE skill_id = ?
      AND is_public = 1`,
    [skillId]
  )

  const total = countRows[0]?.total ?? 0

  sendSuccess(res, {
    list: rows.map((row) => ({
      id: row.id,
      status: row.status,
      comment: row.comment,
      modelName: row.model_name,
      inputTokens: row.input_tokens,
      outputTokens: row.output_tokens,
      totalTokens: row.total_tokens,
      costAmount: row.cost_amount,
      createdAt: row.created_at,
      user: {
        id: row.user_id,
        nickname: row.user_nickname,
        avatarUrl: row.user_avatar_url,
        displayColor: row.user_color
      }
    })),
    pagination: buildPaginationMeta(page, pageSize, total)
  })
})
