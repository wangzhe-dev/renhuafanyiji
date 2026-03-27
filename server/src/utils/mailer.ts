import nodemailer from 'nodemailer'

type MailProvider = '163' | 'gmail' | 'custom'

const providerConfigs: Record<MailProvider, { host: string; port: number }> = {
  '163':   { host: 'smtp.163.com',  port: 465 },
  gmail:   { host: 'smtp.gmail.com', port: 465 },
  custom:  { host: process.env.MAIL_HOST || '', port: Number(process.env.MAIL_PORT || 465) }
}

function createTransporter(provider: MailProvider) {
  const { host, port } = providerConfigs[provider]

  let user: string
  let pass: string

  if (provider === '163') {
    user = process.env.MAIL_163_USER || process.env.MAIL_USER || ''
    pass = process.env.MAIL_163_PASS || process.env.MAIL_PASS || ''
  } else if (provider === 'gmail') {
    user = process.env.SMTP_GMAIL_USER || ''
    pass = process.env.SMTP_GMAIL_PASS || ''
  } else {
    user = process.env.MAIL_USER || ''
    pass = process.env.MAIL_PASS || ''
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: true,
    auth: { user, pass }
  })
}

function getActiveProvider(): MailProvider {
  const p = (process.env.MAIL_PROVIDER || '163').toLowerCase()
  if (p === 'gmail') return 'gmail'
  if (p === 'custom') return 'custom'
  return '163'
}

export async function sendVerifyCode(to: string, code: string) {
  const provider = getActiveProvider()
  const transporter = createTransporter(provider)

  const fromName = process.env.MAIL_FROM_NAME || '烧不起'
  const fromAddr = provider === 'gmail'
    ? (process.env.SMTP_GMAIL_USER || '')
    : (process.env.MAIL_163_USER || process.env.MAIL_USER || '')

  await transporter.sendMail({
    from: `"${fromName}" <${fromAddr}>`,
    to,
    subject: '【烧不起】邮箱验证码',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f7f8fa;border-radius:12px;">
        <h2 style="color:#1a1a2e;margin:0 0 8px;">验证码</h2>
        <p style="color:#6b7280;margin:0 0 24px;font-size:14px;">你正在注册烧不起账号，验证码 5 分钟内有效。</p>
        <div style="background:#fff;border-radius:8px;padding:24px;text-align:center;border:1px solid #e5e7eb;">
          <span style="font-size:36px;font-weight:900;letter-spacing:8px;color:#5B5BD6;">${code}</span>
        </div>
        <p style="color:#9ca3af;font-size:12px;margin:16px 0 0;">如非本人操作，请忽略此邮件。</p>
      </div>
    `
  })
}
