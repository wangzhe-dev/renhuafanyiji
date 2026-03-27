import { Router } from 'express'
import type { RowDataPacket } from 'mysql2/promise'
import { z } from 'zod'
import { execWrite, queryRows } from '../db'
import { optionalAuth, requireAuth } from '../middlewares/auth'
import { safeParseJson, stringifyJson } from '../utils/json'
import { buildPaginationMeta, parsePagination } from '../utils/pagination'
import { sendError, sendSuccess } from '../utils/response'

type FeedRow = RowDataPacket & {
  id: number
  user_id: number
  skill_id: number | null
  model_name: string
  total_tokens: number | null
  cost_amount: string | null
  currency: string
  reaction: 'worth' | 'ok' | 'regret' | 'addicted' | null
  note_text: string
  images_json: unknown
  created_at: string
  nickname: string
  display_color: string | null
  skill_title: string | null
  skill_scene: string | null
  like_count: number
  comment_count: number
  resonate_count: number
  liked: number
  resonated: number
}

type PostIdRow = RowDataPacket & { id: number }
type PostOwnerRow = RowDataPacket & { id: number; user_id: number }
type SkillIdRow = RowDataPacket & { id: number }
type ModelLookupRow = RowDataPacket & { id: number; model_name: string; is_active: number }
type CountRow = RowDataPacket & { total: number }

type CommentRow = RowDataPacket & {
  id: number
  usage_record_id: number
  user_id: number
  parent_id: number | null
  content: string
  created_at: string
  updated_at: string
  nickname: string
  display_color: string | null
  like_count: number
  liked: number
}

type CommentIdRow = RowDataPacket & { id: number; usage_record_id: number }
type CommentLikeCountRow = RowDataPacket & { total: number }

const reactionEnum = z.enum(['worth', 'ok', 'regret', 'addicted'])

const createPostSchema = z.object({
  skillId: z.coerce.number().int().positive().optional().nullable(),
  modelId: z.coerce.number().int().positive().optional().nullable(),
  modelName: z.string().trim().max(64).optional(),
  inputTokens: z.coerce.number().int().nonnegative().optional().nullable(),
  outputTokens: z.coerce.number().int().nonnegative().optional().nullable(),
  totalTokens: z.coerce.number().int().nonnegative().optional().nullable(),
  costAmount: z.coerce.number().nonnegative().optional().nullable(),
  currency: z.string().trim().length(3).optional().default('CNY'),
  reaction: reactionEnum.optional().nullable(),
  noteText: z.string().trim().min(1).max(2000),
  images: z.array(z.string().trim().min(1).max(500)).max(9).optional().default([])
}).refine((payload) => {
  return Boolean(payload.modelId) || Boolean(`${payload.modelName ?? ''}`.trim())
}, { message: '请至少提供 modelId 或 modelName' })

const updateReactionSchema = z.object({
  reaction: reactionEnum.nullable()
})

const updateImagesSchema = z.object({
  images: z.array(z.string().trim().min(1).max(500)).max(9).optional().default([])
})

const createCommentSchema = z.object({
  content: z.string().trim().min(1).max(1000),
  parentId: z.coerce.number().int().positive().optional().nullable()
})

const parsePositiveId = (value: unknown): number | null => {
  const raw = Array.isArray(value) ? value[0] : value
  const n = Number(raw)
  if (!Number.isInteger(n) || n <= 0) return null
  return n
}

