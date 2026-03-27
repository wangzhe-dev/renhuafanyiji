import type { NextFunction, Request, Response } from 'express'
import { verifyAccessToken } from '../utils/jwt'
import { sendError } from '../utils/response'

const extractToken = (req: Request): string | null => {
  const header = req.headers.authorization
  if (!header) return null
  const [prefix, token] = header.split(' ')
  if (prefix !== 'Bearer' || !token) return null
  return token
}

export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const token = extractToken(req)
  if (!token) {
    next()
    return
  }

  try {
    const payload = verifyAccessToken(token)
    req.auth = { userId: payload.userId }
  } catch {
    // optional auth should not block public endpoints
  }

  next()
}

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const token = extractToken(req)
  if (!token) {
    sendError(res, '未登录或登录已过期', 401)
    return
  }

  try {
    const payload = verifyAccessToken(token)
    req.auth = { userId: payload.userId }
    next()
  } catch {
    sendError(res, '登录状态无效，请重新登录', 401)
  }
}
