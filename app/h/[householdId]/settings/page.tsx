'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Member = { _id: string; name: string; email: string };
type Role = 'admin' | 'member';
type Household = {
  _id: string;
  name: string;
  currency: string;
  inviteToken: string;
  createdAt: string;
  updatedAt?: string;
  createdBy: Member | string | null;
  members: (Member | string)[];
  myRole?: Role;
};

export default function SettingsPage({ params }: { params: { householdId: string } }) {
  const router = useRouter();
  const [household, setHousehold] = useState<Household | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('');
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState('');
  const [deleting, setDeleting] = useState(false);

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
        const data = await res.json();
        setHousehold(data);
        setName(data.name);
        setCurrency(data.currency);
      })
      .catch(() => setError('Failed to load household'));
  }, [params.householdId, router]);

  async function patch(action: string, payload: Record<string, unknown> = {}) {
    setBusy(true);
    try {
      const res = await fetch(`/api/households/${params.householdId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, ...payload })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to update');
        return null;
      }
      setError(null);
      const data = await res.json();
      setHousehold(data);
      setName(data.name);
      setCurrency(data.currency);
      return data;
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveBasics() {
    if (!household) return;
    const trimmedName = name.trim();
    const upperCurrency = currency.trim().toUpperCase();
    if (trimmedName !== household.name) {
      await patch('rename', { name: trimmedName });
    }
    if (upperCurrency !== household.currency) {
      await patch('update-currency', { currency: upperCurrency });
    }
  }

  async function handleRegenerateToken() {
    if (!confirm('Regenerate invite token? The old link will stop working immediately.')) return;
    await patch('regenerate-token');
  }

  async function handleRemoveMember(memberId: string, displayName: string) {
    if (!confirm(`Remove ${displayName} from this household?`)) return;
    await patch('remove-member', { memberId });
  }

  async function handleDelete() {
    if (!household) return;
    if (confirmDelete !== household.name) {
      setError(`Type the household name "${household.name}" to confirm deletion.`);
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/households/${params.householdId}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/households');
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Failed to delete');
    } catch {
      setError('Failed to delete');
    } finally {
      setDeleting(false);
    }
  }

  async function handleLeave() {
    if (!confirm('Are you sure you want to leave this household?')) return;
    setLeaving(true);
    const res = await fetch(`/api/households/${params.householdId}/leave`, { method: 'POST' });
    if (res.ok) {
      router.push('/households');
      return;
    }
    const data = await res.json().catch(() => ({}));
    setError(data.error || 'Failed to leave');
    setLeaving(false);
  }

  function handleCopy() {
    if (!household) return;
    const url = `${window.location.origin}/households?invite=${household.inviteToken}`;
    navigator.clipboard?.writeText(url);
  }

  if (error && !household) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <h1 className="text-2xl font-bold">Household Settings</h1>
        <p className="mt-4 text-red-600">{error}</p>
        <Link className="mt-4 inline-block text-sm text-slate-500 hover:underline" href="/households">
          ← Back to households
        </Link>
      </main>
    );
  }

  if (!household) {
    return <main className="mx-auto max-w-3xl p-8">Loading…</main>;
  }

  const createdByObj =
    typeof household.createdBy === 'object' && household.createdBy !== null && 'name' in household.createdBy
      ? (household.createdBy as Member)
      : null;

  const memberCount = household.members.length;
  const isOnlyMember = memberCount === 1;
  const isAdmin = household.myRole === 'admin';
  const joinUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/households?invite=${household.inviteToken}`;
  const basicsDirty =
    name.trim() !== household.name || currency.trim().toUpperCase() !== household.currency;

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold">Household Settings</h1>
      {error && (
        <p className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      <section className="mt-6 rounded border bg-white p-4">
        <h2 className="mb-3 font-semibold">Basic info</h2>
        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-slate-500">Name</span>
          <input
            className="w-full rounded border px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
          />
        </label>
        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-slate-500">Currency (3-letter code, e.g. USD)</span>
          <input
            className="w-full rounded border px-3 py-2 uppercase"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            disabled={busy}
            maxLength={8}
          />
        </label>
        <button
          className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          onClick={handleSaveBasics}
          disabled={busy || !basicsDirty}
        >
          {busy ? 'Saving…' : 'Save changes'}
        </button>
        <p className="mt-3 text-xs text-slate-500">
          Created {new Date(household.createdAt).toLocaleDateString()}
          {createdByObj ? ` by ${createdByObj.name} (${createdByObj.email})` : ''}
          {household.updatedAt
            ? ` · last edited ${new Date(household.updatedAt).toLocaleString()}`
            : ''}
        </p>
      </section>

      <section className="mt-5 rounded border bg-white p-4">
        <h2 className="mb-2 font-semibold">Members ({memberCount})</h2>
        <p className="mb-3 text-xs text-slate-500">{isAdmin ? 'You can remove other members. Self-remove uses the Leave button.' : 'Only the creator can remove members.'}</p>
        <ul className="space-y-2 text-sm">
          {household.members.map((m) => {
            const member = typeof m === 'object' && m !== null ? (m as Member) : null;
            const key = member ? member._id : (m as string);
            const isThisCreator =
              !!member && !!createdByObj && member._id === createdByObj._id;
            return (
              <li
                key={key}
                className="flex items-center justify-between rounded border bg-slate-50 px-3 py-2"
              >
                <div>
                  <p className="font-medium">
                    {member?.name ?? 'Unknown'}
                    {isThisCreator ? (
                      <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                        Creator
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-slate-500">{member?.email ?? ''}</p>
                </div>
                {isAdmin && !isThisCreator && member ? (
                  <button
                    className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    type="button"
                    onClick={() => handleRemoveMember(member._id, member.name)}
                    disabled={busy || isOnlyMember}
                    title={isOnlyMember ? 'Cannot remove the sole remaining member' : ''}
                  >
                    Remove
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-5 rounded border bg-white p-4">
        <h2 className="mb-2 font-semibold">Invite</h2>
        <p className="mb-2 text-sm text-slate-500">
          Share this URL to invite someone. Anyone with the link can join.
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
        {isAdmin ? (
          <button
            className="mt-3 rounded border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={handleRegenerateToken}
            disabled={busy}
          >
            {busy ? 'Working…' : 'Regenerate token'}
          </button>
        ) : null}
      </section>

      <section className="mt-5 rounded border border-red-200 bg-white p-4">
        <h2 className="mb-2 font-semibold text-red-700">Danger zone</h2>

        {isOnlyMember ? (
          <p className="mb-3 text-xs text-slate-500">
            You cannot leave as the only remaining member.
            {isAdmin ? ' Delete the household below instead.' : ''}
          </p>
        ) : (
          <button
            className="rounded border border-red-300 px-3 py-2 text-sm text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={handleLeave}
            disabled={leaving || busy || deleting}
          >
            {leaving ? 'Leaving…' : 'Leave household'}
          </button>
        )}

        {isAdmin ? (
          <div className="mt-4 border-t border-red-100 pt-4">
            <p className="mb-2 text-sm text-red-700">
              Delete this household permanently. This will also delete all its expenses.
            </p>
            <input
              className="w-full rounded border px-3 py-2 text-sm"
              placeholder={`Type "${household.name}" to confirm`}
              value={confirmDelete}
              onChange={(e) => setConfirmDelete(e.target.value)}
              disabled={deleting}
            />
            <button
              className="mt-2 rounded bg-red-600 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              onClick={handleDelete}
              disabled={deleting || confirmDelete !== household.name}
            >
              {deleting ? 'Deleting…' : 'Delete household'}
            </button>
          </div>
        ) : null}
      </section>

      <p className="mt-6 text-sm">
        <Link className="text-slate-500 hover:underline" href="/households">
          ← Back to households
        </Link>
      </p>
    </main>
  );
}