const FEED_BASE_SELECT_SQL = `SELECT
  sur.id,
  sur.user_id,
  sur.skill_id,
  sur.model_name,
  sur.total_tokens,
  sur.cost_amount,
  sur.currency,
  sur.reaction,
  sur.note_text,
  sur.images_json,
  sur.created_at,
  u.nickname,
  u.display_color,
  s.title AS skill_title,
  s.scene AS skill_scene,
  COALESCE(like_agg.like_count, 0) AS like_count,
  COALESCE(comment_agg.comment_count, 0) AS comment_count,
  COALESCE(resonate_agg.resonate_count, 0) AS resonate_count,
  CASE WHEN my_like.user_id IS NULL THEN 0 ELSE 1 END AS liked,
  CASE WHEN my_resonate.user_id IS NULL THEN 0 ELSE 1 END AS resonated
FROM skill_usage_records sur
INNER JOIN users u ON u.id = sur.user_id
LEFT JOIN skills s ON s.id = sur.skill_id
LEFT JOIN (
  SELECT usage_record_id, COUNT(1) AS like_count
  FROM feed_post_likes
  GROUP BY usage_record_id
) like_agg ON like_agg.usage_record_id = sur.id
LEFT JOIN (
  SELECT usage_record_id, COUNT(1) AS comment_count
  FROM feed_post_comments
  GROUP BY usage_record_id
) comment_agg ON comment_agg.usage_record_id = sur.id
LEFT JOIN (
  SELECT usage_record_id, COUNT(1) AS resonate_count
  FROM feed_post_resonates
  GROUP BY usage_record_id
) resonate_agg ON resonate_agg.usage_record_id = sur.id
LEFT JOIN feed_post_likes my_like ON my_like.usage_record_id = sur.id AND my_like.user_id = ?
LEFT JOIN feed_post_resonates my_resonate ON my_resonate.usage_record_id = sur.id AND my_resonate.user_id = ?`

const COMMENT_BASE_SELECT_SQL = `SELECT
  c.id,
  c.usage_record_id,
  c.user_id,
  c.parent_id,
  c.content,
  c.created_at,
  c.updated_at,
  u.nickname,
  u.display_color,
  COALESCE(like_agg.like_count, 0) AS like_count,
  CASE WHEN my_like.user_id IS NULL THEN 0 ELSE 1 END AS liked
FROM feed_post_comments c
INNER JOIN users u ON u.id = c.user_id
LEFT JOIN (
  SELECT comment_id, COUNT(1) AS like_count
  FROM feed_post_comment_likes
  GROUP BY comment_id
) like_agg ON like_agg.comment_id = c.id
LEFT JOIN feed_post_comment_likes my_like ON my_like.comment_id = c.id AND my_like.user_id = ?`

const mapFeedItem = (row: FeedRow) => ({
  id: row.id,
  modelName: row.model_name,
  totalTokens: row.total_tokens,
  costAmount: row.cost_amount,
  currency: row.currency,
  reaction: row.reaction,
  noteText: row.note_text,
  images: safeParseJson<string[]>(row.images_json, []),
  createdAt: row.created_at,
  likes: row.like_count ?? 0,
  comments: row.comment_count ?? 0,
  meoo: row.resonate_count ?? 0,
  liked: (row.liked ?? 0) > 0,
  myMeoo: (row.resonated ?? 0) > 0,
  user: {
    id: row.user_id,
    nickname: row.nickname,
    displayColor: row.display_color
  },
  skill: row.skill_id
    ? { id: row.skill_id, title: row.skill_title, scene: row.skill_scene }
    : null
})

const mapCommentItem = (row: CommentRow) => ({
  id: row.id,
  postId: row.usage_record_id,
  userId: row.user_id,
  parentId: row.parent_id,
  content: row.content,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  likes: row.like_count ?? 0,
  liked: (row.liked ?? 0) > 0,
  user: {
    id: row.user_id,
    nickname: row.nickname,
    displayColor: row.display_color
  }
})

const ensureFeedPostExists = async (postId: number): Promise<boolean> => {
  const rows = await queryRows<PostIdRow[]>(
    `SELECT id
    FROM skill_usage_records
    WHERE id = ?
      AND note_text IS NOT NULL
      AND note_text != ''
    LIMIT 1`,
    [postId]
  )
  return rows.length > 0
}

const getFeedItemById = async (postId: number, viewerId: number): Promise<FeedRow | null> => {
  const rows = await queryRows<FeedRow[]>(
    `${FEED_BASE_SELECT_SQL}
    WHERE sur.id = ?
      AND sur.note_text IS NOT NULL
      AND sur.note_text != ''
    LIMIT 1`,
    [viewerId, viewerId, postId]
  )

  return rows[0] ?? null
}

const ensureCommentExists = async (commentId: number): Promise<CommentIdRow | null> => {
  const rows = await queryRows<CommentIdRow[]>(
    `SELECT id, usage_record_id
    FROM feed_post_comments
    WHERE id = ?
    LIMIT 1`,
    [commentId]
  )
  return rows[0] ?? null
}

