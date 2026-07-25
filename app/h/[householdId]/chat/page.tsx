import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ChatExpenseFlow } from '@/components/ChatExpenseFlow';

export default async function HouseholdChatPage({ params }: { params: { householdId: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/signin');

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Expense Chat</h1>
        <Link className="rounded border px-3 py-2" href={`/h/${params.householdId}/dashboard`}>
          Back to dashboard
        </Link>
      </div>
      <ChatExpenseFlow householdId={params.householdId} userId={session.user.id} />
    </main>
  );
}
