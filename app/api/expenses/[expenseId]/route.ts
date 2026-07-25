import { NextResponse } from 'next/server';
import { connectDb } from '@/lib/db';
import { AuthError } from '@/lib/errors';
import { Expense, type ExpenseDoc } from '@/lib/models/Expense';
import { requireHouseholdMember, requireSession } from '@/lib/permissions';

export async function GET(_: Request, { params }: { params: { expenseId: string } }) {
  try {
    const session = await requireSession();
    await connectDb();
    const expense = await Expense.findById(params.expenseId).lean<
      (ExpenseDoc & { _id: unknown }) | null
    >();
    if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await requireHouseholdMember(expense.householdId.toString(), session.user.id);
    return NextResponse.json(expense);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}
