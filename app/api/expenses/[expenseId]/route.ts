import { NextResponse } from 'next/server';
import { connectDb } from '@/lib/db';
import { Expense } from '@/lib/models/Expense';
import { requireHouseholdMember, requireSession } from '@/lib/permissions';

export async function GET(_: Request, { params }: { params: { expenseId: string } }) {
  try {
    const session = await requireSession();
    await connectDb();
    const expense = await Expense.findById(params.expenseId).lean();
    if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await requireHouseholdMember(expense.householdId.toString(), session.user.id);
    return NextResponse.json(expense);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}