const getCommentById = async (commentId: number, viewerId: number): Promise<CommentRow | null> => {
  const rows = await queryRows<CommentRow[]>(
    `${COMMENT_BASE_SELECT_SQL}
    WHERE c.id = ?
    LIMIT 1`,
    [viewerId, commentId]
  )
  return rows[0] ?? null
}

export const feedRouter = Router()

// GET /feed — 公开动态列表
feedRouter.get('/', optionalAuth, async (req, res) => {
  const { page, pageSize, offset } = parsePagination(req.query.page, req.query.pageSize, {
    pageSize: 20,
    maxPageSize: 50
  })
  const viewerId = req.auth?.userId ?? 0

  const rows = await queryRows<FeedRow[]>(
    `${FEED_BASE_SELECT_SQL}
    WHERE sur.note_text IS NOT NULL
      AND sur.note_text != ''
    ORDER BY sur.created_at DESC, sur.id DESC
    LIMIT ? OFFSET ?`,
    [viewerId, viewerId, pageSize, offset]
  )

  const countRows = await queryRows<CountRow[]>(
    `SELECT COUNT(1) AS total
    FROM skill_usage_records
    WHERE note_text IS NOT NULL
      AND note_text != ''`
  )
  const total = countRows[0]?.total ?? 0

  sendSuccess(res, {
    list: rows.map(mapFeedItem),
    pagination: buildPaginationMeta(page, pageSize, total)
  })
})

// POST /feed — 发布动态
feedRouter.post('/', requireAuth, async (req, res) => {
  const parsed = createPostSchema.safeParse(req.body)
  if (!parsed.success) {
    sendError(res, '发布参数不合法', 400)
    return
  }

  const payload = parsed.data
  const userId = req.auth!.userId

  let resolvedModelId: number | null = null
  let resolvedModelName = `${payload.modelName ?? ''}`.trim()
  if (payload.modelId) {
    try {
      const modelRows = await queryRows<ModelLookupRow[]>(
        `SELECT id, model_name, is_active
        FROM ai_models
        WHERE id = ?
        LIMIT 1`,
        [payload.modelId]
      )
      const model = modelRows[0]
      if (!model || model.is_active !== 1) {
        sendError(res, '模型不存在或已下线', 400)
        return
      }
      resolvedModelId = model.id
      resolvedModelName = model.model_name
    } catch {
      // 旧库可能尚未创建 ai_models 表，回退为 modelName 兼容路径
    }
  }
  if (!resolvedModelId && resolvedModelName) {
    try {
      const modelRows = await queryRows<ModelLookupRow[]>(
        `SELECT id, model_name, is_active
        FROM ai_models
        WHERE LOWER(TRIM(model_name)) = LOWER(TRIM(?))
          OR LOWER(TRIM(model_key)) = LOWER(TRIM(?))
        ORDER BY is_recommended DESC, sort_no ASC, id ASC
        LIMIT 1`,
        [resolvedModelName, resolvedModelName]
      )
      const model = modelRows[0]
      if (model) {
        if (model.is_active !== 1) {
          sendError(res, '模型已下线，请重新选择', 400)
          return
        }
        resolvedModelId = model.id
        resolvedModelName = model.model_name
      }
    } catch {
      // 旧库可能尚未创建 ai_models 表，保留 modelName 兼容路径
    }
  }
  if (!resolvedModelName) {
    sendError(res, '请选择模型', 400)
    return
  }

  if (payload.skillId) {
    const skillRows = await queryRows<SkillIdRow[]>(
      `SELECT id
      FROM skills
      WHERE id = ?
      LIMIT 1`,
      [payload.skillId]
    )
    if (!skillRows[0]) {
      sendError(res, '关联的 Skill 不存在', 404)
      return
    }
  }

  const result = await execWrite(
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
    ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      payload.skillId ?? null,
      resolvedModelName,
      payload.inputTokens ?? null,
      payload.outputTokens ?? null,
      payload.totalTokens ?? null,
      payload.costAmount ?? null,
      payload.currency,
      payload.reaction ?? null,
      payload.noteText,
      stringifyJson(payload.images ?? [])
    ]
  )

  const postId = Number(result.insertId)
  if (resolvedModelId) {
    try {
      await execWrite(
        `UPDATE skill_usage_records
        SET model_id = ?
        WHERE id = ?`,
        [resolvedModelId, postId]
      )
    } catch {
      // 旧库可能未执行 model_id 升级，保持兼容
    }

    try {
      await execWrite(
        `INSERT INTO user_recent_models (user_id, model_id, last_used_at, use_count)
        VALUES (?, ?, CURRENT_TIMESTAMP, 1)
        ON DUPLICATE KEY UPDATE
          last_used_at = CURRENT_TIMESTAMP,
          use_count = use_count + 1`,
        [userId, resolvedModelId]
      )
    } catch {
      // 最近使用写入失败不影响发布主流程
    }
  }

  const row = await getFeedItemById(postId, userId)
  if (!row) {
    sendSuccess(res, { id: postId }, '发布成功')
    return
  }

  sendSuccess(res, mapFeedItem(row), '发布成功')
})

