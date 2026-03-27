import { apiPrefix, requestUrl } from '@/config'
import { useUserStore } from '@/stores'

export type UploadImageUsage = 'skill_cover' | 'skill_content' | 'user_avatar' | 'feed_image' | 'draft_image'

export type UploadedImageMeta = {
  imageUrl: string
  storageProvider: 'minio'
  bucketName: string
  objectKey: string
  mimeType: string
  fileSize: number
}

type UploadImageParams = {
  filePath: string
  usage: UploadImageUsage
  skillId?: number
  usageRecordId?: number
  draftId?: number
  index?: number
}

const COMPRESS_THRESHOLD_BYTES = 800 * 1024
const COMPRESS_QUALITY = 75

const buildUploadUrl = () => {
  // #ifdef H5
  return `/${apiPrefix}/uploads/image`
  // #endif

  // #ifndef H5
  return `${requestUrl}/uploads/image`
  // #endif
}

const parseUploadResponse = (raw: unknown): { code?: number; msg?: string; data?: UploadedImageMeta } | null => {
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return parsed as { code?: number; msg?: string; data?: UploadedImageMeta }
    } catch {
      return null
    }
  }

  if (raw && typeof raw === 'object') {
    return raw as { code?: number; msg?: string; data?: UploadedImageMeta }
  }

  return null
}

const getLocalFileSize = (filePath: string): Promise<number> => {
  return new Promise((resolve) => {
    uni.getFileInfo({
      filePath,
      success: (res) => {
        resolve(Number(res.size || 0))
      },
      fail: () => {
        resolve(0)
      }
    })
  })
}

const compressIfNeeded = async (filePath: string): Promise<string> => {
  const size = await getLocalFileSize(filePath)
  if (!size || size < COMPRESS_THRESHOLD_BYTES) return filePath

  return new Promise((resolve) => {
    uni.compressImage({
      src: filePath,
      quality: COMPRESS_QUALITY,
      success: (res) => {
        resolve((res as any)?.tempFilePath || filePath)
      },
      fail: () => {
        resolve(filePath)
      }
    })
  })
}

export const uploadImageFile = (params: UploadImageParams): Promise<UploadedImageMeta> => {
  return new Promise((resolve, reject) => {
    ;(async () => {
      const token = useUserStore().token
      const uploadPath = await compressIfNeeded(params.filePath)

      const formData: Record<string, string> = {
        usage: params.usage
      }
      if (params.skillId) formData.skillId = `${params.skillId}`
      if (params.usageRecordId) formData.usageRecordId = `${params.usageRecordId}`
      if (params.draftId) formData.draftId = `${params.draftId}`
      if (params.index) formData.index = `${params.index}`

      const header: Record<string, string> = {}
      if (token) header.Authorization = `Bearer ${token}`

      uni.uploadFile({
        url: buildUploadUrl(),
        name: 'file',
        filePath: uploadPath,
        formData,
        header,
        success: (res) => {
          const payload = parseUploadResponse(res.data)
          if (res.statusCode !== 200 || !payload) {
            reject(new Error('上传失败'))
            return
          }

          if (payload.code !== 200 || !payload.data) {
            reject(new Error(payload.msg || '上传失败'))
            return
          }

          resolve(payload.data)
        },
        fail: (error) => {
          reject(new Error(error.errMsg || '上传失败'))
        }
      })
    })().catch((error) => {
      reject(error instanceof Error ? error : new Error('上传失败'))
    })
  })
}
