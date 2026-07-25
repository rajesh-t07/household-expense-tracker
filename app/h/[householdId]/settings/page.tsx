'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Member = { _id: string; name: string; email: string };
type Household = {
  _id: string;
  name: string;
  currency: string;
  inviteToken: string;
  createdAt: string;
  createdBy: Member | string | null;
  members: (Member | string)[];
};

export default function SettingsPage({ params }: { params: { householdId: string } }) {
  const router = useRouter();
  const [household, setHousehold] = useState<Household | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    fetch(`/api/households/${params.householdId}`)
      .then(async (res) => {
        if (res.status === 401) {
          router.push('/auth/signin');
          return;
        }
        if (res.status === 403) {
          // Authenticated but not a member — send them to the households list
          router.push('/households');
          return;
        }
        if (!res.ok) {
          setError('Failed to load household');
          return;
        }
        setHousehold(await res.json());
      })
      .catch(() => setError('Failed to load household'));
  }, [params.householdId, router]);

  async function handleLeave() {
    if (!confirm('Are you sure you want to leave this household?')) return;
    setLeaving(true);
    const res = await fetch(`/api/households/${params.householdId}/leave`, { method: 'POST' });
    if (res.ok) {
      router.push('/households');
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Failed to leave');
      setLeaving(false);
    }
  }

  function handleCopy() {
    if (!household) return;
    const url = `${window.location.origin}/households?invite=${household.inviteToken}`;
    navigator.clipboard?.writeText(url);
  }

  if (error) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <h1 className="text-2xl font-bold">Household Settings</h1>
        <p className="mt-4 text-red-600">{error}</p>
        <Link className="mt-4 inline-block text-sm text-slate-500 hover:underline" href="/households">← Back to households</Link>
      </main>
    );
  }

  if (!household) {
    return <main className="mx-auto max-w-3xl p-8">Loading…</main>;
  }

  const createdBy = typeof household.createdBy === 'object' && household.createdBy !== null
    ? household.createdBy
    : null;

  const memberCount = household.members.length;
  const isOnlyMember = memberCount === 1;
  const joinUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/households?invite=${household.inviteToken}`;

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold">Household Settings</h1>

      <section className="mt-6 rounded border bg-white p-4">
        <h2 className="mb-2 font-semibold">Basic info</h2>
        <dl className="text-sm">
          <div className="flex justify-between py-1">
            <dt className="text-slate-500">Name</dt>
            <dd className="font-medium">{household.name}</dd>
          </div>
          <div className="flex justify-between py-1">
            <dt className="text-slate-500">Currency</dt>
            <dd className="font-medium">{household.currency}</dd>
          </div>
          <div className="flex justify-between py-1">
            <dt className="text-slate-500">Created</dt>
            <dd className="font-medium">{new Date(household.createdAt).toLocaleDateString()}</dd>
          </div>
          <div className="flex justify-between py-1">
            <dt className="text-slate-500">Created by</dt>
            <dd className="font-medium">
              {createdBy ? `${createdBy.name} (${createdBy.email})` : 'Unknown'}
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-5 rounded border bg-white p-4">
        <h2 className="mb-2 font-semibold">Members ({memberCount})</h2>
        <ul className="space-y-1 text-sm">
          {household.members.map((m) => {
            const member = typeof m === 'object' ? m : null;
            const key = member ? member._id : (m as string);
            return (
              <li key={key} className="flex justify-between">
                <span>{member?.name ?? 'Unknown'}</span>
                <span className="text-slate-500">{member?.email ?? ''}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-5 rounded border bg-white p-4">
        <h2 className="mb-2 font-semibold">Invite</h2>
        <p className="mb-2 text-sm text-slate-500">
          Share this URL to invite someone to this household. Anyone with the link can join.
        </p>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded border bg-slate-50 px-3 py-2 text-sm"
            readOnly
            value={joinUrl}
          />
          <button
            className="rounded border px-3 py-2 text-sm"
            type="button"
            onClick={handleCopy}
          >
            Copy
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400">Token: {household.inviteToken}</p>
      </section>

      <section className="mt-5 rounded border border-red-200 bg-white p-4">
        <h2 className="mb-2 font-semibold text-red-700">Danger zone</h2>
        <button
          className="rounded border border-red-300 px-3 py-2 text-sm text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          disabled={isOnlyMember || leaving}
          onClick={handleLeave}
        >
          {leaving ? 'Leaving…' : 'Leave household'}
        </button>
        {isOnlyMember && (
          <p className="mt-2 text-xs text-slate-500">
            You cannot leave as the only remaining member.
          </p>
        )}
      </section>

      <p className="mt-6 text-sm">
        <Link className="text-slate-500 hover:underline" href="/households">← Back to households</Link>
      </p>
    </main>
  );
}