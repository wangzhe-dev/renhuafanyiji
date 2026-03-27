import { app } from './app'
import { env } from './config'
import { pingDatabase, pool } from './db'

const start = async (): Promise<void> => {
  await pingDatabase()

  const server = app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[shaobuqi-server] listening on :${env.PORT}`)
  })

  const shutdown = async (signal: string): Promise<void> => {
    // eslint-disable-next-line no-console
    console.log(`[shaobuqi-server] ${signal} received, shutting down...`)

    server.close(async () => {
      await pool.end()
      process.exit(0)
    })
  }

  process.on('SIGINT', () => {
    void shutdown('SIGINT')
  })
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM')
  })
}

start().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('[shaobuqi-server] failed to start:', error)
  process.exit(1)
})
