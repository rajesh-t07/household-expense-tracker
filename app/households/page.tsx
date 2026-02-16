'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Household = { _id: string; name: string; currency: string; inviteToken: string };

export default function HouseholdsPage() {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [inviteToken, setInviteToken] = useState('');

  const load = async () => {
    const res = await fetch('/api/households');
    if (res.ok) setHouseholds(await res.json());
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-bold">Households</h1>
      <p className="mt-2 text-slate-600">Create a new tracker or join a shared one.</p>

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
          <input className="w-full rounded border px-3 py-2" placeholder="Household name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="w-full rounded border px-3 py-2" placeholder="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)} />
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
          <input className="w-full rounded border px-3 py-2" placeholder="Invite token" value={inviteToken} onChange={(e) => setInviteToken(e.target.value)} />
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
              <Link className="rounded border px-2 py-1" href={`/h/${household._id}/dashboard`}>
                Dashboard
              </Link>
              <Link className="rounded border px-2 py-1" href={`/h/${household._id}/chat`}>
                Chat
              </Link>
              <Link className="rounded border px-2 py-1" href={`/h/${household._id}/settings`}>
                Settings
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
