import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDb } from '@/lib/db';
import { AuthError } from '@/lib/errors';
import { Expense } from '@/lib/models/Expense';
import { expenseEditSchema } from '@/lib/validators';
import { requireHouseholdMember, requireSession } from '@/lib/permissions';
import { toMoney } from '@/lib/utils';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { householdId: string; expenseId: string } }
) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const parsed = expenseEditSchema.parse(body);
    await connectDb();
    await requireHouseholdMember(params.householdId, session.user.id);

    const expense = await Expense.findOne({
      _id: params.expenseId,
      householdId: params.householdId
    });
    if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Only the creator can edit the expense.
    if (expense.createdByUserId.toString() !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the creator can edit this expense' },
        { status: 403 }
      );
    }

    if (parsed.merchant !== undefined) expense.merchant = parsed.merchant;
    if (parsed.category !== undefined) expense.category = parsed.category;
    if (parsed.notes !== undefined) expense.notes = parsed.notes;
    if (parsed.simpleTotal !== undefined) {
      expense.subtotal = toMoney(parsed.simpleTotal);
      expense.total = toMoney(expense.subtotal + expense.taxTotal);
    }

    await expense.save();
    return NextResponse.json(expense);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid fields', issues: err.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
