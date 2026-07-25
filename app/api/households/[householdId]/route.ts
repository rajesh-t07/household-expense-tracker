import { NextRequest, NextResponse } from 'next/server';
import { connectDb } from '@/lib/db';
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
    const message = err instanceof Error ? err.message : '';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}