import { Client as MinioClient } from 'minio'
import { env } from '../../config'

export type UploadedObjectMeta = {
  imageUrl: string
  storageProvider: 'minio'
  bucketName: string
  objectKey: string
  mimeType: string
  fileSize: number
}

type UploadBufferInput = {
  objectKey: string
  buffer: Buffer
  mimeType: string
}

const normalizeObjectKey = (value: string): string => value.replace(/^\/+/, '').replace(/\/{2,}/g, '/')

const buildPublicUrl = (objectKey: string): string => {
  const base = env.MINIO_PUBLIC_BASE_URL.replace(/\/+$/, '')
  return `${base}/${normalizeObjectKey(objectKey)}`
}

class MinioStorageService {
  private readonly client: MinioClient
  private bucketReady = false

  constructor () {
    this.client = new MinioClient({
      endPoint: env.MINIO_ENDPOINT,
      port: env.MINIO_PORT,
      useSSL: env.MINIO_USE_SSL,
      accessKey: env.MINIO_ACCESS_KEY,
      secretKey: env.MINIO_SECRET_KEY
    })
  }

  private async ensureBucketReady (): Promise<void> {
    if (this.bucketReady) return

    const exists = await this.client.bucketExists(env.MINIO_BUCKET)
    if (!exists) {
      await this.client.makeBucket(env.MINIO_BUCKET, 'us-east-1')
    }

    this.bucketReady = true
  }

  async uploadBuffer (input: UploadBufferInput): Promise<UploadedObjectMeta> {
    const objectKey = normalizeObjectKey(input.objectKey)

    await this.ensureBucketReady()

    await this.client.putObject(env.MINIO_BUCKET, objectKey, input.buffer, input.buffer.length, {
      'Content-Type': input.mimeType
    })

    return {
      imageUrl: buildPublicUrl(objectKey),
      storageProvider: 'minio',
      bucketName: env.MINIO_BUCKET,
      objectKey,
      mimeType: input.mimeType,
      fileSize: input.buffer.length
    }
  }
}

export const minioStorageService = new MinioStorageService()
