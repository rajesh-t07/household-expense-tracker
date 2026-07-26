import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDb } from '@/lib/db';
import { AuthError } from '@/lib/errors';
import { requireSession } from '@/lib/permissions';
import { requireAdmin } from '@/lib/permissions';
import { Household } from '@/lib/models/Household';

const roleSchema = z.object({
  role: z.enum(['admin', 'member'], { message: 'Role must be "admin" or "member"' })
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { householdId: string; memberId: string } }
) {
  try {
    const session = await requireSession();
    await connectDb();

    // Only admins can change roles
    const household = await requireAdmin(params.householdId, session.user.id);

    // Cannot change the creator's role
    const targetUserId = params.memberId;
    if (household.createdBy?.toString() === targetUserId) {
      return NextResponse.json(
        { error: 'Cannot change the creator\'s role' },
        { status: 400 }
      );
    }

    // Verify target is a member
    const isMember = household.members.some(
      (m: any) => m.toString() === targetUserId
    );
    if (!isMember) {
      return NextResponse.json(
        { error: 'User is not a member of this household' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = roleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid role', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { role } = parsed.data;

    // Set the role in the roles map
    household.roles = household.roles || new Map();
    household.roles.set(targetUserId, role);
    await household.save();

    return NextResponse.json({
      success: true,
      memberId: targetUserId,
      role
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
