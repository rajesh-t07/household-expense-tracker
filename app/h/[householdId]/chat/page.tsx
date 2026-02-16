import Link from 'next/link';
import { ChatExpenseFlow } from '@/components/ChatExpenseFlow';

export default function HouseholdChatPage({ params }: { params: { householdId: string } }) {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Expense Chat</h1>
        <Link className="rounded border px-3 py-2" href={`/h/${params.householdId}/dashboard`}>
          Back to dashboard
        </Link>
      </div>
      <ChatExpenseFlow householdId={params.householdId} />
    </main>
  );
}
