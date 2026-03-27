import { defineConfig, loadEnv } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import AutoImport from 'unplugin-auto-import/vite'
import { VitePWA } from 'vite-plugin-pwa'
import type { IncomingMessage, ServerResponse } from 'http'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

const apiPrefix = 'h5api'

const normalizeProxyTarget = (rawTarget: string): string => {
  if (!rawTarget) return rawTarget

  try {
    const url = new URL(rawTarget)
    if (url.pathname === '/' || url.pathname === '') {
      url.pathname = `/${apiPrefix}`
    }
    return url.toString().replace(/\/$/, '')
  } catch {
    return rawTarget
  }
}

const resolveProxyTarget = (mode: string): string => {
  const env = loadEnv(mode, process.cwd(), '')
  const envTarget = (env.VITE_API_BASE_URL || process.env.VITE_API_BASE_URL || '').trim()
  const fallbackTarget = 'http://127.0.0.1:3000/h5api'
  return normalizeProxyTarget(envTarget || fallbackTarget)
}

const sendProxyError = (res: ServerResponse<IncomingMessage>): void => {
  if (!res.headersSent) {
    res.writeHead(502, {
      'Content-Type': 'application/json; charset=utf-8'
    })
  }

  res.end(
    JSON.stringify({
      code: 502,
      msg: '接口代理失败，请确认本地后端是否已启动（默认: http://127.0.0.1:3000）'
    })
  )
}

const emitPublicAsset = (sourceRelativePath: string, outputFileName: string) => ({
  name: `emit-public-asset:${outputFileName}`,
  apply: 'build' as const,
  generateBundle() {
    const sourcePath = resolve(process.cwd(), sourceRelativePath)
    if (!existsSync(sourcePath)) return

    const source = readFileSync(sourcePath, 'utf8')
    this.emitFile({
      type: 'asset',
      fileName: outputFileName,
      source
    })
  }
})

export default defineConfig(({ mode }) => {
  const proxyTarget = resolveProxyTarget(mode)
  const isProd = mode === 'production'

  // eslint-disable-next-line no-console
  console.log(`[vite] /${apiPrefix} proxy target: ${proxyTarget}`)

  return {
    plugins: [
      emitPublicAsset('public/download/index.html', 'download/index.html'),
      emitPublicAsset('public/app-version.json', 'app-version.json'),
      emitPublicAsset('public/h5-version.json', 'h5-version.json'),
      uni(),
      AutoImport({
        imports: ['vue', 'vue-router', 'uni-app'],
        dts: './src/types/auto-imports.d.ts',
        vueTemplate: true,
        eslintrc: {
          enabled: true
        }
      }),
      VitePWA({
        registerType: 'prompt',
        injectRegister: null,
        manifestFilename: 'manifest.webmanifest',
        manifest: {
          name: '烧不起',
          short_name: '烧不起',
          description: '工具 · 社区 · Skill 技能展示平台',
          theme_color: '#5B5BD6',
          background_color: '#F7F8FA',
          display: 'standalone',
          orientation: 'portrait',
          id: './',
          start_url: './',
          scope: './',
          lang: 'zh-CN',
          icons: [
            {
              src: 'static/icons/icon-96x96.png',
              sizes: '96x96',
              type: 'image/png'
            },
            {
              src: 'static/icons/icon-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'static/icons/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'static/icons/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        },
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [
            /^\/download\/.*\.apk(?:\?.*)?$/i
          ],
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'image-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30
                }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'font-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                }
              }
            },
            {
              urlPattern: /^https:\/\/picsum\.photos/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'placeholder-image-cache',
                expiration: {
                  maxEntries: 60,
                  maxAgeSeconds: 60 * 60 * 24 * 7
                }
              }
            }
          ]
        },
        devOptions: {
          enabled: !isProd,
          type: 'module',
          navigateFallback: 'index.html'
        }
      })
    ],
    optimizeDeps: {
      exclude: ['sard-uniapp']
    },
    build: {
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: isProd,
          drop_debugger: isProd
        }
      }
    },
    server: {
      port: 8085,
      strictPort: true,
      open: true,
      proxy: {
        [`/${apiPrefix}`]: {
          target: proxyTarget,
          changeOrigin: true,
          rewrite: (path: string) => path.replace(new RegExp(`^/${apiPrefix}`), ''),
          configure: (proxy) => {
            proxy.on('error', (_err, _req, res) => {
              sendProxyError(res as ServerResponse<IncomingMessage>)
            })
          }
        }
      }
    }
  }
})
