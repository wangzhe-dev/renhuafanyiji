import { Router } from 'express'
import type { RowDataPacket } from 'mysql2/promise'
import { z } from 'zod'
import { execWrite, queryRows } from '../db'
import { requireAuth } from '../middlewares/auth'
import { buildPaginationMeta, parsePagination } from '../utils/pagination'
import { sendError, sendSuccess } from '../utils/response'
import { mapUser, type UserRow } from './shared'

type CountRow = RowDataPacket & { total: number }

type MySkillRow = RowDataPacket & {
  id: number
  title: string
  scene: string | null
  status: number
  publish_at: string | null
  copy_count: number
  favorite_count: number
  feedback_count: number
  success_rate: number | null
  updated_at: string
}

type MyFavoriteRow = RowDataPacket & {
  favorite_id: number
  favored_at: string
  skill_id: number
  title: string
  scene: string | null
  copy_count: number
  favorite_count: number
  success_rate: number | null
  creator_id: number
  creator_name: string
}

type MyCopyRow = RowDataPacket & {
  id: number
  skill_id: number
  source_channel: string | null
  copied_text_hash: string | null
  created_at: string
  title: string | null
  scene: string | null
}

type MyLikeRow = RowDataPacket & {
  like_id: number
  liked_at: string
  post_id: number
  post_text: string
  model_name: string
  post_created_at: string
  post_like_count: number
  post_comment_count: number
  author_id: number
  author_name: string
  skill_id: number | null
  skill_title: string | null
  skill_scene: string | null
}

type MySummaryRow = RowDataPacket & {
  published_count: number
  favorite_count: number
  like_count: number
  copy_count: number
}

const listSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional()
})

const updateAvatarSchema = z.object({
  avatarUrl: z.string().trim().min(1).max(500)
})

export const meRouter = Router()

meRouter.use(requireAuth)

meRouter.get('/profile', async (req, res) => {
  const userId = req.auth!.userId

  const rows = await queryRows<UserRow[]>(
    `SELECT
      id,
      mobile,
      email,
      password_hash,
      nickname,
      avatar_url,
      bio,
      display_color,
      status,
      published_skill_count,
      total_copy_count,
      avg_success_rate,
      last_login_at,
      created_at,
      updated_at
    FROM users
    WHERE id = ?
    LIMIT 1`,
    [userId]
  )

  const user = rows[0]
  sendSuccess(res, user ? mapUser(user) : null)
})

meRouter.put('/avatar', async (req, res) => {
  const parsed = updateAvatarSchema.safeParse(req.body)
  if (!parsed.success) {
    sendError(res, '头像参数不合法', 400)
    return
  }

  const userId = req.auth!.userId
  await execWrite(
    `UPDATE users
    SET avatar_url = ?
    WHERE id = ?`,
    [parsed.data.avatarUrl, userId]
  )

  sendSuccess(res, { avatarUrl: parsed.data.avatarUrl }, '头像更新成功')
})

meRouter.get('/summary', async (req, res) => {
  const userId = req.auth!.userId

  const rows = await queryRows<MySummaryRow[]>(
    `SELECT
      u.published_skill_count AS published_count,
      (
        SELECT COUNT(1)
        FROM skill_favorites f
        WHERE f.user_id = ?
      ) AS favorite_count,
      (
        SELECT COUNT(1)
        FROM feed_post_likes l
        INNER JOIN skill_usage_records sur ON sur.id = l.usage_record_id
        WHERE l.user_id = ?
          AND sur.note_text IS NOT NULL
          AND TRIM(sur.note_text) <> ''
      ) AS like_count,
      (
        SELECT COUNT(1)
        FROM skill_copies c
        WHERE c.user_id = ?
      ) AS copy_count
    FROM users u
    WHERE u.id = ?
    LIMIT 1`,
    [userId, userId, userId, userId]
  )

  const row = rows[0]
  sendSuccess(res, {
    publishedCount: row?.published_count ?? 0,
    favoriteCount: row?.favorite_count ?? 0,
    likeCount: row?.like_count ?? 0,
    copyCount: row?.copy_count ?? 0
  })
})

meRouter.get('/skills', async (req, res) => {
  const parsed = listSchema.safeParse(req.query)
  const { page, pageSize, offset } = parsePagination(parsed.success ? parsed.data.page : undefined, parsed.success ? parsed.data.pageSize : undefined)

  const statusValue = req.query.status
  const normalizedStatus = statusValue === undefined || statusValue === null || statusValue === '' ? null : Number(statusValue)

  const userId = req.auth!.userId

  const rows = await queryRows<MySkillRow[]>(
    `SELECT
      id,
      title,
      scene,
      status,
      publish_at,
      copy_count,
      favorite_count,
      feedback_count,
      success_rate,
      updated_at
    FROM skills
    WHERE creator_id = ?
      AND (? IS NULL OR status = ?)
    ORDER BY updated_at DESC
    LIMIT ? OFFSET ?`,
    [userId, normalizedStatus, normalizedStatus, pageSize, offset]
  )

  const countRows = await queryRows<CountRow[]>(
    `SELECT COUNT(1) AS total
    FROM skills
    WHERE creator_id = ?
      AND (? IS NULL OR status = ?)`,
    [userId, normalizedStatus, normalizedStatus]
  )

  const total = countRows[0]?.total ?? 0

  sendSuccess(res, {
    list: rows.map((row) => ({
      id: row.id,
      title: row.title,
      scene: row.scene,
      status: row.status,
      publishAt: row.publish_at,
      copyCount: row.copy_count,
      favoriteCount: row.favorite_count,
      feedbackCount: row.feedback_count,
      successRate: row.success_rate,
      updatedAt: row.updated_at
    })),
    pagination: buildPaginationMeta(page, pageSize, total)
  })
})

