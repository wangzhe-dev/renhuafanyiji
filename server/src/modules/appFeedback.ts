import { Router } from 'express'
import { z } from 'zod'
import { execWrite } from '../db'
import { requireAuth } from '../middlewares/auth'
import { sendError, sendSuccess } from '../utils/response'

const submitSchema = z.object({
  type: z.enum(['suggestion', 'bug', 'content', 'other']).default('other'),
  content: z.string().trim().min(1, '请填写反馈内容').max(500, '反馈内容不超过500字'),
  contact: z.string().trim().max(120).optional()
})

export const appFeedbackRouter = Router()

appFeedbackRouter.post('/', requireAuth, async (req, res) => {
	const parsed = submitSchema.safeParse(req.body)
	if (!parsed.success) {
		sendError(res, parsed.error.issues[0]?.message || '参数不合法', 400)
		return
	}

  const { type, content, contact } = parsed.data
  const userId = req.auth!.userId

  await execWrite(
    `INSERT INTO app_feedbacks (user_id, type, content, contact) VALUES (?, ?, ?, ?)`,
    [userId, type, content, contact ?? null]
  )

  sendSuccess(res, null, '感谢你的反馈，我们会认真阅读')
})
