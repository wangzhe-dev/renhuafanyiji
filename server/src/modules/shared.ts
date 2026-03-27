import type { RowDataPacket } from 'mysql2/promise'

export type UserRow = RowDataPacket & {
  id: number
  mobile: string | null
  email: string | null
  password_hash: string | null
  nickname: string
  avatar_url: string | null
  bio: string | null
  display_color: string | null
  status: number
  published_skill_count: number
  total_copy_count: number
  avg_success_rate: number | null
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export type UserDTO = {
  id: number
  mobile: string | null
  email: string | null
  nickname: string
  avatarUrl: string | null
  bio: string | null
  displayColor: string | null
  status: number
  publishedSkillCount: number
  totalCopyCount: number
  avgSuccessRate: number | null
}

export const mapUser = (row: Pick<UserRow, 'id' | 'mobile' | 'email' | 'nickname' | 'avatar_url' | 'bio' | 'display_color' | 'status' | 'published_skill_count' | 'total_copy_count' | 'avg_success_rate'>): UserDTO => {
  return {
    id: row.id,
    mobile: row.mobile,
    email: row.email,
    nickname: row.nickname,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    displayColor: row.display_color,
    status: row.status,
    publishedSkillCount: row.published_skill_count,
    totalCopyCount: row.total_copy_count,
    avgSuccessRate: row.avg_success_rate
  }
}
