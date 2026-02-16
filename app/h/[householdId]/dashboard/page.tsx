'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

export default function DashboardPage({ params }: { params: { householdId: string } }) {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    fetch(`/api/households/${params.householdId}/expenses`).then(async (res) => {
      if (res.ok) setExpenses(await res.json());
    });
  }, [params.householdId]);

  const filtered = useMemo(
    () => expenses.filter((e) => new Date(e.date).toISOString().startsWith(month)),
    [expenses, month]
  );
  const total = filtered.reduce((sum, e) => sum + e.total, 0);
  const categoryMap = filtered.reduce((acc: Record<string, number>, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.total;
    return acc;
  }, {});

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="mt-4 flex items-center gap-3">
        <input className="rounded border px-3 py-2" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        <a className="rounded border px-3 py-2" href={`/api/export/monthly?householdId=${params.householdId}&month=${month}`}>
          Export CSV
        </a>
        <Link className="rounded bg-slate-900 px-3 py-2 text-white" href={`/h/${params.householdId}/chat`}>
          Add expense in chat
        </Link>
      </div>

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
            <li key={expense._id} className="flex items-center justify-between rounded border p-2">
              <div>
                <p className="font-medium">{expense.merchant}</p>
                <p className="text-slate-500">{new Date(expense.date).toLocaleDateString()} · {expense.category}</p>
              </div>
              <div className="flex items-center gap-4">
                <span>${expense.total.toFixed(2)}</span>
                <Link className="rounded border px-2 py-1" href={`/h/${params.householdId}/expenses/${expense._id}`}>
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
