import { NextRequest, NextResponse } from 'next/server';
import { stringify } from 'csv-stringify/sync';
import { connectDb } from '@/lib/db';
import { Expense } from '@/lib/models/Expense';
import { requireHouseholdMember, requireSession } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const householdId = request.nextUrl.searchParams.get('householdId');
    const month = request.nextUrl.searchParams.get('month');
    if (!householdId || !month) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

    const [year, monthIdx] = month.split('-').map(Number);
    const start = new Date(year, monthIdx - 1, 1);
    const end = new Date(year, monthIdx, 1);

    await connectDb();
    await requireHouseholdMember(householdId, session.user.id);
    const expenses = await Expense.find({ householdId, date: { $gte: start, $lt: end } }).lean();

    const csv = stringify(
      expenses.map((expense) => ({
        date: expense.date,
        merchant: expense.merchant,
        category: expense.category,
        subtotal: expense.subtotal,
        taxTotal: expense.taxTotal,
        total: expense.total,
        notes: expense.notes || ''
      })),
      { header: true }
    );

    return new NextResponse(csv, {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="expenses-${month}.csv"`
      }
    });
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}
