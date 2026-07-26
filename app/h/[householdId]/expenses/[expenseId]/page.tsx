'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import '@uploadthing/react/styles.css';
import { UploadButton } from '@uploadthing/react';
import type { OurFileRouter } from '@/app/api/uploadthing/core';

export default function ExpenseDetailPage({
  params
}: {
  params: { householdId: string; expenseId: string };
}) {
  const [expense, setExpense] = useState<any | null>(null);
  const [uploading, setUploading] = useState(false);

  async function loadExpense() {
    const res = await fetch(`/api/expenses/${params.expenseId}`);
    if (res.ok) setExpense(await res.json());
  }

  useEffect(() => {
    loadExpense();
  }, [params.expenseId]);

  async function handleUploadComplete(res: { url: string }[]) {
    if (!res?.[0]?.url) return;
    setUploading(true);
    try {
      // Save the receipt URL to the expense via PATCH
      await fetch(`/api/households/${params.householdId}/expenses/${params.expenseId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ receiptUrl: res[0].url })
      });
      await loadExpense();
    } finally {
      setUploading(false);
    }
  }

  if (!expense) {
    return <main className="mx-auto max-w-3xl p-8">Loading...</main>;
  }

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="mb-4">
        <Link
          className="text-sm text-slate-500 hover:underline"
          href={`/h/${params.householdId}/dashboard`}
        >
          ← Back to dashboard
        </Link>
      </div>

      <h1 className="text-2xl font-bold">{expense.merchant}</h1>
      <p className="text-slate-500">
        {new Date(expense.date).toLocaleDateString()} · {expense.category}
      </p>
      {expense.notes && (
        <p className="mt-2 text-sm italic text-slate-600">{expense.notes}</p>
      )}

      <div className="mt-4 rounded border bg-white p-4 text-sm">
        <p>Subtotal: ${expense.subtotal?.toFixed(2)}</p>
        <p>Tax: ${expense.taxTotal?.toFixed(2)}</p>
        <p className="font-semibold">Total: ${expense.total?.toFixed(2)}</p>
      </div>

      {expense.items?.length > 0 && (
        <div className="mt-4 rounded border bg-white p-4">
          <h2 className="mb-2 font-semibold">Items</h2>
          <ul className="space-y-2 text-sm">
            {expense.items.map((item: any, idx: number) => (
              <li key={idx} className="flex justify-between">
                <span>
                  {item.name} ({item.quantity} × ${item.unitPrice?.toFixed(2)})
                </span>
                <span>${item.lineTotal?.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Receipt section */}
      <section className="mt-4 rounded border bg-white p-4">
        <h2 className="mb-2 font-semibold">Receipt</h2>

        {expense.receiptUrl ? (
          <div className="space-y-3">
            <a
              href={expense.receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <img
                src={expense.receiptUrl}
                alt="Receipt"
                className="max-h-64 w-full rounded border object-contain bg-slate-50"
              />
            </a>
            <div className="flex gap-2">
              <UploadButton<OurFileRouter, 'receiptImage'>
                endpoint="receiptImage"
                onClientUploadComplete={(res) => handleUploadComplete(res as any)}
                onUploadError={(err) => alert(`Upload error: ${err.message}`)}
                appearance={{
                  button:
                    'rounded border px-3 py-2 text-sm text-slate-700 bg-white hover:bg-slate-50 ut-uploading:opacity-50',
                  allowedContent: 'text-xs text-slate-400'
                }}
              />
              <button
                className="rounded border border-red-300 px-3 py-2 text-xs text-red-700"
                type="button"
                onClick={async () => {
                  await fetch(
                    `/api/households/${params.householdId}/expenses/${params.expenseId}`,
                    {
                      method: 'PATCH',
                      headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({ receiptUrl: null })
                    }
                  );
                  await loadExpense();
                }}
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="mb-3 text-sm text-slate-500">No receipt uploaded yet.</p>
            <UploadButton<OurFileRouter, 'receiptImage'>
              endpoint="receiptImage"
              onClientUploadComplete={(res) => handleUploadComplete(res as any)}
              onUploadError={(err) => alert(`Upload error: ${err.message}`)}
              disabled={uploading}
              appearance={{
                button:
                  'rounded border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50',
                allowedContent: 'text-xs text-slate-400'
              }}
            />
          </div>
        )}
      </section>
    </main>
  );
}
