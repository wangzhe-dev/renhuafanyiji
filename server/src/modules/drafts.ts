import { Router } from 'express'
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { z } from 'zod'
import { execWrite, queryRows } from '../db'
import { requireAuth } from '../middlewares/auth'
import { safeParseJson, stringifyJson } from '../utils/json'
import { buildPaginationMeta, parsePagination } from '../utils/pagination'
import { sendError, sendSuccess } from '../utils/response'

type DraftRow = RowDataPacket & {
  id: number
  user_id: number
  title: string | null
  brief: string | null
  category_id: number | null
  scene: string | null
  tags_json: unknown
  prompt: string | null
  system_prompt: string | null
  user_template: string | null
  full_prompt: string | null
  full_prompt_html: string | null
  variable_notes: string | null
  variables_json: unknown
  steps_json: unknown
  use_scenes_json: unknown
  images_json: unknown
  status: number
  last_saved_at: string
  published_skill_id: number | null
  created_at: string
  updated_at: string
}

type CountRow = RowDataPacket & { total: number }

const listSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  status: z.coerce.number().int().min(0).max(2).optional()
})

const saveSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  title: z.string().trim().max(120).optional().nullable(),
  brief: z.string().trim().max(500).optional().nullable(),
  categoryId: z.coerce.number().int().positive().optional().nullable(),
  scene: z.string().trim().max(32).optional().nullable(),
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
    .optional()
    .default([]),
  steps: z.array(z.string().trim().min(1).max(255)).optional().default([]),
  useScenes: z.array(z.string().trim().min(1).max(64)).optional().default([]),
  images: z.array(z.string().trim().min(1).max(500)).optional().default([]),
  status: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional().default(0),
  publishedSkillId: z.coerce.number().int().positive().optional().nullable()
})

const parseDraftId = (raw: string): number | null => {
  const value = Number(raw)
  if (!Number.isInteger(value) || value <= 0) return null
  return value
}

const mapDraft = (row: DraftRow) => ({
  id: row.id,
  title: row.title,
  brief: row.brief,
  categoryId: row.category_id,
  scene: row.scene,
  tags: safeParseJson<string[]>(row.tags_json, []),
  prompt: row.prompt,
  systemPrompt: row.system_prompt,
  userTemplate: row.user_template,
  fullPrompt: row.full_prompt,
  fullPromptHtml: row.full_prompt_html,
  variableNotes: row.variable_notes,
  variables: safeParseJson<Array<{ name: string; desc?: string | null }>>(row.variables_json, []),
  steps: safeParseJson<string[]>(row.steps_json, []),
  useScenes: safeParseJson<string[]>(row.use_scenes_json, []),
  images: safeParseJson<string[]>(row.images_json, []),
  status: row.status,
  lastSavedAt: row.last_saved_at,
  publishedSkillId: row.published_skill_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at
})

export const draftsRouter = Router()

draftsRouter.use(requireAuth)

draftsRouter.get('/', async (req, res) => {
  const parsed = listSchema.safeParse(req.query)
  const query = parsed.success ? parsed.data : {}

  const { page, pageSize, offset } = parsePagination(query.page, query.pageSize, { pageSize: 20 })

  const userId = req.auth!.userId
  const status = query.status === undefined ? null : query.status

  const rows = await queryRows<DraftRow[]>(
    `SELECT
      id,
      user_id,
      title,
      brief,
      category_id,
      scene,
      tags_json,
      prompt,
      system_prompt,
      user_template,
      full_prompt,
      full_prompt_html,
      variable_notes,
      variables_json,
      steps_json,
      use_scenes_json,
      images_json,
      status,
      last_saved_at,
      published_skill_id,
      created_at,
      updated_at
    FROM drafts
    WHERE user_id = ?
      AND (? IS NULL OR status = ?)
    ORDER BY last_saved_at DESC
    LIMIT ? OFFSET ?`,
    [userId, status, status, pageSize, offset]
  )

  const countRows = await queryRows<CountRow[]>(
    `SELECT COUNT(1) AS total
    FROM drafts
    WHERE user_id = ?
      AND (? IS NULL OR status = ?)`,
    [userId, status, status]
  )

  const total = countRows[0]?.total ?? 0

  sendSuccess(res, {
    list: rows.map(mapDraft),
    pagination: buildPaginationMeta(page, pageSize, total)
  })
})

