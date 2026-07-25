import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { connectDb } from '@/lib/db';
import { AuthError } from '@/lib/errors';
import { requireSession } from '@/lib/permissions';
import { Household } from '@/lib/models/Household';

export async function POST(_: NextRequest, { params }: { params: { householdId: string } }) {
  try {
    const session = await requireSession();
    await connectDb();
    const household = await Household.findById(params.householdId);
    if (!household) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const userId = session.user.id;
    const memberIndex = household.members.findIndex(
      (member: Types.ObjectId) => member.toString() === userId
    );
    if (memberIndex === -1) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }

    // Refuse to orphan the household — sole remaining member cannot leave.
    if (household.members.length === 1) {
      return NextResponse.json(
        { error: 'Cannot leave as the only remaining member' },
        { status: 400 }
      );
    }

    household.members.splice(memberIndex, 1);
    await household.save();
    return NextResponse.json(household);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}