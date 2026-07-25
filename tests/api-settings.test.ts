import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import mongoose from 'mongoose';
import { Types } from 'mongoose';

// Side-effect import: ensure User is registered so populate() works.
import '@/lib/models/User';

vi.mock('@/lib/permissions', () => ({
  requireSession: vi.fn(),
  requireHouseholdMember: vi.fn()
}));

import { ForbiddenError, UnauthorizedError } from '@/lib/errors';
import {
  GET as getHousehold,
  PATCH as patchHousehold,
  DELETE as deleteHousehold
} from '@/app/api/households/[householdId]/route';
import { Expense } from '@/lib/models/Expense';
import { Household } from '@/lib/models/Household';
import { requireSession, requireHouseholdMember } from '@/lib/permissions';
import { User } from '@/lib/models/User';

beforeEach(async () => {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGODB_URI!, { dbName: process.env.MONGODB_DB });
  }
  if (mongoose.connection.db) {
    await mongoose.connection.db.dropDatabase();
  }
  vi.mocked(requireSession).mockReset();
  vi.mocked(requireHouseholdMember).mockReset();
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
  }
});

function buildHousehold(opts: { creatorId: Types.ObjectId; otherIds?: Types.ObjectId[] }) {
  const all = [opts.creatorId, ...(opts.otherIds ?? [])];
  return Household.create({
    name: 'Test Household',
    currency: 'USD',
    inviteToken: 'original-token',
    createdBy: opts.creatorId,
    members: all
  });
}

function makePatchRequest(action: string, payload: Record<string, unknown> = {}): Request {
  return new Request('http://localhost:3000/api/households/x', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action, ...payload })
  });
}

const ctx = (householdId: string) => ({ params: { householdId } });

