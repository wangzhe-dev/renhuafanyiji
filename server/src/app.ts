import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { env } from './config'
import { notFoundHandler } from './middlewares/not-found'
import { errorHandler } from './middlewares/error-handler'
import { apiRouter } from './modules'
import { sendSuccess } from './utils/response'

const buildCorsOrigin = (): cors.CorsOptions['origin'] => {
  if (env.CORS_ORIGIN.trim() === '*') return true

  const origins = env.CORS_ORIGIN
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  if (origins.length === 0) return true
  return origins
}

export const app = express()

// API 接口禁用 ETag/缓存，避免浏览器返回 304 导致前端拿不到响应体
app.set('etag', false)

app.use(helmet())
app.use(cors({ origin: buildCorsOrigin(), credentials: true }))
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))

app.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  next()
})

app.get('/healthz', (_req, res) => {
  sendSuccess(res, { ok: true, ts: new Date().toISOString() })
})

app.use('/h5api', apiRouter)
app.use('/api', apiRouter)

app.use(notFoundHandler)
app.use(errorHandler)
