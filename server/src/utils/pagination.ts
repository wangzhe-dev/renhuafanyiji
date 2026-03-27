export type PaginationInput = {
  page: number
  pageSize: number
  offset: number
}

const toInt = (value: unknown, fallback: number): number => {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.trunc(n)
}

export const parsePagination = (
  pageRaw: unknown,
  pageSizeRaw: unknown,
  defaults: { page?: number; pageSize?: number; maxPageSize?: number } = {}
): PaginationInput => {
  const defaultPage = defaults.page ?? 1
  const defaultPageSize = defaults.pageSize ?? 20
  const maxPageSize = defaults.maxPageSize ?? 100

  const page = Math.max(1, toInt(pageRaw, defaultPage))
  const pageSize = Math.min(maxPageSize, Math.max(1, toInt(pageSizeRaw, defaultPageSize)))

  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize
  }
}

export const buildPaginationMeta = (page: number, pageSize: number, total: number): {
  page: number
  pageSize: number
  total: number
  totalPages: number
} => {
  const totalPages = total <= 0 ? 0 : Math.ceil(total / pageSize)
  return { page, pageSize, total, totalPages }
}