describe('PATCH /api/households/[householdId]', () => {
  it('returns 401 when not signed in', async () => {
    vi.mocked(requireSession).mockRejectedValue(new UnauthorizedError());

    const res = await patchHousehold(makePatchRequest('rename', { name: 'New' }) as any, ctx('x'));

    expect(res.status).toBe(401);
  });

  it('returns 403 when caller is not a member', async () => {
    vi.mocked(requireSession).mockResolvedValue({ user: { id: 'outside-user' } } as any);
    vi.mocked(requireHouseholdMember).mockRejectedValue(new ForbiddenError());

    const res = await patchHousehold(makePatchRequest('rename', { name: 'New' }) as any, ctx('x'));

    expect(res.status).toBe(403);
  });

  it('returns 400 on invalid action payload (Zod)', async () => {
    vi.mocked(requireSession).mockResolvedValue({ user: { id: 'u' } } as any);
    vi.mocked(requireHouseholdMember).mockResolvedValue({} as any);

    const res = await patchHousehold(makePatchRequest('rename', { name: 'X' }) as any, ctx('x'));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid action');
  });

  it('renames the household (any member can rename)', async () => {
    const creator = new Types.ObjectId();
    const household = await buildHousehold({ creatorId: creator });
    vi.mocked(requireSession).mockResolvedValue({ user: { id: creator.toString() } } as any);
    vi.mocked(requireHouseholdMember).mockResolvedValue(household as any);

    const res = await patchHousehold(
      makePatchRequest('rename', { name: 'New Name' }) as any,
      ctx(household._id.toString())
    );

    expect(res.status).toBe(200);
    const fresh = await Household.findById(household._id);
    expect(fresh!.name).toBe('New Name');
  });

  it('updates the currency (uppercased)', async () => {
    const creator = new Types.ObjectId();
    const household = await buildHousehold({ creatorId: creator });
    vi.mocked(requireSession).mockResolvedValue({ user: { id: creator.toString() } } as any);
    vi.mocked(requireHouseholdMember).mockResolvedValue(household as any);

    const res = await patchHousehold(
      makePatchRequest('update-currency', { currency: 'eur' }) as any,
      ctx(household._id.toString())
    );

    expect(res.status).toBe(200);
    expect((await Household.findById(household._id))!.currency).toBe('EUR');
  });

  it('regenerates the invite token when caller is the creator', async () => {
    const creator = new Types.ObjectId();
    const household = await buildHousehold({ creatorId: creator });
    vi.mocked(requireSession).mockResolvedValue({ user: { id: creator.toString() } } as any);
    vi.mocked(requireHouseholdMember).mockResolvedValue(household as any);

    const res = await patchHousehold(
      makePatchRequest('regenerate-token') as any,
      ctx(household._id.toString())
    );

    expect(res.status).toBe(200);
    const fresh = await Household.findById(household._id);
    expect(fresh!.inviteToken).not.toBe('original-token');
    expect(fresh!.inviteToken.length).toBe(32);
  });

  it('refuses to regenerate the invite token for non-creators', async () => {
    const creator = new Types.ObjectId();
    const other = new Types.ObjectId();
    const household = await buildHousehold({ creatorId: creator, otherIds: [other] });
    vi.mocked(requireSession).mockResolvedValue({ user: { id: other.toString() } } as any);
    vi.mocked(requireHouseholdMember).mockResolvedValue(household as any);

    const res = await patchHousehold(
      makePatchRequest('regenerate-token') as any,
      ctx(household._id.toString())
    );

    expect(res.status).toBe(403);
    const fresh = await Household.findById(household._id);
    expect(fresh!.inviteToken).toBe('original-token'); // untouched
  });

  it('removes a non-creator member from a multi-member household', async () => {
    const creator = new Types.ObjectId();
    const other = new Types.ObjectId();
    const household = await buildHousehold({ creatorId: creator, otherIds: [other] });
    vi.mocked(requireSession).mockResolvedValue({ user: { id: creator.toString() } } as any);
    vi.mocked(requireHouseholdMember).mockResolvedValue(household as any);

    const res = await patchHousehold(
      makePatchRequest('remove-member', { memberId: other.toString() }) as any,
      ctx(household._id.toString())
    );

    expect(res.status).toBe(200);
    const fresh = await Household.findById(household._id);
    expect(fresh!.members.length).toBe(1);
    expect(fresh!.members[0].toString()).toBe(creator.toString());
  });

  it('refuses to remove a member when caller is not the creator (returns 403)', async () => {
    const creator = new Types.ObjectId();
    const other = new Types.ObjectId();
    const household = await buildHousehold({ creatorId: creator, otherIds: [other] });
    vi.mocked(requireSession).mockResolvedValue({ user: { id: other.toString() } } as any);
    vi.mocked(requireHouseholdMember).mockResolvedValue(household as any);

    const res = await patchHousehold(
      makePatchRequest('remove-member', { memberId: creator.toString() }) as any,
      ctx(household._id.toString())
    );

    expect(res.status).toBe(403);
  });

  it('refuses self-removal via remove-member (use /leave instead)', async () => {
    const creator = new Types.ObjectId();
    const household = await buildHousehold({ creatorId: creator });
    vi.mocked(requireSession).mockResolvedValue({ user: { id: creator.toString() } } as any);
    vi.mocked(requireHouseholdMember).mockResolvedValue(household as any);

    const res = await patchHousehold(
      makePatchRequest('remove-member', { memberId: creator.toString() }) as any,
      ctx(household._id.toString())
    );

    expect(res.status).toBe(400);
    const fresh = await Household.findById(household._id);
    expect(fresh!.members.length).toBe(1);
  });

  it('returns 404 when removing a user who is not a member', async () => {
    const creator = new Types.ObjectId();
    const other = new Types.ObjectId();
    const stranger = new Types.ObjectId();
    const household = await buildHousehold({ creatorId: creator, otherIds: [other] });
    vi.mocked(requireSession).mockResolvedValue({ user: { id: creator.toString() } } as any);
    vi.mocked(requireHouseholdMember).mockResolvedValue(household as any);

    const res = await patchHousehold(
      makePatchRequest('remove-member', { memberId: stranger.toString() }) as any,
      ctx(household._id.toString())
    );

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/households/[householdId]', () => {
  it('returns 401 when not signed in', async () => {
    vi.mocked(requireSession).mockRejectedValue(new UnauthorizedError());

    const req = new Request('http://localhost:3000/api/households/x', { method: 'DELETE' });
    const res = await deleteHousehold(req as any, ctx('x'));

    expect(res.status).toBe(401);
  });

  it('returns 403 when caller is not the creator', async () => {
    const creator = new Types.ObjectId();
    const other = new Types.ObjectId();
    const household = await buildHousehold({ creatorId: creator, otherIds: [other] });
    vi.mocked(requireSession).mockResolvedValue({ user: { id: other.toString() } } as any);
    vi.mocked(requireHouseholdMember).mockResolvedValue(household as any);

    const req = new Request(`http://localhost:3000/api/households/${household._id}`, {
      method: 'DELETE'
    });
    const res = await deleteHousehold(req as any, ctx(household._id.toString()));

    expect(res.status).toBe(403);
    const fresh = await Household.findById(household._id);
    expect(fresh).toBeTruthy();
  });

  it('deletes the household when caller is the creator', async () => {
    const creator = new Types.ObjectId();
    const household = await buildHousehold({ creatorId: creator });
    vi.mocked(requireSession).mockResolvedValue({ user: { id: creator.toString() } } as any);
    vi.mocked(requireHouseholdMember).mockResolvedValue(household as any);

    const req = new Request(`http://localhost:3000/api/households/${household._id}`, {
      method: 'DELETE'
    });
    const res = await deleteHousehold(req as any, ctx(household._id.toString()));

    expect(res.status).toBe(200);
    const fresh = await Household.findById(household._id);
    expect(fresh).toBeNull();
  });

  it('cascade-deletes associated expenses', async () => {
    const creator = new Types.ObjectId();
    const household = await buildHousehold({ creatorId: creator });

    // Seed an expense tied to this household; also seed one in a *different*
    // household to confirm we only delete this household's expenses (not all).
    const otherHousehold = await Household.create({
      name: 'Other Household',
      currency: 'USD',
      inviteToken: 'other-tok',
      createdBy: new Types.ObjectId(),
      members: []
    });
    const ownExpense = await Expense.create({
      householdId: household._id,
      date: new Date(),
      merchant: 'Cascade Test',
      category: 'Groceries',
      subtotal: 10,
      taxTotal: 0,
      total: 10,
      createdByUserId: creator,
      items: []
    });
    const otherExpense = await Expense.create({
      householdId: otherHousehold._id,
      date: new Date(),
      merchant: 'Should Survive',
      category: 'Dining',
      subtotal: 5,
      taxTotal: 0,
      total: 5,
      createdByUserId: new Types.ObjectId(),
      items: []
    });

    vi.mocked(requireSession).mockResolvedValue({ user: { id: creator.toString() } } as any);
    vi.mocked(requireHouseholdMember).mockResolvedValue(household as any);

    const req = new Request(`http://localhost:3000/api/households/${household._id}`, {
      method: 'DELETE'
    });
    const res = await deleteHousehold(req as any, ctx(household._id.toString()));

    expect(res.status).toBe(200);
    expect(await Household.findById(household._id)).toBeNull();
    expect(await Expense.findById(ownExpense._id)).toBeNull();
    // Unrelated expense must survive.
    expect(await Expense.findById(otherExpense._id)).toBeTruthy();
  });
});

describe('GET /api/households/[householdId]', () => {
  it('annotates myRole=admin for the creator', async () => {
    const creator = new Types.ObjectId();
    // Seed the User doc so populate('createdBy') resolves to a real object.
    await User.create({ _id: creator, name: 'Creator', email: 'creator@example.com' });
    const household = await buildHousehold({ creatorId: creator });
    vi.mocked(requireSession).mockResolvedValue({ user: { id: creator.toString() } } as any);
    vi.mocked(requireHouseholdMember).mockResolvedValue(household as any);

    const req = new Request(`http://localhost:3000/api/households/${household._id}`);
    const res = await getHousehold(req as any, ctx(household._id.toString()));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.myRole).toBe('admin');
  });

  it('annotates myRole=member for non-creators', async () => {
    const creator = new Types.ObjectId();
    const other = new Types.ObjectId();
    // Seed only the creator's User; `other` has no User doc — populate('members')
    // will return null for that entry, but we're checking myRole (which only
    // looks at createdBy), so the test should still pass.
    await User.create({ _id: creator, name: 'Creator', email: 'creator@example.com' });
    const household = await buildHousehold({ creatorId: creator, otherIds: [other] });
    vi.mocked(requireSession).mockResolvedValue({ user: { id: other.toString() } } as any);
    vi.mocked(requireHouseholdMember).mockResolvedValue(household as any);

    const req = new Request(`http://localhost:3000/api/households/${household._id}`);
    const res = await getHousehold(req as any, ctx(household._id.toString()));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.myRole).toBe('member');
  });
});
