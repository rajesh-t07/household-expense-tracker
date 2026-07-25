'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Household = { _id: string; name: string; currency: string; inviteToken: string };

export default function HouseholdsPage() {
  const router = useRouter();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [inviteToken, setInviteToken] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch('/api/households');
    if (res.ok) setHouseholds(await res.json());
  };

  useEffect(() => {
    load();
  }, []);

  async function goToDashboard(householdId: string) {
    setBusyId(householdId);
    setError(null);
    try {
      const res = await fetch('/api/users/me/last-household', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ householdId })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to save preference (HTTP ${res.status})`);
      }
      router.push(`/h/${householdId}/dashboard`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preference');
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-bold">Households</h1>
      <p className="mt-2 text-slate-600">Create a new tracker or join a shared one.</p>

      {error && (
        <p className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="mt-6 grid gap-4 rounded border bg-white p-4 md:grid-cols-2">
        <form
          className="space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            await fetch('/api/households', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ name, currency })
            });
            setName('');
            await load();
          }}
        >
          <h2 className="font-semibold">Create new</h2>
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Household name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          />
          <button className="rounded bg-slate-900 px-3 py-2 text-white">Create</button>
        </form>
        <form
          className="space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            await fetch('/api/households/join', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ token: inviteToken })
            });
            setInviteToken('');
            await load();
          }}
        >
          <h2 className="font-semibold">Join shared</h2>
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Invite token"
            value={inviteToken}
            onChange={(e) => setInviteToken(e.target.value)}
          />
          <button className="rounded bg-slate-900 px-3 py-2 text-white">Join</button>
        </form>
      </section>

      <ul className="mt-6 space-y-3">
        {households.map((household) => (
          <li key={household._id} className="rounded border bg-white p-4">
            <p className="font-medium">{household.name}</p>
            <p className="text-sm text-slate-500">Currency: {household.currency}</p>
            <p className="text-sm text-slate-500">Invite: {household.inviteToken}</p>
            <div className="mt-3 flex gap-2 text-sm">
              <button
                className="rounded border px-2 py-1 disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                onClick={() => goToDashboard(household._id)}
                disabled={busyId === household._id}
              >
                {busyId === household._id ? 'Opening…' : 'Dashboard'}
              </button>
              <Link
                className="rounded border px-2 py-1"
                href={`/h/${household._id}/chat`}
              >
                Chat
              </Link>
              <Link
                className="rounded border px-2 py-1"
                href={`/h/${household._id}/settings`}
              >
                Settings
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