meRouter.get('/favorites', async (req, res) => {
  const parsed = listSchema.safeParse(req.query)
  const { page, pageSize, offset } = parsePagination(parsed.success ? parsed.data.page : undefined, parsed.success ? parsed.data.pageSize : undefined)

  const userId = req.auth!.userId

  const rows = await queryRows<MyFavoriteRow[]>(
    `SELECT
      f.id AS favorite_id,
      f.created_at AS favored_at,
      s.id AS skill_id,
      s.title,
      s.scene,
      s.copy_count,
      s.favorite_count,
      s.success_rate,
      u.id AS creator_id,
      u.nickname AS creator_name
    FROM skill_favorites f
    INNER JOIN skills s ON s.id = f.skill_id
    INNER JOIN users u ON u.id = s.creator_id
    WHERE f.user_id = ?
    ORDER BY f.created_at DESC
    LIMIT ? OFFSET ?`,
    [userId, pageSize, offset]
  )

  const countRows = await queryRows<CountRow[]>('SELECT COUNT(1) AS total FROM skill_favorites WHERE user_id = ?', [userId])
  const total = countRows[0]?.total ?? 0

  sendSuccess(res, {
    list: rows.map((row) => ({
      favoriteId: row.favorite_id,
      favoredAt: row.favored_at,
      skill: {
        id: row.skill_id,
        title: row.title,
        scene: row.scene,
        copyCount: row.copy_count,
        favoriteCount: row.favorite_count,
        successRate: row.success_rate,
        creator: {
          id: row.creator_id,
          nickname: row.creator_name
        }
      }
    })),
    pagination: buildPaginationMeta(page, pageSize, total)
  })
})

meRouter.get('/copies', async (req, res) => {
  const parsed = listSchema.safeParse(req.query)
  const { page, pageSize, offset } = parsePagination(parsed.success ? parsed.data.page : undefined, parsed.success ? parsed.data.pageSize : undefined)

  const userId = req.auth!.userId

  const rows = await queryRows<MyCopyRow[]>(
    `SELECT
      c.id,
      c.skill_id,
      c.source_channel,
      c.copied_text_hash,
      c.created_at,
      s.title,
      s.scene
    FROM skill_copies c
    LEFT JOIN skills s ON s.id = c.skill_id
    WHERE c.user_id = ?
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?`,
    [userId, pageSize, offset]
  )

  const countRows = await queryRows<CountRow[]>('SELECT COUNT(1) AS total FROM skill_copies WHERE user_id = ?', [userId])
  const total = countRows[0]?.total ?? 0

  sendSuccess(res, {
    list: rows.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      sourceChannel: row.source_channel,
      copiedTextHash: row.copied_text_hash,
      skill: row.skill_id
        ? {
            id: row.skill_id,
            title: row.title,
            scene: row.scene
          }
        : null
    })),
    pagination: buildPaginationMeta(page, pageSize, total)
  })
})

meRouter.get('/likes', async (req, res) => {
  const parsed = listSchema.safeParse(req.query)
  const { page, pageSize, offset } = parsePagination(parsed.success ? parsed.data.page : undefined, parsed.success ? parsed.data.pageSize : undefined)

  const userId = req.auth!.userId

  const rows = await queryRows<MyLikeRow[]>(
    `SELECT
      l.id AS like_id,
      l.created_at AS liked_at,
      sur.id AS post_id,
      sur.note_text AS post_text,
      sur.model_name,
      sur.created_at AS post_created_at,
      (
        SELECT COUNT(1)
        FROM feed_post_likes fl
        WHERE fl.usage_record_id = sur.id
      ) AS post_like_count,
      (
        SELECT COUNT(1)
        FROM feed_post_comments fc
        WHERE fc.usage_record_id = sur.id
      ) AS post_comment_count,
      u.id AS author_id,
      u.nickname AS author_name,
      s.id AS skill_id,
      s.title AS skill_title,
      s.scene AS skill_scene
    FROM feed_post_likes l
    INNER JOIN skill_usage_records sur ON sur.id = l.usage_record_id
    INNER JOIN users u ON u.id = sur.user_id
    LEFT JOIN skills s ON s.id = sur.skill_id
    WHERE l.user_id = ?
      AND sur.note_text IS NOT NULL
      AND TRIM(sur.note_text) <> ''
    ORDER BY l.created_at DESC
    LIMIT ? OFFSET ?`,
    [userId, pageSize, offset]
  )

  const countRows = await queryRows<CountRow[]>(
    `SELECT COUNT(1) AS total
    FROM feed_post_likes l
    INNER JOIN skill_usage_records sur ON sur.id = l.usage_record_id
    WHERE l.user_id = ?
      AND sur.note_text IS NOT NULL
      AND TRIM(sur.note_text) <> ''`,
    [userId]
  )
  const total = countRows[0]?.total ?? 0

  sendSuccess(res, {
    list: rows.map((row) => ({
      likeId: row.like_id,
      likedAt: row.liked_at,
      post: {
        id: row.post_id,
        text: row.post_text,
        modelName: row.model_name,
        createdAt: row.post_created_at,
        likeCount: row.post_like_count,
        commentCount: row.post_comment_count,
        author: {
          id: row.author_id,
          nickname: row.author_name
        },
        skill: row.skill_id
          ? {
              id: row.skill_id,
              title: row.skill_title,
              scene: row.skill_scene
            }
          : null
      }
    })),
    pagination: buildPaginationMeta(page, pageSize, total)
  })
})
