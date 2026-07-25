import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import mongoose from 'mongoose';
import { Types } from 'mongoose';

vi.mock('@/lib/permissions', () => ({
  requireSession: vi.fn(),
  requireHouseholdMember: vi.fn()
}));

import { POST as bulkDelete } from '@/app/api/households/[householdId]/expenses/bulk-delete/route';
import { ForbiddenError, UnauthorizedError } from '@/lib/errors';
import { Expense } from '@/lib/models/Expense';
import { Household } from '@/lib/models/Household';
import { User } from '@/lib/models/User';
import { requireSession, requireHouseholdMember } from '@/lib/permissions';

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

async function seedThreeExpenses() {
  const user = new Types.ObjectId();
  await User.create({ _id: user, name: 'User', email: 'u@test.com' });
  const hh = await Household.create({
    name: 'Test HH',
    currency: 'USD',
    inviteToken: 't1',
    createdBy: user,
    members: [user]
  });
  const e1 = await Expense.create({
    householdId: hh._id, date: new Date(), merchant: 'E1', category: 'Groceries',
    subtotal: 10, taxTotal: 0, total: 10, createdByUserId: user, items: []
  });
  const e2 = await Expense.create({
    householdId: hh._id, date: new Date(), merchant: 'E2', category: 'Dining',
    subtotal: 20, taxTotal: 0, total: 20, createdByUserId: user, items: []
  });
  const e3 = await Expense.create({
    householdId: hh._id, date: new Date(), merchant: 'E3', category: 'Utilities',
    subtotal: 30, taxTotal: 0, total: 30, createdByUserId: user, items: []
  });
  // Also an unrelated household expense
  const otherUser = new Types.ObjectId();
  const hhOther = await Household.create({
    name: 'Other', currency: 'USD', inviteToken: 't2',
    createdBy: otherUser, members: [otherUser]
  });
  const otherExpense = await Expense.create({
    householdId: hhOther._id, date: new Date(), merchant: 'Other HH', category: 'Other',
    subtotal: 99, taxTotal: 0, total: 99, createdByUserId: otherUser, items: []
  });
  return { user, hh, expenses: [e1, e2, e3], otherExpense };
}

function delReq(householdId: string, ids: string[]): Request {
  return new Request(`http://localhost:3000/api/households/${householdId}/expenses/bulk-delete`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ids })
  });
}

describe('POST /api/households/[householdId]/expenses/bulk-delete', () => {
  it('returns 401 when not signed in', async () => {
    vi.mocked(requireSession).mockRejectedValue(new UnauthorizedError());

    const res = await bulkDelete(delReq('x', ['000000000000000000000000']) as any, {
      params: { householdId: 'x' }
    });

    expect(res.status).toBe(401);
  });

  it('returns 403 when caller is not a household member', async () => {
    vi.mocked(requireSession).mockResolvedValue({ user: { id: 'outside' } } as any);
    vi.mocked(requireHouseholdMember).mockRejectedValue(new ForbiddenError());

    const res = await bulkDelete(delReq('x', ['000000000000000000000000']) as any, {
      params: { householdId: 'x' }
    });

    expect(res.status).toBe(403);
  });

  it('deletes only matching expenses in the specified household', async () => {
    const { user, hh, expenses, otherExpense } = await seedThreeExpenses();
    vi.mocked(requireSession).mockResolvedValue({ user: { id: user.toString() } } as any);
    vi.mocked(requireHouseholdMember).mockResolvedValue({} as any);

    const res = await bulkDelete(
      delReq(hh._id.toString(), [expenses[0]._id.toString(), expenses[2]._id.toString()]) as any,
      { params: { householdId: hh._id.toString() } }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deleted).toBe(2);

    // Remaining in this household
    const remaining = await Expense.find({ householdId: hh._id });
    expect(remaining.length).toBe(1);
    expect(remaining[0]._id.toString()).toBe(expenses[1]._id.toString());

    // Unrelated expense must survive
    const other = await Expense.findById(otherExpense._id);
    expect(other).toBeTruthy();
  });

  it('returns 400 on invalid body (empty ids)', async () => {
    vi.mocked(requireSession).mockResolvedValue({ user: { id: 'u' } } as any);
    vi.mocked(requireHouseholdMember).mockResolvedValue({} as any);

    const res = await bulkDelete(delReq('x', []) as any, { params: { householdId: 'x' } });

    expect(res.status).toBe(400);
  });

  it('returns 400 on invalid body (non-array)', async () => {
    vi.mocked(requireSession).mockResolvedValue({ user: { id: 'u' } } as any);
    vi.mocked(requireHouseholdMember).mockResolvedValue({} as any);

    const res = await bulkDelete(
      new Request('http://localhost/api/households/x/expenses/bulk-delete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ids: 'not-an-array' })
      }) as any,
      { params: { householdId: 'x' } }
    );

    expect(res.status).toBe(400);
  });
});
