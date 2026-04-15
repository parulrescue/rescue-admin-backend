"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPagination = getPagination;
exports.getPaginationMeta = getPaginationMeta;
function getPagination(params) {
    const page = Math.max(1, params.page);
    const limit = Math.min(Math.max(1, params.limit), 100);
    return { offset: (page - 1) * limit, limit };
}
function getPaginationMeta(total, params) {
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
