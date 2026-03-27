import type { NextFunction, Request, Response } from 'express'
import { sendError } from '../utils/response'

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
  // eslint-disable-next-line no-console
  console.error(err)
  sendError(res, '服务器内部错误', 500)
}
