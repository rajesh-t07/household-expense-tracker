import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { z } from 'zod';
import { connectDb } from '@/lib/db';
import { AuthError } from '@/lib/errors';
import { requireHouseholdMember, requireSession } from '@/lib/permissions';
import { Expense } from '@/lib/models/Expense';
import { Household } from '@/lib/models/Household';
import { settingsActionSchema } from '@/lib/validators';
import { createInviteToken } from '@/lib/utils';

function isCreator(
  household: { createdBy: Types.ObjectId | { _id: Types.ObjectId | string } | string | null },
  userId: string
): boolean {
  if (!household.createdBy) return false;
  // After populate('createdBy'), createdBy may be a populated Mongoose User doc.
  // Mongoose does NOT override Document.prototype.toString — calling
  // doc.toString() returns "[object Object]". We must extract `_id` explicitly
  // when the value is an object, and call .toString() on the underlying ObjectId.
  const creatorId =
    typeof household.createdBy === 'object' && '_id' in household.createdBy
      ? (household.createdBy as { _id: Types.ObjectId | string })._id
      : household.createdBy;
  if (!creatorId) return false;
  return creatorId.toString() === userId;
}

function buildResponse(household: any, userId: string) {
  return {
    ...household.toObject(),
    myRole: isCreator(household, userId) ? 'admin' : 'member'
  };
}

export async function GET(_: NextRequest, { params }: { params: { householdId: string } }) {
  try {
    const session = await requireSession();
    await connectDb();
    await requireHouseholdMember(params.householdId, session.user.id);
    const household = await Household.findById(params.householdId)
      .populate('createdBy', 'name email')
      .populate('members', 'name email');
    if (!household) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(buildResponse(household, session.user.id));
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { householdId: string } }) {
  try {
    const session = await requireSession();
    await connectDb();
    await requireHouseholdMember(params.householdId, session.user.id);

    const body = await request.json();
    const parsed = settingsActionSchema.parse(body);

    const household = await Household.findById(params.householdId);
    if (!household) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    switch (parsed.action) {
      case 'rename': {
        household.name = parsed.name.trim();
        break;
      }
      case 'update-currency': {
        household.currency = parsed.currency.toUpperCase();
        break;
      }
      case 'regenerate-token': {
        if (!isCreator(household, session.user.id)) {
          return NextResponse.json(
            { error: 'Only the creator can regenerate the invite token' },
            { status: 403 }
          );
        }
        household.inviteToken = createInviteToken();
        break;
      }
      case 'remove-member': {
        if (!isCreator(household, session.user.id)) {
          return NextResponse.json(
            { error: 'Only the creator can remove other members' },
            { status: 403 }
          );
        }
        if (parsed.memberId === session.user.id) {
          return NextResponse.json(
            { error: 'Use the leave endpoint to remove yourself' },
            { status: 400 }
          );
        }
        if (household.members.length === 1) {
          return NextResponse.json(
            { error: 'Cannot remove the sole remaining member' },
            { status: 400 }
          );
        }
        const targetIndex = household.members.findIndex(
          (m: Types.ObjectId) => m.toString() === parsed.memberId
        );
        if (targetIndex === -1) {
          return NextResponse.json(
            { error: 'User is not a member of this household' },
            { status: 404 }
          );
        }
        household.members.splice(targetIndex, 1);
        break;
      }
    }

    await household.save();
    return NextResponse.json(buildResponse(household, session.user.id));
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid action', issues: err.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { householdId: string } }) {
  try {
    const session = await requireSession();
    await connectDb();
    await requireHouseholdMember(params.householdId, session.user.id);

    const household = await Household.findById(params.householdId);
    if (!household) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!isCreator(household, session.user.id)) {
      return NextResponse.json(
        { error: 'Only the creator can delete this household' },
        { status: 403 }
      );
    }
    // Cascade: remove expenses owned by this household first so they
    // don't become orphaned against a now-nonexistent Household.
    await Expense.deleteMany({ householdId: params.householdId });
    await Household.findByIdAndDelete(params.householdId);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
