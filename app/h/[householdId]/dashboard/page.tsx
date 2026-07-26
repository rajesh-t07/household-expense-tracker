'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { filterExpenses } from '@/lib/filter-expenses';
import { categories } from '@/lib/validators';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

const SORT_OPTIONS = [
  { value: 'date-desc', label: 'Date ↓' },
  { value: 'date-asc', label: 'Date ↑' },
  { value: 'amount-desc', label: 'Amount ↓' },
  { value: 'amount-asc', label: 'Amount ↑' },
  { value: 'merchant-asc', label: 'Merchant A–Z' },
  { value: 'merchant-desc', label: 'Merchant Z–A' }
] as const;

const CHART_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
];

export default function DashboardPage({ params }: { params: { householdId: string } }) {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [expandedExpense, setExpandedExpense] = useState<string | null>(null);

  // Filter state
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

  // Derive unique members from the expense data for the member picker
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

  const filtered = useMemo(
    () =>
      filterExpenses(expenses, {
        month,
        dateFrom,
        dateTo,
        category: categoryFilter,
        memberFilter,
        search,
        sort
      }),
    [expenses, month, dateFrom, dateTo, categoryFilter, memberFilter, search, sort]
  );

  const total = filtered.reduce((sum, e) => sum + e.total, 0);

  // Category breakdown for pie chart
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of filtered) {
      map[e.category] = (map[e.category] || 0) + e.total;
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  // Monthly trend for bar chart (last 6 months)
  const monthlyTrend = useMemo(() => {
    const now = new Date();
    const months: { label: string; key: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      months.push({ label, key, total: 0 });
    }
    for (const e of expenses) {
      const dateStr = new Date(e.date).toISOString().slice(0, 7);
      const found = months.find((m) => m.key === dateStr);
      if (found) found.total += e.total;
    }
    return months.map((m) => ({ ...m, total: Math.round(m.total * 100) / 100 }));
  }, [expenses]);

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
          href={`/api/export/monthly?householdId=${params.householdId}&month=${month}${
            categoryFilter ? `&category=${encodeURIComponent(categoryFilter)}` : ''
          }${dateFrom ? `&from=${dateFrom}` : ''}${dateTo ? `&to=${dateTo}` : ''}`}
        >
          Export CSV
        </a>

        <Link
          className="rounded bg-slate-900 px-3 py-2 text-white"
          href={`/h/${params.householdId}/chat`}
        >
          Add expense in chat
        </Link>
        <Link
          className="rounded border px-3 py-2"
          href={`/h/${params.householdId}/members`}
        >
          Members
        </Link>
        <Link
          className="rounded border px-3 py-2"
          href={`/h/${params.householdId}/settings`}
        >
          Settings
        </Link>
      </div>

      {hasActiveFilters && (
        <p className="mt-3 text-xs text-slate-500">
          {filtered.length} expense{filtered.length === 1 ? '' : 's'}
          {activeLabels.length > 0 && ` filtered by ${activeLabels.join(', ')}`}
        </p>
      )}

      {/* Summary cards */}
      <section className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="rounded border bg-white p-4">
          <p className="text-slate-500">Monthly total</p>
          <p className="text-3xl font-bold">${total.toFixed(2)}</p>
        </div>

        {/* Category pie chart */}
        <div className="rounded border bg-white p-4">
          <p className="mb-2 text-slate-500">By category</p>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  dataKey="value"
                  nameKey="name"
                >
                  {categoryData.map((_, idx) => (
                    <Cell
                      key={idx}
                      fill={CHART_COLORS[idx % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Amount']}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">No data</p>
          )}
        </div>

        {/* Monthly trend bar chart */}
        <div className="rounded border bg-white p-4">
          <p className="mb-2 text-slate-500">Monthly trend</p>
          {monthlyTrend.some((m) => m.total > 0) ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Total']}
                />
                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">No data</p>
          )}
        </div>
      </section>

      {/* Expenses list */}
      <section className="mt-5 rounded border bg-white p-4">
        <h2 className="mb-3 font-semibold">
          Expenses ({filtered.length})
        </h2>
        <ul className="space-y-2 text-sm">
          {filtered.map((expense) => (
            <li
              key={expense._id}
              className="rounded border p-2 transition-colors hover:bg-slate-50"
            >
              <div
                className="flex cursor-pointer items-center justify-between"
                onClick={() =>
                  setExpandedExpense(
                    expandedExpense === expense._id ? null : expense._id
                  )
                }
              >
                <div className="flex items-center gap-3">
                  {expense.receiptUrl ? (
                    <img
                      src={expense.receiptUrl}
                      alt=""
                      className="h-8 w-8 flex-shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 flex-shrink-0 rounded border bg-slate-50" />
                  )}
                  <div>
                    <p className="font-medium">{expense.merchant}</p>
                    <p className="text-slate-500">
                      {new Date(expense.date).toLocaleDateString()} · {expense.category}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span>${expense.total?.toFixed(2)}</span>
                  <Link
                    className="rounded border px-2 py-1 text-xs"
                    href={`/h/${params.householdId}/expenses/${expense._id}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    View
                  </Link>
                </div>
              </div>

              {/* Expandable details */}
              {expandedExpense === expense._id && (
                <div className="mt-2 border-t pt-2 text-xs text-slate-600">
                  {expense.notes && <p className="mb-1 italic">{expense.notes}</p>}
                  <div className="flex flex-wrap gap-x-6 gap-y-1">
                    <span>Subtotal: ${expense.subtotal?.toFixed(2)}</span>
                    <span>Tax: ${expense.taxTotal?.toFixed(2)}</span>
                    {expense.items?.length > 0 && (
                      <span>{expense.items.length} item(s)</span>
                    )}
                    {expense.receiptUrl && (
                      <a
                        href={expense.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View receipt ↗
                      </a>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
