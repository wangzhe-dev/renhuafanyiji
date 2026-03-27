import { Router } from 'express'
import type { RowDataPacket } from 'mysql2/promise'
import { z } from 'zod'
import { queryRows } from '../db'
import { requireAuth } from '../middlewares/auth'
import { sendError, sendSuccess } from '../utils/response'

type AiModelRow = RowDataPacket & {
  id: number
  provider_code: string
  model_key: string
  model_name: string
  is_active: number
  is_recommended: number
  sort_no: number
}

type RecentModelRow = AiModelRow & {
  last_used_at: string
  use_count: number
}

const recentQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).optional().default(8)
})

const parseActive = (raw: unknown): 0 | 1 | null => {
  if (raw === undefined || raw === null || `${raw}`.trim() === '') return 1
  const n = Number(raw)
  if (n === 0 || n === 1) return n
  return null
}

const mapModel = (row: AiModelRow) => ({
  id: row.id,
  providerCode: row.provider_code,
  modelKey: row.model_key,
  modelName: row.model_name,
  isActive: row.is_active === 1,
  isRecommended: row.is_recommended === 1,
  sortNo: row.sort_no
})

export const modelsRouter = Router()

// GET /models
modelsRouter.get('/', async (req, res) => {
  const active = parseActive(req.query.active)
  if (active === null) {
    sendError(res, 'active 参数仅支持 0 或 1', 400)
    return
  }

  const keyword = `${req.query.keyword ?? ''}`.trim()
  const limitRaw = Number(req.query.limit ?? 300)
  const limit = Number.isInteger(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 500) : 300

  try {
    const rows = await queryRows<AiModelRow[]>(
      `SELECT id, provider_code, model_key, model_name, is_active, is_recommended, sort_no
      FROM ai_models
      WHERE is_active = ?
        AND (? = '' OR model_name LIKE ? OR model_key LIKE ? OR provider_code LIKE ?)
      ORDER BY is_recommended DESC, sort_no ASC, id ASC
      LIMIT ?`,
      [active, keyword, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`, limit]
    )

    sendSuccess(res, rows.map(mapModel))
  } catch {
    // 旧库可能尚未创建 ai_models 表，返回空列表保持前端可用
    sendSuccess(res, [])
  }
})

// GET /models/recent
modelsRouter.get('/recent', requireAuth, async (req, res) => {
  const parsed = recentQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    sendError(res, '参数不合法', 400)
    return
  }

  const userId = req.auth!.userId
  const { limit } = parsed.data

  try {
    const rows = await queryRows<RecentModelRow[]>(
      `SELECT
        m.id,
        m.provider_code,
        m.model_key,
        m.model_name,
        m.is_active,
        m.is_recommended,
        m.sort_no,
        r.last_used_at,
        r.use_count
      FROM user_recent_models r
      INNER JOIN ai_models m ON m.id = r.model_id
      WHERE r.user_id = ?
        AND m.is_active = 1
      ORDER BY r.last_used_at DESC, r.id DESC
      LIMIT ?`,
      [userId, limit]
    )

    sendSuccess(
      res,
      rows.map((row) => ({
        ...mapModel(row),
        lastUsedAt: row.last_used_at,
        useCount: row.use_count
      }))
    )
  } catch {
    // 旧库可能尚未创建 user_recent_models / ai_models 表，返回空列表保持前端可用
    sendSuccess(res, [])
  }
})
