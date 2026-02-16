import { NextRequest, NextResponse } from 'next/server';
import { connectDb } from '@/lib/db';
import { Expense } from '@/lib/models/Expense';
import { requireHouseholdMember, requireSession } from '@/lib/permissions';
import { expenseInputSchema } from '@/lib/validators';
import { toMoney } from '@/lib/utils';

export async function GET(_: NextRequest, { params }: { params: { householdId: string } }) {
  try {
    const session = await requireSession();
    await connectDb();
    await requireHouseholdMember(params.householdId, session.user.id);
    const expenses = await Expense.find({ householdId: params.householdId }).sort({ date: -1 }).lean();
    return NextResponse.json(expenses);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { householdId: string } }) {
  try {
    const session = await requireSession();
    const payload = expenseInputSchema.parse(await request.json());
    await connectDb();
    await requireHouseholdMember(params.householdId, session.user.id);

    const items = payload.mode === 'itemized' ? payload.items || [] : [];
    const subtotal = toMoney(payload.mode === 'itemized' ? items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) : payload.simpleTotal || 0);
    const taxTotal = toMoney(payload.taxTotal || 0);
    const total = toMoney(subtotal + taxTotal);

    const expense = await Expense.create({
      householdId: params.householdId,
      date: payload.date,
      merchant: payload.merchant,
      category: payload.category,
      paymentMethod: payload.paymentMethod,
      notes: payload.notes,
      subtotal,
      taxTotal,
      total,
      createdByUserId: session.user.id,
      items: items.map((item) => ({ ...item, lineTotal: toMoney(item.quantity * item.unitPrice) }))
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Could not create expense', detail: `${error}` }, { status: 400 });
  }
}
