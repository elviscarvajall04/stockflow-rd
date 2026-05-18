function paginate(req) {
  const hasPage = req.query.page !== undefined;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 100));
  const offset = (page - 1) * limit;
  return { page, limit, offset, hasPage };
}

function paginatedResponse(rows, total, page, limit, hasPage) {
  if (!hasPage) return rows;
  return {
    data: rows,
    total: parseInt(total),
    page,
    totalPages: Math.ceil(total / limit),
  };
}

module.exports = { paginate, paginatedResponse };
