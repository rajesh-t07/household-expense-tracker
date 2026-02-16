import { auth } from '@/lib/auth';
import Link from 'next/link';

export default async function HomePage() {
  const session = await auth();

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-bold">Household Expense Tracker</h1>
      <p className="mt-4 text-slate-600">Track monthly spending with a guided chat flow.</p>
      <div className="mt-8 flex gap-3">
        {session ? (
          <Link className="rounded bg-slate-900 px-4 py-2 text-white" href="/households">
            Go to households
          </Link>
        ) : (
          <Link className="rounded bg-slate-900 px-4 py-2 text-white" href="/auth/signin">
            Sign in with Google
          </Link>
        )}
      </div>
    </main>
  );
}
