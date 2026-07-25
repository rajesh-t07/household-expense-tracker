import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDb } from '@/lib/db';
import { AuthError } from '@/lib/errors';
import { requireHouseholdMember, requireSession } from '@/lib/permissions';
import { Expense } from '@/lib/models/Expense';
import { bulkDeleteSchema } from '@/lib/validators';

export async function POST(request: NextRequest, { params }: { params: { householdId: string } }) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const parsed = bulkDeleteSchema.parse(body);
    await connectDb();
    await requireHouseholdMember(params.householdId, session.user.id);

    const result = await Expense.deleteMany({
      _id: { $in: parsed.ids },
      householdId: params.householdId
    });

    return NextResponse.json({ deleted: result.deletedCount });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', issues: err.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
