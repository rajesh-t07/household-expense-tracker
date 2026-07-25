import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import mongoose from 'mongoose';
import { Types } from 'mongoose';

// Side-effect import: ensure the User model is registered before populate() calls
// (Household.createdBy and Household.members both use `ref: 'User'`).
import '@/lib/models/User';

import { ForbiddenError, UnauthorizedError } from '@/lib/errors';

// Mock the permissions module BEFORE importing the route so route.ts sees the mock.
vi.mock('@/lib/permissions', () => ({
  requireSession: vi.fn(),
  requireHouseholdMember: vi.fn()
}));

// Import route AFTER mocks are declared (vitest hoists vi.mock above imports).
// Some bundlers trip if the param-bracketed path is missing — use the @ alias.
import { GET as getHousehold } from '@/app/api/households/[householdId]/route';
import { requireSession, requireHouseholdMember } from '@/lib/permissions';
import { Household } from '@/lib/models/Household';

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

function makeRequest(householdId: string): Request {
  return new Request(`http://localhost:3000/api/households/${householdId}`, { method: 'GET' });
}

describe('GET /api/households/[householdId]', () => {
  it('returns 401 when requireSession throws Unauthorized', async () => {
    vi.mocked(requireSession).mockRejectedValue(new UnauthorizedError());

    const res = await getHousehold(makeRequest('abc') as any, { params: { householdId: 'abc' } });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
    expect(requireHouseholdMember).not.toHaveBeenCalled();
  });

  it('returns 403 when requireHouseholdMember throws Forbidden', async () => {
    vi.mocked(requireSession).mockResolvedValue({ user: { id: 'user-1' } } as any);
    vi.mocked(requireHouseholdMember).mockRejectedValue(new ForbiddenError());

    const res = await getHousehold(makeRequest('hh-that-misses') as any, {
      params: { householdId: 'hh-that-misses' }
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden');
  });

  it('returns 200 + populated household when caller is a member', async () => {
    const createdById = new Types.ObjectId();
    const memberId = createdById; // single-member household is fine for the GET path
    const household = await Household.create({
      name: 'Sunday Brunch',
      currency: 'USD',
      inviteToken: 'inviteabc123',
      createdBy: createdById,
      members: [memberId]
    });

    vi.mocked(requireSession).mockResolvedValue({ user: { id: memberId.toString() } } as any);
    vi.mocked(requireHouseholdMember).mockResolvedValue(household as any);

    const res = await getHousehold(makeRequest(household._id.toString()) as any, {
      params: { householdId: household._id.toString() }
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.inviteToken).toBe('inviteabc123');
    expect(body.name).toBe('Sunday Brunch');
    // createdBy populated to an object (User lookup returns null since the ref doesn't exist
    // in the test DB — that's OK, populate does not require the document to exist)
    expect(typeof body.createdBy).toBe('object');
  });

  it('returns 500 on unexpected errors (not Unauthorized or Forbidden)', async () => {
    // Plain Error (not AuthError subclass) — verifies the catch falls through to 500.
    vi.mocked(requireSession).mockRejectedValue(new Error('Something exploded'));

    const res = await getHousehold(makeRequest('abc') as any, { params: { householdId: 'abc' } });

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Server error');
  });
});
