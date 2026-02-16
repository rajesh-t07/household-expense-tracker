'use client';

import { useEffect, useState } from 'react';

export default function ExpenseDetailPage({ params }: { params: { expenseId: string } }) {
  const [expense, setExpense] = useState<any | null>(null);

  useEffect(() => {
    fetch(`/api/expenses/${params.expenseId}`).then(async (res) => {
      if (res.ok) setExpense(await res.json());
    });
  }, [params.expenseId]);

  if (!expense) return <main className="mx-auto max-w-3xl p-8">Loading...</main>;

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold">{expense.merchant}</h1>
      <p className="text-slate-500">{new Date(expense.date).toLocaleDateString()} · {expense.category}</p>
      <div className="mt-4 rounded border bg-white p-4 text-sm">
        <p>Subtotal: ${expense.subtotal.toFixed(2)}</p>
        <p>Tax: ${expense.taxTotal.toFixed(2)}</p>
        <p className="font-semibold">Total: ${expense.total.toFixed(2)}</p>
      </div>
      {expense.items?.length > 0 && (
        <div className="mt-4 rounded border bg-white p-4">
          <h2 className="mb-2 font-semibold">Items</h2>
          <ul className="space-y-2 text-sm">
            {expense.items.map((item: any, idx: number) => (
              <li key={idx} className="flex justify-between">
                <span>{item.name} ({item.quantity} × ${item.unitPrice.toFixed(2)})</span>
                <span>${item.lineTotal.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
