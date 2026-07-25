import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import mongoose from 'mongoose';
import { Types } from 'mongoose';

vi.mock('@/lib/permissions', () => ({
  requireSession: vi.fn()
}));

import { POST as leaveHousehold } from '@/app/api/households/[householdId]/leave/route';
import { UnauthorizedError } from '@/lib/errors';
import { requireSession } from '@/lib/permissions';
import { Household } from '@/lib/models/Household';

beforeEach(async () => {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGODB_URI!, { dbName: process.env.MONGODB_DB });
  }
  if (mongoose.connection.db) {
    await mongoose.connection.db.dropDatabase();
  }
  vi.mocked(requireSession).mockReset();
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
  }
});

function makeLeaveRequest(householdId: string): Request {
  return new Request(`http://localhost:3000/api/households/${householdId}/leave`, { method: 'POST' });
}

describe('POST /api/households/[householdId]/leave', () => {
  it('returns 401 when requireSession throws Unauthorized', async () => {
    vi.mocked(requireSession).mockRejectedValue(new UnauthorizedError());

    const res = await leaveHousehold(makeLeaveRequest('abc') as any, {
      params: { householdId: 'abc' }
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 404 when the household does not exist', async () => {
    vi.mocked(requireSession).mockResolvedValue({ user: { id: new Types.ObjectId().toString() } } as any);
    const missingId = new Types.ObjectId().toString();

    const res = await leaveHousehold(makeLeaveRequest(missingId) as any, {
      params: { householdId: missingId }
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Not found');
  });

  it('returns 403 when the caller is not a member', async () => {
    const me = new Types.ObjectId();
    const stranger = new Types.ObjectId();
    const household = await Household.create({
      name: 'Strangers Only',
      currency: 'EUR',
      inviteToken: 't1',
      createdBy: stranger,
      members: [stranger]
    });

    vi.mocked(requireSession).mockResolvedValue({ user: { id: me.toString() } } as any);

    const res = await leaveHousehold(makeLeaveRequest(household._id.toString()) as any, {
      params: { householdId: household._id.toString() }
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Not a member');
  });

  it('refuses to orphan the household when the caller is the only member', async () => {
    const me = new Types.ObjectId();
    const household = await Household.create({
      name: 'Solo Household',
      currency: 'USD',
      inviteToken: 'solo-tok',
      createdBy: me,
      members: [me]
    });

    vi.mocked(requireSession).mockResolvedValue({ user: { id: me.toString() } } as any);

    const res = await leaveHousehold(makeLeaveRequest(household._id.toString()) as any, {
      params: { householdId: household._id.toString() }
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/only remaining member/i);

    // Members array unchanged in DB.
    const fresh = await Household.findById(household._id);
    expect(fresh!.members.length).toBe(1);
    expect(fresh!.members[0].toString()).toBe(me.toString());
  });

  it('removes the caller from a multi-member household', async () => {
    const me = new Types.ObjectId();
    const other = new Types.ObjectId();
    const household = await Household.create({
      name: 'Roommates',
      currency: 'USD',
      inviteToken: 'multi-tok',
      createdBy: me,
      members: [me, other]
    });

    vi.mocked(requireSession).mockResolvedValue({ user: { id: me.toString() } } as any);

    const res = await leaveHousehold(makeLeaveRequest(household._id.toString()) as any, {
      params: { householdId: household._id.toString() }
    });

    expect(res.status).toBe(200);

    const fresh = await Household.findById(household._id);
    expect(fresh!.members.length).toBe(1);
    expect(fresh!.members[0].toString()).toBe(other.toString());
  });
});
