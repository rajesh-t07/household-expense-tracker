import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import mongoose from 'mongoose';
import { Types } from 'mongoose';

vi.mock('@/lib/permissions', () => ({
  requireSession: vi.fn(),
  requireHouseholdMember: vi.fn()
}));

import { PATCH as editExpense } from '@/app/api/households/[householdId]/expenses/[expenseId]/route';
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

async function seedWithExpense() {
  const creator = new Types.ObjectId();
  await User.create([{ _id: creator, name: 'Creator', email: 'c@test.com' }]);
  const hh = await Household.create({
    name: 'Test HH',
    currency: 'USD',
    inviteToken: 't1',
    createdBy: creator,
    members: [creator]
  });
  const expense = await Expense.create({
    householdId: hh._id,
    date: new Date('2025-06-01'),
    merchant: 'Original Merchant',
    category: 'Groceries',
    subtotal: 10,
    taxTotal: 2,
    total: 12,
    createdByUserId: creator,
    items: []
  });
  return { creator, hh, expense };
}

async function seedMultiMemberWithExpense() {
  const creator = new Types.ObjectId();
  const nonCreator = new Types.ObjectId();
  await User.create([
    { _id: creator, name: 'Creator', email: 'c@t.com' },
    { _id: nonCreator, name: 'Other', email: 'o@t.com' }
  ]);
  const hh = await Household.create({
    name: 'Multi HH',
    currency: 'USD',
    inviteToken: 't2',
    createdBy: creator,
    members: [creator, nonCreator]
  });
  const expense = await Expense.create({
    householdId: hh._id,
    date: new Date(),
    merchant: 'Creator Only',
    category: 'Dining',
    subtotal: 20,
    taxTotal: 0,
    total: 20,
    createdByUserId: creator,
    items: []
  });
  return { creator, nonCreator, hh, expense };
}

function editReq(householdId: string, expenseId: string, body: Record<string, unknown>): Request {
  return new Request(`http://localhost:3000/api/households/${householdId}/expenses/${expenseId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
}

describe('PATCH /api/households/[householdId]/expenses/[expenseId]', () => {
  it('returns 401 when not signed in', async () => {
    vi.mocked(requireSession).mockRejectedValue(new UnauthorizedError());

    const res = await editExpense(editReq('hh1', 'exp1', { merchant: 'New' }) as any, {
      params: { householdId: 'hh1', expenseId: 'exp1' }
    });

    expect(res.status).toBe(401);
  });

  it('returns 404 when expense does not exist', async () => {
    vi.mocked(requireSession).mockResolvedValue({ user: { id: 'any' } } as any);
    vi.mocked(requireHouseholdMember).mockResolvedValue({} as any);
    const missing = new Types.ObjectId().toString();
    // Use a householdId from a seeded household so requireHouseholdMember passes.
    const { hh } = await seedWithExpense();
    vi.mocked(requireSession).mockResolvedValue({ user: { id: 'any' } } as any);
    vi.mocked(requireHouseholdMember).mockResolvedValue({} as any);

    const res = await editExpense(
      editReq(hh._id.toString(), missing, { merchant: 'New' }) as any,
      { params: { householdId: hh._id.toString(), expenseId: missing } }
    );

    expect(res.status).toBe(404);
  });

  it('returns 403 when caller is not a household member (before creator check)', async () => {
    const { hh, expense } = await seedWithExpense();
    const stranger = new Types.ObjectId();
    vi.mocked(requireSession).mockResolvedValue({ user: { id: stranger.toString() } } as any);
    vi.mocked(requireHouseholdMember).mockRejectedValue(new ForbiddenError());

    const res = await editExpense(
      editReq(hh._id.toString(), expense._id.toString(), { merchant: 'Hacked' }) as any,
      { params: { householdId: hh._id.toString(), expenseId: expense._id.toString() } }
    );

    expect(res.status).toBe(403);
  });

  it('returns 403 when caller is a member but not the expense creator', async () => {
    const { nonCreator, hh, expense } = await seedMultiMemberWithExpense();
    vi.mocked(requireSession).mockResolvedValue({ user: { id: nonCreator.toString() } } as any);
    vi.mocked(requireHouseholdMember).mockResolvedValue({} as any);

    const res = await editExpense(
      editReq(hh._id.toString(), expense._id.toString(), { merchant: 'Edited by Other' }) as any,
      { params: { householdId: hh._id.toString(), expenseId: expense._id.toString() } }
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/creator/i);
  });

  it('updates merchant when caller is the creator', async () => {
    const { creator, hh, expense } = await seedWithExpense();
    vi.mocked(requireSession).mockResolvedValue({ user: { id: creator.toString() } } as any);
    vi.mocked(requireHouseholdMember).mockResolvedValue({} as any);

    const res = await editExpense(
      editReq(hh._id.toString(), expense._id.toString(), { merchant: 'New Merchant' }) as any,
      { params: { householdId: hh._id.toString(), expenseId: expense._id.toString() } }
    );

    expect(res.status).toBe(200);
    const fresh = await Expense.findById(expense._id);
    expect(fresh!.merchant).toBe('New Merchant');
    expect(fresh!.category).toBe('Groceries'); // unchanged
  });

  it('updates multiple fields including simpleTotal (recalculates total)', async () => {
    const { creator, hh, expense } = await seedWithExpense();
    vi.mocked(requireSession).mockResolvedValue({ user: { id: creator.toString() } } as any);
    vi.mocked(requireHouseholdMember).mockResolvedValue({} as any);

    const res = await editExpense(
      editReq(hh._id.toString(), expense._id.toString(), {
        merchant: 'Updated Merc',
        category: 'Dining',
        notes: 'My note',
        simpleTotal: 25
      }) as any,
      { params: { householdId: hh._id.toString(), expenseId: expense._id.toString() } }
    );

    expect(res.status).toBe(200);
    const fresh = await Expense.findById(expense._id);
    expect(fresh!.merchant).toBe('Updated Merc');
    expect(fresh!.category).toBe('Dining');
    expect(fresh!.notes).toBe('My note');
    expect(fresh!.subtotal).toBe(25);
    expect(fresh!.total).toBe(27); // 25 + original taxTotal (2)
  });

  it('returns 400 on invalid fields (Zod)', async () => {
    const { creator, hh, expense } = await seedWithExpense();
    vi.mocked(requireSession).mockResolvedValue({ user: { id: creator.toString() } } as any);
    vi.mocked(requireHouseholdMember).mockResolvedValue({} as any);

    const res = await editExpense(
      editReq(hh._id.toString(), expense._id.toString(), { category: 'NonExistent' }) as any,
      { params: { householdId: hh._id.toString(), expenseId: expense._id.toString() } }
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid fields');
  });
});
