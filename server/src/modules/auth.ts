import { Router } from 'express'
import bcrypt from 'bcrypt'
import { randomInt } from 'node:crypto'
import { z } from 'zod'
import { execWrite, queryRows } from '../db'
import { signAccessToken } from '../utils/jwt'
import { sendError, sendSuccess } from '../utils/response'
import { mapUser, type UserRow } from './shared'
import { sendVerifyCode } from '../utils/mailer'

const ALLOWED_EMAIL_DOMAINS = new Set(['qq.com', '163.com', 'gmail.com', 'outlook.com', 'foxmail.com'])

const emailField = z
  .string()
  .trim()
  .email({ message: '邮箱格式不正确' })
  .refine(
    (v) => ALLOWED_EMAIL_DOMAINS.has(v.split('@')[1]?.toLowerCase() ?? ''),
    { message: '不支持该邮箱域名' }
  )

const loginSchema = z.object({
  identifier: z.string().trim().min(1),
  password: z.string().min(6)
})

const sendCodeSchema = z.object({
  email: emailField
})

const registerSchema = z.object({
  email: emailField,
  code: z.string().length(6, '验证码为6位'),
  password: z.string().min(6, '密码至少6位'),
  nickname: z.string().trim().min(1).max(20).optional()
})

const resetPasswordSchema = z.object({
  email: emailField,
  code: z.string().length(6, '验证码为6位'),
  password: z.string().min(6, '密码至少6位')
})

// 内存验证码存储：email -> { code, expiresAt, failCount }
const codeStore = new Map<string, { code: string; expiresAt: number; failCount: number }>()

// 重置密码验证码独立存储，与注册码隔离
const resetCodeStore = new Map<string, { code: string; expiresAt: number; failCount: number }>()

// 定期清理过期验证码
setInterval(() => {
  const now = Date.now()
  for (const [email, entry] of codeStore) {
    if (entry.expiresAt < now) codeStore.delete(email)
  }
  for (const [email, entry] of resetCodeStore) {
    if (entry.expiresAt < now) resetCodeStore.delete(email)
  }
}, 60_000)

export const authRouter = Router()

authRouter.post('/login/password', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    sendError(res, '登录参数不合法', 400)
    return
  }

  const { identifier, password } = parsed.data

  const users = await queryRows<UserRow[]>(
    `SELECT
      id,
      mobile,
      email,
      password_hash,
      nickname,
      avatar_url,
      bio,
      display_color,
      status,
      published_skill_count,
      total_copy_count,
      avg_success_rate,
      last_login_at,
      created_at,
      updated_at
    FROM users
    WHERE (mobile = ? OR email = ?)
    LIMIT 1`,
    [identifier, identifier]
  )

  const user = users[0]
  if (!user) {
    sendError(res, '账号或密码错误', 401)
    return
  }
  if (user.status !== 1) {
    sendError(res, '账号已禁用，请联系管理员', 401)
    return
  }

  if (!user.password_hash) {
    sendError(res, '账号未设置密码，请联系管理员初始化', 401)
    return
  }

  const matched = await bcrypt.compare(password, user.password_hash)
  if (!matched) {
    sendError(res, '账号或密码错误', 401)
    return
  }

  await execWrite('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id])

  const token = signAccessToken({ userId: user.id })

  sendSuccess(res, {
    token,
    user: mapUser(user)
  })
})

authRouter.post('/send-code', async (req, res) => {
  const parsed = sendCodeSchema.safeParse(req.body)
  if (!parsed.success) {
    sendError(res, parsed.error.issues[0]?.message || '邮箱格式不正确', 400)
    return
  }

  const { email } = parsed.data

  // 60 秒内不重复发送
  const existing = codeStore.get(email)
  if (existing && existing.expiresAt - 4 * 60_000 > Date.now()) {
    sendError(res, '发送过于频繁，请稍候再试', 429)
    return
  }

  const code = randomInt(100000, 1000000).toString()
  codeStore.set(email, { code, expiresAt: Date.now() + 5 * 60_000, failCount: 0 })

  try {
    await sendVerifyCode(email, code)
    sendSuccess(res, { message: '验证码已发送' })
  } catch (err) {
    codeStore.delete(email)
    console.error('[send-code] 邮件发送失败:', err)
    sendError(res, '邮件发送失败，请检查邮箱地址', 500)
  }
})

authRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    sendError(res, parsed.error.issues[0]?.message || '注册参数不合法', 400)
    return
  }

  const { email, code, password, nickname } = parsed.data

  // 校验验证码
  const stored = codeStore.get(email)
  if (!stored || stored.expiresAt < Date.now()) {
    sendError(res, '验证码已过期，请重新获取', 400)
    return
  }
  if (stored.code !== code) {
    stored.failCount += 1
    if (stored.failCount >= 5) {
      codeStore.delete(email)
      sendError(res, '验证码错误次数过多，请重新获取', 400)
    } else {
      sendError(res, '验证码错误', 400)
    }
    return
  }
  codeStore.delete(email)

  const existing = await queryRows<UserRow[]>(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [email]
  )
  if (existing.length > 0) {
    sendError(res, '该邮箱已注册', 400)
    return
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const defaultNickname = nickname || email.split('@')[0]

  const result = await execWrite(
    `INSERT INTO users (email, password_hash, nickname, status, published_skill_count, total_copy_count, created_at, updated_at)
     VALUES (?, ?, ?, 1, 0, 0, NOW(), NOW())`,
    [email, passwordHash, defaultNickname]
  )

  if (!result.insertId) {
    sendError(res, '注册失败，请稍后重试', 500)
    return
  }

  const users = await queryRows<UserRow[]>(
    `SELECT id, mobile, email, password_hash, nickname, avatar_url, bio, display_color, status,
            published_skill_count, total_copy_count, avg_success_rate, last_login_at, created_at, updated_at
     FROM users WHERE id = ? LIMIT 1`,
    [result.insertId]
  )

  const newUser = users[0]
  const newToken = signAccessToken({ userId: newUser.id })

  sendSuccess(res, { token: newToken, user: mapUser(newUser) })
})

// 发送重置密码验证码
authRouter.post('/send-reset-code', async (req, res) => {
  const parsed = sendCodeSchema.safeParse(req.body)
  if (!parsed.success) {
    sendError(res, parsed.error.issues[0]?.message || '邮箱格式不正确', 400)
    return
  }

  const { email } = parsed.data

  // 必须是已注册且未禁用的账号
  const users = await queryRows<UserRow[]>(
    'SELECT id, status FROM users WHERE email = ? LIMIT 1',
    [email]
  )
  if (users.length === 0) {
    sendError(res, '该邮箱未注册', 400)
    return
  }
  if (users[0].status !== 1) {
    sendError(res, '账号已禁用，无法重置密码', 403)
    return
  }

  // 60 秒内不重复发送
  const existing = resetCodeStore.get(email)
  if (existing && existing.expiresAt - 4 * 60_000 > Date.now()) {
    sendError(res, '发送过于频繁，请稍候再试', 429)
    return
  }

  const code = randomInt(100000, 1000000).toString()
  resetCodeStore.set(email, { code, expiresAt: Date.now() + 5 * 60_000, failCount: 0 })

  try {
    await sendVerifyCode(email, code)
    sendSuccess(res, { message: '验证码已发送' })
  } catch (err) {
    resetCodeStore.delete(email)
    console.error('[send-reset-code] 邮件发送失败:', err)
    sendError(res, '邮件发送失败，请检查邮箱地址', 500)
  }
})

// 重置密码
authRouter.post('/reset-password', async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    sendError(res, parsed.error.issues[0]?.message || '参数不合法', 400)
    return
  }

  const { email, code, password } = parsed.data

  // 校验重置验证码
  const stored = resetCodeStore.get(email)
  if (!stored || stored.expiresAt < Date.now()) {
    sendError(res, '验证码已过期，请重新获取', 400)
    return
  }
  if (stored.code !== code) {
    stored.failCount += 1
    if (stored.failCount >= 5) {
      resetCodeStore.delete(email)
      sendError(res, '验证码错误次数过多，请重新获取', 400)
    } else {
      sendError(res, '验证码错误', 400)
    }
    return
  }
  resetCodeStore.delete(email)

  // 查询用户
  const users = await queryRows<UserRow[]>(
    `SELECT id, mobile, email, password_hash, nickname, avatar_url, bio, display_color, status,
            published_skill_count, total_copy_count, avg_success_rate, last_login_at, created_at, updated_at
     FROM users WHERE email = ? LIMIT 1`,
    [email]
  )
  const user = users[0]
  if (!user || user.status !== 1) {
    sendError(res, '账号不存在或已禁用', 400)
    return
  }

  // 更新密码并记录登录时间
  const passwordHash = await bcrypt.hash(password, 10)
  await execWrite(
    'UPDATE users SET password_hash = ?, last_login_at = NOW(), updated_at = NOW() WHERE id = ?',
    [passwordHash, user.id]
  )

  // 重新查询以拿到最新字段，直接自动登录
  const freshUsers = await queryRows<UserRow[]>(
    `SELECT id, mobile, email, password_hash, nickname, avatar_url, bio, display_color, status,
            published_skill_count, total_copy_count, avg_success_rate, last_login_at, created_at, updated_at
     FROM users WHERE id = ? LIMIT 1`,
    [user.id]
  )

  const token = signAccessToken({ userId: user.id })
  sendSuccess(res, { token, user: mapUser(freshUsers[0]) })
})
