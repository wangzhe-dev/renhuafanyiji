import { Router, type Request, type Response } from 'express'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import multer from 'multer'
import type { RowDataPacket } from 'mysql2/promise'
import { z } from 'zod'
import { execWrite, queryRows } from '../db'
import { requireAuth } from '../middlewares/auth'
import { buildObjectKey, resolveImageExtension } from '../services/storage/object-key'
import { minioStorageService } from '../services/storage/minio'
import { sendError, sendSuccess } from '../utils/response'

type SkillOwnerRow = RowDataPacket & {
  id: number
  creator_id: number
}

type FeedPostOwnerRow = RowDataPacket & {
  id: number
  user_id: number
}

type DraftOwnerRow = RowDataPacket & {
  id: number
  user_id: number
}

const uploadImageSchema = z.object({
  usage: z.enum(['skill_cover', 'skill_content', 'user_avatar', 'feed_image', 'draft_image']),
  skillId: z.coerce.number().int().positive().optional(),
  usageRecordId: z.coerce.number().int().positive().optional(),
  draftId: z.coerce.number().int().positive().optional(),
  index: z.coerce.number().int().positive().max(9999).optional()
})

const imageProxySchema = z.object({
  url: z.preprocess(
    (value) => Array.isArray(value) ? value[0] : value,
    z.string().trim().url().max(2000)
  )
})

const IMAGE_PROXY_HOST_ALLOWLIST = new Set(['file.shaobuqi.com'])

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
})

const runUploadSingle = (req: Request, res: Response): Promise<void> => {
  return new Promise((resolve, reject) => {
    upload.single('file')(req, res, (error?: unknown) => {
      if (!error) {
        resolve()
        return
      }

      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        reject(new Error('上传文件不能超过 10MB'))
        return
      }

      reject(error)
    })
  })
}

const ensureSkillOwner = async (skillId: number, userId: number): Promise<'ok' | 'not_found' | 'forbidden'> => {
  const rows = await queryRows<SkillOwnerRow[]>(
    `SELECT id, creator_id
    FROM skills
    WHERE id = ?
    LIMIT 1`,
    [skillId]
  )

  const skill = rows[0]
  if (!skill) return 'not_found'
  if (skill.creator_id !== userId) return 'forbidden'
  return 'ok'
}

const ensureFeedPostOwner = async (usageRecordId: number, userId: number): Promise<'ok' | 'not_found' | 'forbidden'> => {
  const rows = await queryRows<FeedPostOwnerRow[]>(
    `SELECT id, user_id
    FROM skill_usage_records
    WHERE id = ?
    LIMIT 1`,
    [usageRecordId]
  )

  const record = rows[0]
  if (!record) return 'not_found'
  if (record.user_id !== userId) return 'forbidden'
  return 'ok'
}

const ensureDraftOwner = async (draftId: number, userId: number): Promise<'ok' | 'not_found' | 'forbidden'> => {
  const rows = await queryRows<DraftOwnerRow[]>(
    `SELECT id, user_id
    FROM drafts
    WHERE id = ?
    LIMIT 1`,
    [draftId]
  )

  const draft = rows[0]
  if (!draft) return 'not_found'
  if (draft.user_id !== userId) return 'forbidden'
  return 'ok'
}

export const uploadsRouter = Router()

