import { Router } from 'express'
import type { RowDataPacket } from 'mysql2/promise'
import { z } from 'zod'
import { queryRows } from '../db'
import { sendSuccess } from '../utils/response'
import { toMysqlDateTime } from '../utils/time'

type ModelStatRow = RowDataPacket & {
  model_name: string
  usage_count: number
  avg_input_tokens: number | null
  avg_output_tokens: number | null
  avg_total_tokens: number | null
  avg_cost: number | null
}

type SceneStatRow = RowDataPacket & {
  scene: string
  usage_count: number
  avg_total_tokens: number | null
}

type HighValueSkillRow = RowDataPacket & {
  id: number
  title: string
  scene: string | null
  avg_total_tokens: number | null
  copy_count: number
  success_rate: number | null
  model_name: string | null
}

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(7)
})

export const statsRouter = Router()

statsRouter.get('/trends', async (req, res) => {
  const parsed = querySchema.safeParse(req.query)
  const days = parsed.success ? parsed.data.days : 7

  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const fromText = toMysqlDateTime(from)

  const modelStats = await queryRows<ModelStatRow[]>(
    `SELECT
      model_name,
      COUNT(1) AS usage_count,
      AVG(input_tokens) AS avg_input_tokens,
      AVG(output_tokens) AS avg_output_tokens,
      AVG(total_tokens) AS avg_total_tokens,
      AVG(cost_amount) AS avg_cost
    FROM skill_usage_records
    WHERE created_at >= ?
      AND model_name IS NOT NULL
      AND model_name <> ''
    GROUP BY model_name
    ORDER BY usage_count DESC
    LIMIT 12`,
    [fromText]
  )

  const sceneStats = await queryRows<SceneStatRow[]>(
    `SELECT
      COALESCE(s.scene, '未知') AS scene,
      COUNT(1) AS usage_count,
      AVG(ur.total_tokens) AS avg_total_tokens
    FROM skill_usage_records ur
    LEFT JOIN skills s ON s.id = ur.skill_id
    WHERE ur.created_at >= ?
    GROUP BY COALESCE(s.scene, '未知')
    ORDER BY usage_count DESC
    LIMIT 12`,
    [fromText]
  )

  const highValueSkills = await queryRows<HighValueSkillRow[]>(
    `SELECT
      s.id,
      s.title,
      s.scene,
      s.avg_total_tokens,
      s.copy_count,
      s.success_rate,
      COALESCE(s.recommended_model_name, s.common_model_name) AS model_name
    FROM skills s
    WHERE s.status = 1
    ORDER BY
      (COALESCE(s.success_rate, 0) * LOG10(COALESCE(s.copy_count, 0) + 10) / GREATEST(COALESCE(s.avg_total_tokens, 1), 1)) DESC,
      s.copy_count DESC
    LIMIT 10`
  )

  sendSuccess(res, {
    days,
    from: fromText,
    modelStats: modelStats.map((row) => ({
      modelName: row.model_name,
      usageCount: row.usage_count,
      avgInputTokens: row.avg_input_tokens,
      avgOutputTokens: row.avg_output_tokens,
      avgTotalTokens: row.avg_total_tokens,
      avgCost: row.avg_cost
    })),
    sceneStats: sceneStats.map((row) => ({
      scene: row.scene,
      usageCount: row.usage_count,
      avgTotalTokens: row.avg_total_tokens
    })),
    highValueSkills: highValueSkills.map((row) => ({
      id: row.id,
      title: row.title,
      scene: row.scene,
      avgTotalTokens: row.avg_total_tokens,
      copyCount: row.copy_count,
      successRate: row.success_rate,
      modelName: row.model_name
    }))
  })
})
