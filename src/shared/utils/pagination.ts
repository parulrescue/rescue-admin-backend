export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export function getPagination(params: PaginationParams): { offset: number; limit: number } {
  const page = Math.max(1, params.page);
  const limit = Math.min(Math.max(1, params.limit), 100);
  return { offset: (page - 1) * limit, limit };
}

export function getPaginationMeta(total: number, params: PaginationParams): PaginationMeta {
  const page = Math.max(1, params.page);
  const limit = Math.min(Math.max(1, params.limit), 100);
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    total_pages: totalPages,
    has_next: page < totalPages,
    has_prev: page > 1,
  };
}