uploadsRouter.get('/proxy', async (req, res) => {
  const parsed = imageProxySchema.safeParse(req.query)
  if (!parsed.success) {
    sendError(res, parsed.error.issues[0]?.message || '图片地址不合法', 400)
    return
  }

  let target: URL
  try {
    target = new URL(parsed.data.url)
  } catch {
    sendError(res, '图片地址不合法', 400)
    return
  }

  const protocol = target.protocol.toLowerCase()
  const hostname = target.hostname.toLowerCase()
  if (protocol !== 'http:' && protocol !== 'https:') {
    sendError(res, '仅支持 http/https 图片地址', 400)
    return
  }
  if (!IMAGE_PROXY_HOST_ALLOWLIST.has(hostname)) {
    sendError(res, '该图片域名不在允许列表', 403)
    return
  }

  const abortController = new AbortController()
  const timer = setTimeout(() => abortController.abort(), 10_000)

  try {
    const upstream = await fetch(target.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: abortController.signal,
      headers: {
        accept: 'image/*,*/*;q=0.8'
      }
    })

    if (!upstream.ok || !upstream.body) {
      sendError(res, `图片拉取失败(${upstream.status})`, 502)
      return
    }

    const contentType = `${upstream.headers.get('content-type') || ''}`.toLowerCase()
    if (!contentType.startsWith('image/')) {
      sendError(res, '目标资源不是图片', 400)
      return
    }

    const cacheControl = upstream.headers.get('cache-control')
    const contentLength = upstream.headers.get('content-length')
    const etag = upstream.headers.get('etag')
    const lastModified = upstream.headers.get('last-modified')

    res.status(200)
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/octet-stream')
    res.setHeader('Cache-Control', cacheControl || 'public, max-age=3600')
    if (contentLength) res.setHeader('Content-Length', contentLength)
    if (etag) res.setHeader('ETag', etag)
    if (lastModified) res.setHeader('Last-Modified', lastModified)

    await pipeline(Readable.fromWeb(upstream.body as any), res)
  } catch {
    if (!res.headersSent) {
      sendError(res, '图片代理失败', 502)
    } else {
      res.destroy()
    }
  } finally {
    clearTimeout(timer)
  }
})

uploadsRouter.post('/image', requireAuth, async (req, res) => {
  try {
    await runUploadSingle(req, res)
  } catch (error) {
    const msg = error instanceof Error ? error.message : '上传失败'
    sendError(res, msg, 400)
    return
  }

  const parsed = uploadImageSchema.safeParse(req.body)
  if (!parsed.success) {
    sendError(res, parsed.error.issues[0]?.message || '上传参数不合法', 400)
    return
  }

  const file = req.file
  if (!file) {
    sendError(res, '请上传图片文件', 400)
    return
  }

  if (!file.mimetype.startsWith('image/')) {
    sendError(res, '仅支持图片文件上传', 400)
    return
  }

  const payload = parsed.data
  const userId = req.auth!.userId

  if (payload.usage === 'skill_cover' || payload.usage === 'skill_content') {
    if (!payload.skillId) {
      sendError(res, 'skillId 必填', 400)
      return
    }

    const ownerState = await ensureSkillOwner(payload.skillId, userId)
    if (ownerState === 'not_found') {
      sendError(res, 'Skill 不存在', 404)
      return
    }
    if (ownerState === 'forbidden') {
      sendError(res, '无权限上传该 Skill 图片', 403)
      return
    }
  }

  if (payload.usage === 'feed_image') {
    if (!payload.usageRecordId) {
      sendError(res, 'usageRecordId 必填', 400)
      return
    }

    const ownerState = await ensureFeedPostOwner(payload.usageRecordId, userId)
    if (ownerState === 'not_found') {
      sendError(res, '动态不存在', 404)
      return
    }
    if (ownerState === 'forbidden') {
      sendError(res, '无权限上传该动态图片', 403)
      return
    }
  }

  if (payload.usage === 'draft_image') {
    if (!payload.draftId) {
      sendError(res, 'draftId 必填', 400)
      return
    }

    const ownerState = await ensureDraftOwner(payload.draftId, userId)
    if (ownerState === 'not_found') {
      sendError(res, '草稿不存在', 404)
      return
    }
    if (ownerState === 'forbidden') {
      sendError(res, '无权限上传该草稿图片', 403)
      return
    }
  }

  const extension = resolveImageExtension(file.mimetype, file.originalname)
  const objectKey = buildObjectKey({
    usage: payload.usage,
    userId,
    skillId: payload.skillId,
    usageRecordId: payload.usageRecordId,
    draftId: payload.draftId,
    index: payload.index,
    extension
  })

  const uploaded = await minioStorageService.uploadBuffer({
    objectKey,
    buffer: file.buffer,
    mimeType: file.mimetype
  })

  if (payload.usage === 'user_avatar') {
    await execWrite(
      `UPDATE users
      SET avatar_url = ?
      WHERE id = ?`,
      [uploaded.imageUrl, userId]
    )
  }

  sendSuccess(res, uploaded)
})