// PUT /feed/:id/images — 更新动态图片（仅本人）
feedRouter.put('/:id/images', requireAuth, async (req, res) => {
  const postId = parsePositiveId(req.params.id)
  if (!postId) {
    sendError(res, '动态 ID 不合法', 400)
    return
  }

  const parsed = updateImagesSchema.safeParse(req.body)
  if (!parsed.success) {
    sendError(res, '图片参数不合法', 400)
    return
  }

  const postRows = await queryRows<PostOwnerRow[]>(
    `SELECT id, user_id
    FROM skill_usage_records
    WHERE id = ?
      AND note_text IS NOT NULL
      AND note_text != ''
    LIMIT 1`,
    [postId]
  )

  const post = postRows[0]
  if (!post) {
    sendError(res, '动态不存在', 404)
    return
  }

  const userId = req.auth!.userId
  if (post.user_id !== userId) {
    sendError(res, '仅可修改自己的动态图片', 403)
    return
  }

  await execWrite(
    `UPDATE skill_usage_records
    SET images_json = ?
    WHERE id = ?`,
    [stringifyJson(parsed.data.images), postId]
  )

  const row = await getFeedItemById(postId, userId)
  if (!row) {
    sendSuccess(res, { id: postId, images: parsed.data.images }, '图片更新成功')
    return
  }

  sendSuccess(res, mapFeedItem(row), '图片更新成功')
})

// POST /feed/:id/like — 点赞
feedRouter.post('/:id/like', requireAuth, async (req, res) => {
  const postId = parsePositiveId(req.params.id)
  if (!postId) {
    sendError(res, '动态 ID 不合法', 400)
    return
  }

  if (!(await ensureFeedPostExists(postId))) {
    sendError(res, '动态不存在', 404)
    return
  }

  const userId = req.auth!.userId
  await execWrite(
    `INSERT IGNORE INTO feed_post_likes (usage_record_id, user_id)
    VALUES (?, ?)`,
    [postId, userId]
  )

  const countRows = await queryRows<CountRow[]>(
    `SELECT COUNT(1) AS total
    FROM feed_post_likes
    WHERE usage_record_id = ?`,
    [postId]
  )

  sendSuccess(res, {
    postId,
    liked: true,
    likes: countRows[0]?.total ?? 0
  })
})

// DELETE /feed/:id/like — 取消点赞
feedRouter.delete('/:id/like', requireAuth, async (req, res) => {
  const postId = parsePositiveId(req.params.id)
  if (!postId) {
    sendError(res, '动态 ID 不合法', 400)
    return
  }

  if (!(await ensureFeedPostExists(postId))) {
    sendError(res, '动态不存在', 404)
    return
  }

  const userId = req.auth!.userId
  await execWrite(
    `DELETE FROM feed_post_likes
    WHERE usage_record_id = ?
      AND user_id = ?`,
    [postId, userId]
  )

  const countRows = await queryRows<CountRow[]>(
    `SELECT COUNT(1) AS total
    FROM feed_post_likes
    WHERE usage_record_id = ?`,
    [postId]
  )

  sendSuccess(res, {
    postId,
    liked: false,
    likes: countRows[0]?.total ?? 0
  })
})

