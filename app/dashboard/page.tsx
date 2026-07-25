'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type EnrichedExpense = {
  _id: string;
  householdId: string;
  householdName: string | null;
  householdCurrency: string | null;
  date: string;
  merchant: string;
  category: string;
  total: number;
};

export default function GlobalDashboardPage() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<EnrichedExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/all-expenses?limit=200')
      .then(async (res) => {
        if (res.status === 401) {
          router.push('/auth/signin');
          return null;
        }
        if (!res.ok) {
          throw new Error(`Failed to load: HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled || !data) return;
        if (data?.expenses) {
          setExpenses(data.expenses);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load expenses');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return <main className="mx-auto max-w-4xl p-8">Loading…</main>;
  }
  if (error) {
    return (
      <main className="mx-auto max-w-4xl p-8">
        <h1 className="text-2xl font-bold">All households</h1>
        <p className="mt-4 text-red-600">{error}</p>
      </main>
    );
  }

  const total = expenses.reduce((sum, e) => sum + e.total, 0);
  const householdCount = new Set(
    expenses.map((e) => e.householdId).filter(Boolean)
  ).size;

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-bold">All households</h1>
      <p className="mt-2 text-slate-600">
        Recent expenses across every household you belong to.
      </p>

      <section className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="rounded border bg-white p-4">
          <p className="text-slate-500">Total (latest {expenses.length})</p>
          <p className="text-3xl font-bold">${total.toFixed(2)}</p>
        </div>
        <div className="rounded border bg-white p-4">
          <p className="text-slate-500">Households touched</p>
          <p className="text-3xl font-bold">{householdCount}</p>
        </div>
        <div className="rounded border bg-white p-4">
          <p className="text-slate-500">Expenses shown</p>
          <p className="text-3xl font-bold">{expenses.length}</p>
        </div>
      </section>

      {expenses.length === 0 ? (
        <p className="mt-6 rounded border bg-white p-6 text-center text-slate-500">
          No expenses yet. Pick a household and add some!
        </p>
      ) : (
        <ul className="mt-6 space-y-2 text-sm">
          {expenses.map((e) => (
            <li
              key={e._id}
              className="flex items-center justify-between rounded border bg-white p-3"
            >
              <div>
                <p className="font-medium">
                  {e.merchant}
                  {e.householdName ? (
                    <span className="ml-2 text-slate-500">· {e.householdName}</span>
                  ) : null}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(e.date).toLocaleDateString()} · {e.category}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono">
                  {(e.householdCurrency ?? '$')}
                  {e.total.toFixed(2)}
                </span>
                <Link
                  className="rounded border px-2 py-1 text-xs"
                  href={`/h/${e.householdId}/dashboard`}
                >
                  View HH
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-sm">
        <Link className="text-slate-500 hover:underline" href="/households">
          ← Manage households
        </Link>
      </p>
    </main>
  );
}
