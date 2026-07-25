import { NextRequest, NextResponse } from 'next/server';
import { connectDb } from '@/lib/db';
import { AuthError } from '@/lib/errors';
import { requireHouseholdMember, requireSession } from '@/lib/permissions';
import { Household } from '@/lib/models/Household';

export async function GET(_: NextRequest, { params }: { params: { householdId: string } }) {
  try {
    const session = await requireSession();
    await connectDb();
    await requireHouseholdMember(params.householdId, session.user.id);
    const household = await Household.findById(params.householdId)
      .populate('createdBy', 'name email')
      .populate('members', 'name email');
    if (!household) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(household);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}