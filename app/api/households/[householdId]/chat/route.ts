import { NextRequest, NextResponse } from 'next/server';
import { connectDb } from '@/lib/db';
import { requireHouseholdMember, requireSession } from '@/lib/permissions';
import { ConversationState } from '@/lib/models/ConversationState';
import { chatStateSchema } from '@/lib/validators';

const initialMessages = [
  { role: 'assistant', text: 'Welcome! Let’s set up your household expense tracker.' },
  { role: 'assistant', text: 'Create a new tracker or join a shared one?' }
];

export async function GET(_: NextRequest, { params }: { params: { householdId: string } }) {
  try {
    const session = await requireSession();
    await connectDb();
    await requireHouseholdMember(params.householdId, session.user.id);
    let state = await ConversationState.findOne({ householdId: params.householdId, userId: session.user.id });
    if (!state) {
      state = await ConversationState.create({
        householdId: params.householdId,
        userId: session.user.id,
        step: 'month',
        draft: {},
        messages: initialMessages
      });
    }
    return NextResponse.json(state);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { householdId: string } }) {
  try {
    const session = await requireSession();
    await connectDb();
    await requireHouseholdMember(params.householdId, session.user.id);
    const body = await request.json();
    const parsed = chatStateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid chat state', issues: parsed.error.issues }, { status: 422 });
    }
    const state = await ConversationState.findOneAndUpdate(
      { householdId: params.householdId, userId: session.user.id },
      {
        step: parsed.data.step,
        draft: parsed.data.draft,
        messages: parsed.data.messages
      },
      { upsert: true, new: true }
    );
    return NextResponse.json(state);
  } catch {
    return NextResponse.json({ error: 'Could not save state' }, { status: 400 });
  }
}
