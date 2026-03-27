import { Router } from 'express'
import { appFeedbackRouter } from './appFeedback'
import { authRouter } from './auth'
import { draftsRouter } from './drafts'
import { feedRouter } from './feed'
import { meRouter } from './me'
import { modelsRouter } from './models'
import { skillsRouter } from './skills'
import { statsRouter } from './stats'
import { uploadsRouter } from './uploads'

export const apiRouter = Router()

apiRouter.use('/auth', authRouter)
apiRouter.use('/skills', skillsRouter)
apiRouter.use('/me', meRouter)
apiRouter.use('/stats', statsRouter)
apiRouter.use('/drafts', draftsRouter)
apiRouter.use('/feed', feedRouter)
apiRouter.use('/models', modelsRouter)
apiRouter.use('/uploads', uploadsRouter)
apiRouter.use('/app-feedback', appFeedbackRouter)
