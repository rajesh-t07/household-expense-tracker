'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { categories } from '@/lib/validators';

const SORT_OPTIONS = [
  { value: 'date-desc', label: 'Date ↓' },
  { value: 'date-asc', label: 'Date ↑' },
  { value: 'amount-desc', label: 'Amount ↓' },
  { value: 'amount-asc', label: 'Amount ↑' },
  { value: 'merchant-asc', label: 'Merchant A–Z' },
  { value: 'merchant-desc', label: 'Merchant Z–A' }
] as const;

const SORT_FN: Record<string, (a: any, b: any) => number> = {
  'date-desc': (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  'date-asc': (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  'amount-desc': (a, b) => b.total - a.total,
  'amount-asc': (a, b) => a.total - b.total,
  'merchant-asc': (a, b) => a.merchant.localeCompare(b.merchant),
  'merchant-desc': (a, b) => b.merchant.localeCompare(a.merchant)
};

export default function DashboardPage({ params }: { params: { householdId: string } }) {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [memberFilter, setMemberFilter] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('date-desc');

  useEffect(() => {
    fetch(`/api/households/${params.householdId}/expenses`).then(async (res) => {
      if (res.ok) setExpenses(await res.json());
    });
  }, [params.householdId]);

  // Derive unique members from the expense data for the member picker.
  const members = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const e of expenses) {
      const u = e.createdByUserId;
      if (u && typeof u === 'object' && u._id && u.name) {
        map.set(u._id, { id: u._id, name: u.name });
      }
    }
    return [...map.values()];
  }, [expenses]);

  const filtered = useMemo(() => {
    let result = [...expenses];

    // Month filter
    result = result.filter((e) => new Date(e.date).toISOString().startsWith(month));

    // Date range filter (overrides month)
    if (dateFrom) {
      const from = new Date(dateFrom);
      if (!isNaN(from.getTime())) {
        result = result.filter((e) => new Date(e.date) >= from);
      }
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setUTCHours(23, 59, 59, 999);
      if (!isNaN(to.getTime())) {
        result = result.filter((e) => new Date(e.date) <= to);
      }
    }

    // Category filter
    if (categoryFilter) {
      result = result.filter((e) => e.category === categoryFilter);
    }

    // Member filter
    if (memberFilter) {
      result = result.filter((e) => {
        const u = e.createdByUserId;
        return u && typeof u === 'object' && u._id
          ? u._id === memberFilter || u._id.toString() === memberFilter
          : u?.toString() === memberFilter;
      });
    }

    // Merchant search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((e) => e.merchant.toLowerCase().includes(q));
    }

    // Sort
    const fn = SORT_FN[sort] ?? SORT_FN['date-desc'];
    result.sort(fn);

    return result;
  }, [expenses, month, dateFrom, dateTo, categoryFilter, memberFilter, search, sort]);

  const total = filtered.reduce((sum, e) => sum + e.total, 0);
  const categoryMap = filtered.reduce((acc: Record<string, number>, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.total;
    return acc;
  }, {});

  const hasActiveFilters = !!(categoryFilter || memberFilter || search || dateFrom || dateTo);
  const activeLabels: string[] = [];
  if (categoryFilter) activeLabels.push(categoryFilter);
  if (memberFilter) {
    const m = members.find((m) => m.id === memberFilter || m.id.toString() === memberFilter);
    if (m) activeLabels.push(m.name);
  }
  if (dateFrom || dateTo) activeLabels.push('date range');

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          className="rounded border px-3 py-2"
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />

        <input
          className="rounded border px-3 py-2"
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          placeholder="From"
          aria-label="From date"
        />
        <input
          className="rounded border px-3 py-2"
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          placeholder="To"
          aria-label="To date"
        />

        <select
          className="rounded border px-3 py-2"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {members.length > 0 && (
          <select
            className="rounded border px-3 py-2"
            value={memberFilter}
            onChange={(e) => setMemberFilter(e.target.value)}
          >
            <option value="">All members</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        )}

        <input
          className="rounded border px-3 py-2"
          type="text"
          placeholder="Search merchant…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="rounded border px-3 py-2"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <a
          className="rounded border px-3 py-2"
          href={`/api/export/monthly?householdId=${params.householdId}&month=${month}`}
        >
          Export CSV
        </a>

        <Link
          className="rounded bg-slate-900 px-3 py-2 text-white"
          href={`/h/${params.householdId}/chat`}
        >
          Add expense in chat
        </Link>
      </div>

      {hasActiveFilters && (
        <p className="mt-3 text-xs text-slate-500">
          {filtered.length} expense{filtered.length === 1 ? '' : 's'}
          {activeLabels.length > 0 && ` filtered by ${activeLabels.join(', ')}`}
        </p>
      )}

      <section className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded border bg-white p-4">
          <p className="text-slate-500">Monthly total</p>
          <p className="text-3xl font-bold">${total.toFixed(2)}</p>
        </div>
        <div className="rounded border bg-white p-4">
          <p className="mb-2 text-slate-500">Category breakdown</p>
          <ul className="text-sm">
            {Object.entries(categoryMap).map(([category, value]) => (
              <li key={category} className="flex justify-between">
                <span>{category}</span>
                <span>${(value as number).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-5 rounded border bg-white p-4">
        <h2 className="mb-3 font-semibold">Expenses</h2>
        <ul className="space-y-2 text-sm">
          {filtered.map((expense) => (
            <li
              key={expense._id}
              className="flex items-center justify-between rounded border p-2"
            >
              <div>
                <p className="font-medium">{expense.merchant}</p>
                <p className="text-slate-500">
                  {new Date(expense.date).toLocaleDateString()} · {expense.category}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span>${expense.total.toFixed(2)}</span>
                <Link
                  className="rounded border px-2 py-1"
                  href={`/h/${params.householdId}/expenses/${expense._id}`}
                >
                  View
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
