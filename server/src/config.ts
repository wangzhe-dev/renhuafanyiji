import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

const BooleanFromEnv = z.preprocess((value) => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  }
  return value
}, z.boolean())

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().min(1),
  DB_CONNECTION_LIMIT: z.coerce.number().int().positive().default(10),

  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('7d'),

  CORS_ORIGIN: z.string().default('*'),

  MINIO_ENDPOINT: z.string().trim().min(1),
  MINIO_PORT: z.coerce.number().int().positive().default(9000),
  MINIO_USE_SSL: BooleanFromEnv.default(false),
  MINIO_ACCESS_KEY: z.string().trim().min(1),
  MINIO_SECRET_KEY: z.string().trim().min(1),
  MINIO_BUCKET: z.string().trim().min(1),
  MINIO_PUBLIC_BASE_URL: z.string().trim().min(1)
})

const parsed = EnvSchema.safeParse(process.env)

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data

export const isProd = env.NODE_ENV === 'production'
