import jwt, { type SignOptions } from 'jsonwebtoken'
import { env } from '../config'

export type AccessTokenPayload = {
  userId: number
}

export const signAccessToken = (payload: AccessTokenPayload): string => {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn']
  }
  return jwt.sign(payload, env.JWT_SECRET, options)
}

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload
}
