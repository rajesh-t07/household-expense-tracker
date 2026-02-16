import { NextRequest, NextResponse } from 'next/server';
import { connectDb } from '@/lib/db';
import { requireSession } from '@/lib/permissions';
import { Household } from '@/lib/models/Household';

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const { token } = await request.json();
    if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 });
    await connectDb();
    const household = await Household.findOne({ inviteToken: token });
    if (!household) return NextResponse.json({ error: 'Invalid invite token' }, { status: 404 });
    if (!household.members.some((member) => member.toString() === session.user.id)) {
      household.members.push(session.user.id);
      await household.save();
    }
    return NextResponse.json(household);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
