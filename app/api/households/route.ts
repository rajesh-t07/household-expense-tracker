import { NextRequest, NextResponse } from 'next/server';
import { connectDb } from '@/lib/db';
import { householdSchema } from '@/lib/validators';
import { requireSession } from '@/lib/permissions';
import { Household } from '@/lib/models/Household';
import { createInviteToken } from '@/lib/utils';

export async function GET() {
  try {
    const session = await requireSession();
    await connectDb();
    const households = await Household.find({ members: session.user.id }).sort({ createdAt: -1 }).lean();
    return NextResponse.json(households);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const parsed = householdSchema.parse(body);
    await connectDb();
    const household = await Household.create({
      ...parsed,
      createdBy: session.user.id,
      members: [session.user.id],
      inviteToken: createInviteToken()
    });
    return NextResponse.json(household, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Could not create household', detail: `${error}` }, { status: 400 });
  }
}
