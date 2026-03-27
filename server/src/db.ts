import mysql, { type PoolConnection, type ResultSetHeader, type RowDataPacket } from 'mysql2/promise'
import { env } from './config'

export const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: env.DB_CONNECTION_LIMIT,
  queueLimit: 0,
  charset: 'utf8mb4'
})

export const pingDatabase = async (): Promise<void> => {
  await pool.query('SELECT 1')
}

export const withTransaction = async <T>(handler: (conn: PoolConnection) => Promise<T>): Promise<T> => {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const result = await handler(conn)
    await conn.commit()
    return result
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

export const queryRows = async <T extends RowDataPacket[]>(sql: string, params: unknown[] = []): Promise<T> => {
  const [rows] = await pool.query<T>(sql, params)
  return rows
}

export const execWrite = async (sql: string, params: unknown[] = []): Promise<ResultSetHeader> => {
  const [result] = await pool.execute<ResultSetHeader>(sql, params as any[])
  return result
}
