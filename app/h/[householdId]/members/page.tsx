'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Member = { _id: string; name: string; email: string };
type Household = {
  _id: string;
  name: string;
  createdBy: Member | string | null;
  members: (Member | string)[];
  roles: Record<string, string>;
  myRole: 'admin' | 'member';
};

export default function MembersPage({ params }: { params: { householdId: string } }) {
  const router = useRouter();
  const [household, setHousehold] = useState<Household | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteResult, setInviteResult] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/households/${params.householdId}`)
      .then(async (res) => {
        if (res.status === 401) {
          router.push('/auth/signin');
          return;
        }
        if (res.status === 403) {
          router.push('/households');
          return;
        }
        if (!res.ok) {
          setError('Failed to load household');
          return;
        }
        const data = await res.json();
        setHousehold(data);
      })
      .catch(() => setError('Failed to load household'));
  }, [params.householdId, router]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteBusy(true);
    setInviteResult(null);
    try {
      const res = await fetch(`/api/households/${params.householdId}/invite`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setInviteResult(`Invitation sent to ${data.invited}!`);
        setInviteEmail('');
      } else {
        setInviteResult(data.error || 'Failed to send invite');
      }
    } catch {
      setInviteResult('Failed to send invite');
    } finally {
      setInviteBusy(false);
    }
  }

  async function handleRoleChange(memberId: string, newRole: 'admin' | 'member') {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/households/${params.householdId}/members/${memberId}/role`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ role: newRole })
        }
      );
      if (res.ok) {
        // Refresh household data
        const fresh = await fetch(`/api/households/${params.householdId}`).then((r) => r.json());
        setHousehold(fresh);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to change role');
      }
    } catch {
      setError('Failed to change role');
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveMember(memberId: string, displayName: string) {
    if (!confirm(`Remove ${displayName} from this household?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/households/${params.householdId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'remove-member', memberId })
      });
      if (res.ok) {
        const fresh = await fetch(`/api/households/${params.householdId}`).then((r) => r.json());
        setHousehold(fresh);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to remove member');
      }
    } catch {
      setError('Failed to remove member');
    } finally {
      setBusy(false);
    }
  }

  if (error && !household) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <h1 className="text-2xl font-bold">Members</h1>
        <p className="mt-4 text-red-600">{error}</p>
        <Link
          className="mt-4 inline-block text-sm text-slate-500 hover:underline"
          href={`/h/${params.householdId}/dashboard`}
        >
          ← Back to dashboard
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

  const isAdmin = household.myRole === 'admin';
  const roles = household.roles || {};

  function getMemberRole(memberId: string, isCreator: boolean): 'admin' | 'member' {
    if (isCreator) return 'admin';
    return (roles[memberId] as 'admin' | 'member') || 'member';
  }

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold">Members</h1>
      <p className="mt-1 text-sm text-slate-500">{household.name}</p>

      {error && (
        <p className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Invite form — admin only */}
      {isAdmin && (
        <section className="mt-6 rounded border bg-white p-4">
          <h2 className="mb-3 font-semibold">Invite by email</h2>
          <form onSubmit={handleInvite} className="flex gap-2">
            <input
              className="flex-1 rounded border px-3 py-2 text-sm"
              type="email"
              placeholder="friend@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              disabled={inviteBusy}
              required
            />
            <button
              className="rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
              type="submit"
              disabled={inviteBusy || !inviteEmail.trim()}
            >
              {inviteBusy ? 'Sending…' : 'Send invite'}
            </button>
          </form>
          {inviteResult && (
            <p
              className={`mt-2 text-sm ${
                inviteResult.includes('sent') ? 'text-green-700' : 'text-red-700'
              }`}
            >
              {inviteResult}
            </p>
          )}
        </section>
      )}

      {/* Member list */}
      <section className="mt-5 rounded border bg-white p-4">
        <h2 className="mb-2 font-semibold">
          {household.members.length} member{household.members.length === 1 ? '' : 's'}
        </h2>
        <ul className="space-y-2 text-sm">
          {household.members.map((m) => {
            const member = typeof m === 'object' && m !== null ? (m as Member) : null;
            const key = member ? member._id : (m as string);
            const isCreator = !!member && !!createdByObj && member._id === createdByObj._id;
            const memberRole = getMemberRole(key, isCreator);

            return (
              <li
                key={key}
                className="flex items-center justify-between rounded border bg-slate-50 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <div>
                    <p className="font-medium">
                      {member?.name ?? 'Unknown'}
                      {member?.email ? (
                        <span className="ml-1 text-xs text-slate-400">
                          ({member.email})
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      memberRole === 'admin'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {isCreator ? 'Creator' : memberRole === 'admin' ? 'Admin' : 'Member'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && !isCreator && member && (
                    <>
                      <button
                        className="rounded border px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                        type="button"
                        onClick={() =>
                          handleRoleChange(
                            member._id,
                            memberRole === 'admin' ? 'member' : 'admin'
                          )
                        }
                        disabled={busy}
                      >
                        {memberRole === 'admin' ? 'Demote' : 'Promote'}
                      </button>
                      <button
                        className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        type="button"
                        onClick={() => handleRemoveMember(member._id, member.name)}
                        disabled={busy}
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="mt-6 text-sm">
        <Link
          className="text-slate-500 hover:underline"
          href={`/h/${params.householdId}/dashboard`}
        >
          ← Back to dashboard
        </Link>
      </p>
    </main>
  );
}
