import { auth } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

const HOUSEHOLD_ID_REGEX = /^[a-f0-9]{24}$/i;

export default async function HomePage() {
  const session = await auth();

  if (session) {
    const lastId = cookies().get('lastHouseholdId')?.value;
    if (lastId && HOUSEHOLD_ID_REGEX.test(lastId)) {
      redirect(`/h/${lastId}/dashboard`);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-bold">Household Expense Tracker</h1>
      <p className="mt-4 text-slate-600">
        Track monthly spending with a guided chat flow.
      </p>
      <div className="mt-8 flex gap-3">
        {session ? (
          <Link
            className="rounded bg-slate-900 px-4 py-2 text-white"
            href="/households"
          >
            Go to households
          </Link>
        ) : (
          <Link
            className="rounded bg-slate-900 px-4 py-2 text-white"
            href="/auth/signin"
          >
            Sign in with Google
          </Link>
        )}
      </div>
    </main>
  );
}
