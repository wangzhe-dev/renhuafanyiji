// #ifdef H5
import { CURRENT_H5_BUILD, type H5BuildInfo } from '@/generated/h5-build'

export interface RemoteH5BuildInfo extends H5BuildInfo {}

const H5_VERSION_URL = '/h5-version.json'

const normalizeString = (value: unknown): string => String(value ?? '').trim()

const normalizeNumber = (value: unknown): number => {
	const parsed = Number.parseInt(String(value ?? '').trim(), 10)
	return Number.isFinite(parsed) ? parsed : 0
}

const normalizeBoolean = (value: unknown, fallback = false): boolean => {
	if (value === undefined || value === null || value === '') return fallback
	return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase())
}

const normalizeRemoteBuildInfo = (value: unknown): RemoteH5BuildInfo | null => {
	if (!value || typeof value !== 'object') return null

	const record = value as Record<string, unknown>
	const versionName = normalizeString(record.versionName)
	const buildId = normalizeString(record.buildId)
	if (!versionName || !buildId) return null

	return {
		versionName,
		versionCode: normalizeNumber(record.versionCode),
		buildId,
		publishedAt: normalizeString(record.publishedAt),
		forceUpdate: normalizeBoolean(record.forceUpdate, true)
	}
}

export const getCurrentH5Build = (): H5BuildInfo => CURRENT_H5_BUILD

export const fetchLatestH5Build = async (): Promise<RemoteH5BuildInfo | null> => {
	const url = `${window.location.origin}${H5_VERSION_URL}?t=${Date.now()}`

	try {
		const response = await fetch(url, {
			method: 'GET',
			cache: 'no-store',
			headers: {
				'Cache-Control': 'no-cache'
			}
		})
		if (!response.ok) return null
		return normalizeRemoteBuildInfo(await response.json())
	} catch {
		return null
	}
}

export const hasNewH5Build = (remoteBuild: RemoteH5BuildInfo | null): boolean => {
	if (!remoteBuild) return false
	return remoteBuild.buildId !== CURRENT_H5_BUILD.buildId
}

const buildForceReloadUrl = (buildId: string): string => {
	const nextUrl = new URL(window.location.href)
	nextUrl.searchParams.set('__h5v', buildId)
	nextUrl.searchParams.set('__ts', String(Date.now()))
	return nextUrl.toString()
}

export const forceRefreshLatestH5 = async (buildId: string): Promise<void> => {
	if ('serviceWorker' in navigator) {
		try {
			const registrations = await navigator.serviceWorker.getRegistrations()
			await Promise.allSettled(registrations.map((registration) => registration.unregister()))
		} catch {
			// ignore
		}
	}

	if ('caches' in window) {
		try {
			const cacheKeys = await caches.keys()
			await Promise.allSettled(cacheKeys.map((cacheKey) => caches.delete(cacheKey)))
		} catch {
			// ignore
		}
	}

	window.location.replace(buildForceReloadUrl(buildId))
}
// #endif