// POST /feed/:id/meoo — 我也是
feedRouter.post('/:id/meoo', requireAuth, async (req, res) => {
  const postId = parsePositiveId(req.params.id)
  if (!postId) {
    sendError(res, '动态 ID 不合法', 400)
    return
  }

  if (!(await ensureFeedPostExists(postId))) {
    sendError(res, '动态不存在', 404)
    return
  }

  const userId = req.auth!.userId
  await execWrite(
    `INSERT IGNORE INTO feed_post_resonates (usage_record_id, user_id)
    VALUES (?, ?)`,
    [postId, userId]
  )

  const countRows = await queryRows<CountRow[]>(
    `SELECT COUNT(1) AS total
    FROM feed_post_resonates
    WHERE usage_record_id = ?`,
    [postId]
  )

  sendSuccess(res, {
    postId,
    myMeoo: true,
    meoo: countRows[0]?.total ?? 0
  })
})

// DELETE /feed/:id/meoo — 取消我也是
feedRouter.delete('/:id/meoo', requireAuth, async (req, res) => {
  const postId = parsePositiveId(req.params.id)
  if (!postId) {
    sendError(res, '动态 ID 不合法', 400)
    return
  }

  if (!(await ensureFeedPostExists(postId))) {
    sendError(res, '动态不存在', 404)
    return
  }

  const userId = req.auth!.userId
  await execWrite(
    `DELETE FROM feed_post_resonates
    WHERE usage_record_id = ?
      AND user_id = ?`,
    [postId, userId]
  )

  const countRows = await queryRows<CountRow[]>(
    `SELECT COUNT(1) AS total
    FROM feed_post_resonates
    WHERE usage_record_id = ?`,
    [postId]
  )

  sendSuccess(res, {
    postId,
    myMeoo: false,
    meoo: countRows[0]?.total ?? 0
  })
})

// PUT /feed/:id/reaction — 更新动态感受（仅本人）
feedRouter.put('/:id/reaction', requireAuth, async (req, res) => {
  const postId = parsePositiveId(req.params.id)
  if (!postId) {
    sendError(res, '动态 ID 不合法', 400)
    return
  }

  const parsed = updateReactionSchema.safeParse(req.body)
  if (!parsed.success) {
    sendError(res, '感受参数不合法', 400)
    return
  }

  const postRows = await queryRows<PostOwnerRow[]>(
    `SELECT id, user_id
    FROM skill_usage_records
    WHERE id = ?
      AND note_text IS NOT NULL
      AND note_text != ''
    LIMIT 1`,
    [postId]
  )
  const post = postRows[0]
  if (!post) {
    sendError(res, '动态不存在', 404)
    return
  }

  const userId = req.auth!.userId
  if (post.user_id !== userId) {
    sendError(res, '仅可修改自己的动态感受', 403)
    return
  }

  await execWrite(
    `UPDATE skill_usage_records
    SET reaction = ?
    WHERE id = ?`,
    [parsed.data.reaction ?? null, postId]
  )

  sendSuccess(res, {
    postId,
    reaction: parsed.data.reaction ?? null
  })
})

// GET /feed/:id/comments — 评论列表
feedRouter.get('/:id/comments', optionalAuth, async (req, res) => {
  const postId = parsePositiveId(req.params.id)
  if (!postId) {
    sendError(res, '动态 ID 不合法', 400)
    return
  }

  if (!(await ensureFeedPostExists(postId))) {
    sendError(res, '动态不存在', 404)
    return
  }

  const { page, pageSize, offset } = parsePagination(req.query.page, req.query.pageSize, {
    pageSize: 20,
    maxPageSize: 100
  })
  const viewerId = req.auth?.userId ?? 0

  const rows = await queryRows<CommentRow[]>(
    `${COMMENT_BASE_SELECT_SQL}
    WHERE c.usage_record_id = ?
    ORDER BY c.created_at DESC, c.id DESC
    LIMIT ? OFFSET ?`,
    [viewerId, postId, pageSize, offset]
  )

  const countRows = await queryRows<CountRow[]>(
    `SELECT COUNT(1) AS total
    FROM feed_post_comments
    WHERE usage_record_id = ?`,
    [postId]
  )
  const total = countRows[0]?.total ?? 0

  sendSuccess(res, {
    list: rows.map(mapCommentItem),
    pagination: buildPaginationMeta(page, pageSize, total)
  })
})

