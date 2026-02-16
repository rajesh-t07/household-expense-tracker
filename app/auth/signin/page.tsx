'use client';

import { signIn } from 'next-auth/react';

export default function SignInPage() {
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mt-2 text-slate-600">Use Google to continue.</p>
      <button
        type="button"
        className="mt-6 rounded bg-slate-900 px-4 py-2 text-white"
        onClick={() => signIn('google', { callbackUrl: '/households' })}
      >
        Continue with Google
      </button>
    </main>
  );
}
