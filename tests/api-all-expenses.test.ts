import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import mongoose from 'mongoose';
import { Types } from 'mongoose';

vi.mock('@/lib/permissions', () => ({
  requireSession: vi.fn()
}));

import { GET as getAllExpenses } from '@/app/api/all-expenses/route';
import { UnauthorizedError } from '@/lib/errors';
import { Expense } from '@/lib/models/Expense';
import { Household } from '@/lib/models/Household';
import { User } from '@/lib/models/User';
import { requireSession } from '@/lib/permissions';

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

async function seedMixedHouseholds() {
  const me = new Types.ObjectId();
  const stranger = new Types.ObjectId();

  await User.create([
    { _id: me, name: 'Me', email: 'me@example.com' },
    { _id: stranger, name: 'Stranger', email: 'stranger@example.com' }
  ]);

  const hhMine = await Household.create({
    name: 'My Apartment',
    currency: 'USD',
    inviteToken: 'mine',
    createdBy: me,
    members: [me]
  });
  const hhOther = await Household.create({
    name: 'Roommates',
    currency: 'EUR',
    inviteToken: 'room',
    createdBy: me,
    members: [me]
  });
  const hhStranger = await Household.create({
    name: 'Stranger House',
    currency: 'GBP',
    inviteToken: 'str',
    createdBy: stranger,
    members: [stranger]
  });

  const t = (offset: number) =>
    new Date('2025-01-01T00:00:00.000Z').setUTCDate(1 + offset);

  await Expense.create([
    {
      householdId: hhMine._id,
      date: new Date(t(0)),
      merchant: 'Mine 1',
      category: 'Groceries',
      subtotal: 10,
      taxTotal: 0,
      total: 10,
      createdByUserId: me,
      items: []
    },
    {
      householdId: hhMine._id,
      date: new Date(t(1)),
      merchant: 'Mine 2',
      category: 'Dining',
      subtotal: 20,
      taxTotal: 0,
      total: 20,
      createdByUserId: me,
      items: []
    },
    {
      householdId: hhOther._id,
      date: new Date(t(2)),
      merchant: 'Other',
      category: 'Utilities',
      subtotal: 30,
      taxTotal: 0,
      total: 30,
      createdByUserId: me,
      items: []
    },
    {
      householdId: hhStranger._id,
      date: new Date(t(3)),
      merchant: 'Stranger 1',
      category: 'Groceries',
      subtotal: 100,
      taxTotal: 0,
      total: 100,
      createdByUserId: stranger,
      items: []
    },
    {
      householdId: hhStranger._id,
      date: new Date(t(4)),
      merchant: 'Stranger 2',
      category: 'Groceries',
      subtotal: 200,
      taxTotal: 0,
      total: 200,
      createdByUserId: stranger,
      items: []
    }
  ]);

  return { me, hhMine, hhOther, hhStranger };
}

describe('GET /api/all-expenses', () => {
  it('returns 401 when not signed in', async () => {
    vi.mocked(requireSession).mockRejectedValue(new UnauthorizedError());

    const req = new Request('http://localhost:3000/api/all-expenses');
    const res = await getAllExpenses(req as any);

    expect(res.status).toBe(401);
  });

  it('returns only expenses from households the user belongs to', async () => {
    const { me } = await seedMixedHouseholds();
    vi.mocked(requireSession).mockResolvedValue({ user: { id: me.toString() } } as any);

    const req = new Request('http://localhost:3000/api/all-expenses?limit=10');
    const res = await getAllExpenses(req as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(3); // 2 (mine) + 1 (other)
    expect(body.expenses.length).toBe(3);

    // Sorted by date desc → Other (Jan 3), Mine 2 (Jan 2), Mine 1 (Jan 1)
    const merchants = body.expenses.map((e: { merchant: string }) => e.merchant);
    expect(merchants).toEqual(['Other', 'Mine 2', 'Mine 1']);

    // Stranger expenses are excluded
    expect(merchants).not.toContain('Stranger 1');
    expect(merchants).not.toContain('Stranger 2');
  });

  it('denormalizes householdName + householdCurrency on each expense', async () => {
    const { me } = await seedMixedHouseholds();
    vi.mocked(requireSession).mockResolvedValue({ user: { id: me.toString() } } as any);

    const req = new Request('http://localhost:3000/api/all-expenses?limit=10');
    const res = await getAllExpenses(req as any);

    const body = await res.json();
    const other = body.expenses.find(
      (e: { merchant: string }) => e.merchant === 'Other'
    );
    expect(other.householdName).toBe('Roommates');
    expect(other.householdCurrency).toBe('EUR');
  });

  it('honors the limit parameter and reports hasMore', async () => {
    const { me } = await seedMixedHouseholds();
    vi.mocked(requireSession).mockResolvedValue({ user: { id: me.toString() } } as any);

    const req = new Request('http://localhost:3000/api/all-expenses?limit=2');
    const res = await getAllExpenses(req as any);

    const body = await res.json();
    expect(body.expenses.length).toBe(2);
    expect(body.hasMore).toBe(true);
  });

  it('returns empty arrays when the user has no households', async () => {
    const orphan = new Types.ObjectId();
    vi.mocked(requireSession).mockResolvedValue({ user: { id: orphan.toString() } } as any);

    const req = new Request('http://localhost:3000/api/all-expenses');
    const res = await getAllExpenses(req as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.expenses).toEqual([]);
    expect(body.households).toEqual([]);
    expect(body.count).toBe(0);
    expect(body.hasMore).toBe(false);
  });
});
