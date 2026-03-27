export interface H5BuildInfo {
  versionName: string
  versionCode: number
  buildId: string
  publishedAt: string
  forceUpdate: boolean
}

export const CURRENT_H5_BUILD: H5BuildInfo = {
  "versionName": "1.0.3",
  "versionCode": 100,
  "buildId": "1774352623835",
  "publishedAt": "2026-03-24T11:43:43.835Z",
  "forceUpdate": true
} as const
