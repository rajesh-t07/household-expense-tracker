import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectDb } from '@/lib/db';
import { AuthError } from '@/lib/errors';
import { requireSession } from '@/lib/permissions';
import { Household } from '@/lib/models/Household';
import { lastHouseholdSchema } from '@/lib/validators';

const COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json().catch(() => null);
    const parsed = lastHouseholdSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid household id', issues: parsed.error.issues },
        { status: 400 }
      );
    }
    const { householdId } = parsed.data;
    // Zod's regex (24-char hex) is sufficient — no need for Types.ObjectId.isValid.

    await connectDb();
    // Verify the user is still a member before writing the cookie.
    const household = await Household.findOne({
      _id: householdId,
      members: session.user.id
    })
      .select({ _id: 1 })
      .lean();
    if (!household) {
      return NextResponse.json(
        { error: 'You are not a member of that household' },
        { status: 403 }
      );
    }

    cookies().set('lastHouseholdId', householdId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE_SECONDS,
      secure: process.env.NODE_ENV === 'production'
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await requireSession();
    cookies().delete('lastHouseholdId');
    // Returning the session is useful for the NextAuth signOut hook on the
    // client to discover what was cleared.
    return NextResponse.json({ ok: true, cleared: 'lastHouseholdId' });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