// POST /feed/:id/comments — 发表评论
feedRouter.post('/:id/comments', requireAuth, async (req, res) => {
  const postId = parsePositiveId(req.params.id)
  if (!postId) {
    sendError(res, '动态 ID 不合法', 400)
    return
  }

  if (!(await ensureFeedPostExists(postId))) {
    sendError(res, '动态不存在', 404)
    return
  }

  const parsed = createCommentSchema.safeParse(req.body)
  if (!parsed.success) {
    sendError(res, '评论参数不合法', 400)
    return
  }

  const userId = req.auth!.userId
  const payload = parsed.data

  if (payload.parentId) {
    const parent = await ensureCommentExists(payload.parentId)
    if (!parent || parent.usage_record_id !== postId) {
      sendError(res, '父评论不存在', 404)
      return
    }
  }

  const result = await execWrite(
    `INSERT INTO feed_post_comments (
      usage_record_id,
      user_id,
      parent_id,
      content
    ) VALUES (?, ?, ?, ?)`,
    [postId, userId, payload.parentId ?? null, payload.content]
  )

  const commentId = Number(result.insertId)
  const row = await getCommentById(commentId, userId)
  if (!row) {
    sendSuccess(res, { id: commentId, postId }, '评论成功')
    return
  }

  const countRows = await queryRows<CountRow[]>(
    `SELECT COUNT(1) AS total
    FROM feed_post_comments
    WHERE usage_record_id = ?`,
    [postId]
  )

  sendSuccess(
    res,
    {
      comment: mapCommentItem(row),
      comments: countRows[0]?.total ?? 0
    },
    '评论成功'
  )
})

// POST /feed/comments/:id/like — 点赞评论
feedRouter.post('/comments/:id/like', requireAuth, async (req, res) => {
  const commentId = parsePositiveId(req.params.id)
  if (!commentId) {
    sendError(res, '评论 ID 不合法', 400)
    return
  }

  const comment = await ensureCommentExists(commentId)
  if (!comment) {
    sendError(res, '评论不存在', 404)
    return
  }

  const userId = req.auth!.userId
  await execWrite(
    `INSERT IGNORE INTO feed_post_comment_likes (comment_id, user_id)
    VALUES (?, ?)`,
    [commentId, userId]
  )

  const countRows = await queryRows<CommentLikeCountRow[]>(
    `SELECT COUNT(1) AS total
    FROM feed_post_comment_likes
    WHERE comment_id = ?`,
    [commentId]
  )

  sendSuccess(res, {
    commentId,
    liked: true,
    likes: countRows[0]?.total ?? 0
  })
})

// DELETE /feed/comments/:id/like — 取消评论点赞
feedRouter.delete('/comments/:id/like', requireAuth, async (req, res) => {
  const commentId = parsePositiveId(req.params.id)
  if (!commentId) {
    sendError(res, '评论 ID 不合法', 400)
    return
  }

  const comment = await ensureCommentExists(commentId)
  if (!comment) {
    sendError(res, '评论不存在', 404)
    return
  }

  const userId = req.auth!.userId
  await execWrite(
    `DELETE FROM feed_post_comment_likes
    WHERE comment_id = ?
      AND user_id = ?`,
    [commentId, userId]
  )

  const countRows = await queryRows<CommentLikeCountRow[]>(
    `SELECT COUNT(1) AS total
    FROM feed_post_comment_likes
    WHERE comment_id = ?`,
    [commentId]
  )

  sendSuccess(res, {
    commentId,
    liked: false,
    likes: countRows[0]?.total ?? 0
  })
})

// GET /feed/:id — 单条动态详情
feedRouter.get('/:id', optionalAuth, async (req, res) => {
  const postId = parsePositiveId(req.params.id)
  if (!postId) {
    sendError(res, '动态 ID 不合法', 400)
    return
  }

  const viewerId = req.auth?.userId ?? 0
  const row = await getFeedItemById(postId, viewerId)
  if (!row) {
    sendError(res, '动态不存在', 404)
    return
  }

  sendSuccess(res, mapFeedItem(row))
})
