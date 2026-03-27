import type { Request, Response } from 'express'
import { sendError } from '../utils/response'

export const notFoundHandler = (_req: Request, res: Response): void => {
  sendError(res, '接口不存在', 404)
}