draftsRouter.get('/:id', async (req, res) => {
  const draftId = parseDraftId(req.params.id)
  if (!draftId) {
    sendError(res, '草稿 ID 不合法', 400)
    return
  }

  const userId = req.auth!.userId
  const rows = await queryRows<DraftRow[]>(
    `SELECT
      id,
      user_id,
      title,
      brief,
      category_id,
      scene,
      tags_json,
      prompt,
      system_prompt,
      user_template,
      full_prompt,
      full_prompt_html,
      variable_notes,
      variables_json,
      steps_json,
      use_scenes_json,
      images_json,
      status,
      last_saved_at,
      published_skill_id,
      created_at,
      updated_at
    FROM drafts
    WHERE id = ?
      AND user_id = ?
    LIMIT 1`,
    [draftId, userId]
  )

  const draft = rows[0]
  if (!draft) {
    sendError(res, '草稿不存在', 404)
    return
  }

  sendSuccess(res, mapDraft(draft))
})

draftsRouter.post('/save', async (req, res) => {
  const parsed = saveSchema.safeParse(req.body)
  if (!parsed.success) {
    sendError(res, '草稿参数不合法', 400)
    return
  }

  const payload = parsed.data
  const userId = req.auth!.userId

  if (payload.id) {
    const result = await execWrite(
      `UPDATE drafts
      SET
        title = ?,
        brief = ?,
        category_id = ?,
        scene = ?,
        tags_json = ?,
        prompt = ?,
        system_prompt = ?,
        user_template = ?,
        full_prompt = ?,
        full_prompt_html = ?,
        variable_notes = ?,
        variables_json = ?,
        steps_json = ?,
        use_scenes_json = ?,
        images_json = ?,
        status = ?,
        published_skill_id = ?
      WHERE id = ?
        AND user_id = ?`,
      [
        payload.title ?? null,
        payload.brief ?? null,
        payload.categoryId ?? null,
        payload.scene ?? null,
        stringifyJson(payload.tags),
        payload.prompt ?? null,
        payload.systemPrompt ?? null,
        payload.userTemplate ?? null,
        payload.fullPrompt ?? null,
        payload.fullPromptHtml ?? null,
        payload.variableNotes ?? null,
        stringifyJson(payload.variables),
        stringifyJson(payload.steps),
        stringifyJson(payload.useScenes),
        stringifyJson(payload.images),
        payload.status,
        payload.publishedSkillId ?? null,
        payload.id,
        userId
      ]
    )

    if (result.affectedRows === 0) {
      sendError(res, '草稿不存在或无权限更新', 404)
      return
    }

    sendSuccess(res, { id: payload.id }, '草稿已保存')
    return
  }

  const insertResult = await execWrite(
    `INSERT INTO drafts (
      user_id,
      title,
      brief,
      category_id,
      scene,
      tags_json,
      prompt,
      system_prompt,
      user_template,
      full_prompt,
      full_prompt_html,
      variable_notes,
      variables_json,
      steps_json,
      use_scenes_json,
      images_json,
      status,
      published_skill_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      payload.title ?? null,
      payload.brief ?? null,
      payload.categoryId ?? null,
      payload.scene ?? null,
      stringifyJson(payload.tags),
      payload.prompt ?? null,
      payload.systemPrompt ?? null,
      payload.userTemplate ?? null,
      payload.fullPrompt ?? null,
      payload.fullPromptHtml ?? null,
      payload.variableNotes ?? null,
      stringifyJson(payload.variables),
      stringifyJson(payload.steps),
      stringifyJson(payload.useScenes),
      stringifyJson(payload.images),
      payload.status,
      payload.publishedSkillId ?? null
    ]
  )

  sendSuccess(res, { id: Number(insertResult.insertId) }, '草稿已保存')
})

draftsRouter.delete('/:id', async (req, res) => {
  const draftId = parseDraftId(req.params.id)
  if (!draftId) {
    sendError(res, '草稿 ID 不合法', 400)
    return
  }

  const userId = req.auth!.userId
  const result = await execWrite(
    `UPDATE drafts
    SET status = 2
    WHERE id = ?
      AND user_id = ?`,
    [draftId, userId]
  )

  if (result.affectedRows === 0) {
    sendError(res, '草稿不存在或无权限删除', 404)
    return
  }

  sendSuccess(res, { id: draftId }, '草稿已删除')
})
