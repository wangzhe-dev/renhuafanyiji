export const getSafeAreaTop = (systemInfo: Partial<UniApp.GetSystemInfoResult> | null | undefined): number => {
	// H5/Web 环境（含微信浏览器）无需安全区偏移，直接返回 0
	const uniPlatform = `${(systemInfo as any)?.uniPlatform || ''}`.toLowerCase()
	if (uniPlatform === 'web' || uniPlatform === 'h5') return 0

	const top = Number(systemInfo?.statusBarHeight || 0)
	if (Number.isFinite(top) && top > 0) return top

	const platform = `${(systemInfo as any)?.platform || (systemInfo as any)?.osName || ''}`.toLowerCase()
	if (platform.includes('ios')) return 44
	return 24
}
