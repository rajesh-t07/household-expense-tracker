import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import mongoose from 'mongoose';
import { Types } from 'mongoose';

const mockCookieSet = vi.fn();
const mockCookieDelete = vi.fn();

vi.mock('next/headers', () => ({
  cookies: () => ({
    set: mockCookieSet,
    delete: mockCookieDelete,
    get: vi.fn()
  })
}));

vi.mock('@/lib/permissions', () => ({
  requireSession: vi.fn()
}));

import { POST as setLast, DELETE as clearLast } from '@/app/api/users/me/last-household/route';
import { UnauthorizedError } from '@/lib/errors';
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
  mockCookieSet.mockReset();
  mockCookieDelete.mockReset();
  vi.mocked(requireSession).mockReset();
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
  }
});

function buildPostRequest(body?: unknown): Request {
  return new Request('http://localhost:3000/api/users/me/last-household', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

function buildDeleteRequest(): Request {
  return new Request('http://localhost:3000/api/users/me/last-household', {
    method: 'DELETE'
  });
}

describe('POST /api/users/me/last-household', () => {
  it('returns 401 when not signed in', async () => {
    vi.mocked(requireSession).mockRejectedValue(new UnauthorizedError());

    const res = await setLast(buildPostRequest({ householdId: new Types.ObjectId().toString() }) as any);

    expect(res.status).toBe(401);
    expect(mockCookieSet).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid householdId format', async () => {
    vi.mocked(requireSession).mockResolvedValue({ user: { id: 'u' } } as any);

    const res = await setLast(buildPostRequest({ householdId: 'not-an-objectid' }) as any);

    expect(res.status).toBe(400);
    expect(mockCookieSet).not.toHaveBeenCalled();
  });

  it('returns 400 when body is missing', async () => {
    vi.mocked(requireSession).mockResolvedValue({ user: { id: 'u' } } as any);

    const res = await setLast(buildPostRequest() as any);

    expect(res.status).toBe(400);
  });

  it('returns 403 when caller is not a member of the target household', async () => {
    const userId = new Types.ObjectId();
    const otherId = new Types.ObjectId();
    await User.create([{ _id: userId, name: 'Me', email: 'me@example.com' }]);
    const hh = await Household.create({
      name: 'Other HH',
      currency: 'USD',
      inviteToken: 't',
      createdBy: otherId,
      members: [otherId]
    });

    vi.mocked(requireSession).mockResolvedValue({ user: { id: userId.toString() } } as any);

    const res = await setLast(buildPostRequest({ householdId: hh._id.toString() }) as any);

    expect(res.status).toBe(403);
    expect(mockCookieSet).not.toHaveBeenCalled();
  });

  it('sets the lastHouseholdId cookie with correct options when caller is a member', async () => {
    const userId = new Types.ObjectId();
    await User.create({ _id: userId, name: 'Me', email: 'me@example.com' });
    const hh = await Household.create({
      name: 'Test HH',
      currency: 'USD',
      inviteToken: 'tok',
      createdBy: userId,
      members: [userId]
    });

    vi.mocked(requireSession).mockResolvedValue({ user: { id: userId.toString() } } as any);

    const res = await setLast(buildPostRequest({ householdId: hh._id.toString() }) as any);

    expect(res.status).toBe(200);
    expect(mockCookieSet).toHaveBeenCalledOnce();
    const [name, value, options] = mockCookieSet.mock.calls[0];
    expect(name).toBe('lastHouseholdId');
    expect(value).toBe(hh._id.toString());
    expect(options).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
      secure: false
    });
  });
});

describe('DELETE /api/users/me/last-household', () => {
  it('returns 401 when not signed in', async () => {
    vi.mocked(requireSession).mockRejectedValue(new UnauthorizedError());

    const res = await clearLast(buildDeleteRequest() as any);

    expect(res.status).toBe(401);
    expect(mockCookieDelete).not.toHaveBeenCalled();
  });

  it('clears the lastHouseholdId cookie when signed in', async () => {
    vi.mocked(requireSession).mockResolvedValue({ user: { id: 'some-user' } } as any);

    const res = await clearLast(buildDeleteRequest() as any);

    expect(res.status).toBe(200);
    expect(mockCookieDelete).toHaveBeenCalledWith('lastHouseholdId');
  });
});
