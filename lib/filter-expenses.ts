export interface FilterCriteria {
  month?: string;
  dateFrom?: string;
  dateTo?: string;
  category?: string;
  memberFilter?: string;
  search?: string;
  sort?: string;
}

export function filterExpenses(expenses: any[], filters: FilterCriteria): any[] {
  let result = [...expenses];

  // ── Month filter ──────────────────────────────────────
  if (filters.month) {
    result = result.filter(
      (e) => new Date(e.date).toISOString().startsWith(filters.month!)
    );
  }

  // ── Date range filter ─────────────────────────────────
  if (filters.dateFrom) {
    const from = new Date(filters.dateFrom);
    if (!Number.isNaN(from.getTime())) {
      result = result.filter((e) => new Date(e.date) >= from);
    }
  }
  if (filters.dateTo) {
    const to = new Date(filters.dateTo);
    to.setUTCHours(23, 59, 59, 999);
    if (!Number.isNaN(to.getTime())) {
      result = result.filter((e) => new Date(e.date) <= to);
    }
  }

  // ── Category filter ───────────────────────────────────
  if (filters.category) {
    result = result.filter((e) => e.category === filters.category);
  }

  // ── Member filter ─────────────────────────────────────
  if (filters.memberFilter) {
    result = result.filter((e) => {
      const u = e.createdByUserId;
      return u && typeof u === 'object' && u._id
        ? u._id === filters.memberFilter ||
            u._id.toString() === filters.memberFilter
        : u?.toString() === filters.memberFilter;
    });
  }

  // ── Merchant search ───────────────────────────────────
  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter((e) => e.merchant.toLowerCase().includes(q));
  }

  // ── Sort ──────────────────────────────────────────────
  const [field, direction] = (filters.sort ?? 'date-desc').split('-');
  const multiplier = direction === 'asc' ? 1 : -1;

  result.sort((a, b) => {
    switch (field) {
      case 'date':
        return multiplier * (new Date(a.date).getTime() - new Date(b.date).getTime());
      case 'amount':
        return multiplier * (a.total - b.total);
      case 'merchant':
        return multiplier * a.merchant.localeCompare(b.merchant);
      default:
        return multiplier * (new Date(b.date).getTime() - new Date(a.date).getTime());
    }
  });

  return result;
}
