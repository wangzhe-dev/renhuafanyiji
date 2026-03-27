import type { Response } from 'express'

export type ApiResponse<T> = {
  code: number
  msg: string
  data: T
}

export const sendSuccess = <T>(res: Response, data: T, msg = 'ok', code = 200): Response<ApiResponse<T>> => {
  return res.status(200).json({ code, msg, data })
}

export const sendError = (res: Response, msg: string, code = 500, data: null = null): Response<ApiResponse<null>> => {
  return res.status(200).json({ code, msg, data })
}
