import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/households/[householdId]/invite/route';
import { requireSession } from '@/lib/permissions';
import { requireAdmin } from '@/lib/permissions';
import { Household } from '@/lib/models/Household';
import { connectDb } from '@/lib/db';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';

vi.mock('@/lib/db', () => ({ connectDb: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/permissions', () => ({
  requireSession: vi.fn(),
  requireAdmin: vi.fn()
}));
vi.mock('@/lib/resend', () => ({
  resend: {
    emails: {
      send: vi.fn().mockResolvedValue({ id: 'mock-email-id' })
    }
  },
  FROM_EMAIL: 'invites@test.com'
}));
vi.mock('@/lib/models/Household', () => ({
  Household: {
    findById: vi.fn()
  }
}));

function buildPostRequest(body?: unknown): NextRequest {
  return {
    json: vi.fn().mockResolvedValue(body || { email: 'friend@example.com' })
  } as unknown as NextRequest;
}

describe('POST /api/households/[householdId]/invite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not signed in', async () => {
    vi.mocked(requireSession).mockRejectedValue(new UnauthorizedError());

    const res = await POST(buildPostRequest(), { params: { householdId: 'aaaaaaaaaaaaaaaaaaaaaaaa' } });
    expect(res.status).toBe(401);
  });

  it('returns 403 when not an admin', async () => {
    vi.mocked(requireSession).mockResolvedValue({ user: { id: 'user1', name: 'Test' } } as any);
    vi.mocked(requireAdmin).mockRejectedValue(new ForbiddenError());

    const res = await POST(buildPostRequest(), { params: { householdId: 'aaaaaaaaaaaaaaaaaaaaaaaa' } });
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid email', async () => {
    vi.mocked(requireSession).mockResolvedValue({ user: { id: 'user1', name: 'Test' } } as any);
    vi.mocked(requireAdmin).mockResolvedValue({ _id: 'aaaaaaaaaaaaaaaaaaaaaaaa' });

    const res = await POST(buildPostRequest({ email: 'not-an-email' }), {
      params: { householdId: 'aaaaaaaaaaaaaaaaaaaaaaaa' }
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Invalid email');
  });

  it('returns 404 for non-existent household', async () => {
    vi.mocked(requireSession).mockResolvedValue({ user: { id: 'user1', name: 'Test' } } as any);
    vi.mocked(requireAdmin).mockResolvedValue({ _id: 'aaaaaaaaaaaaaaaaaaaaaaaa' });
    vi.mocked(Household.findById).mockResolvedValue(null);

    const res = await POST(buildPostRequest(), { params: { householdId: 'aaaaaaaaaaaaaaaaaaaaaaaa' } });
    expect(res.status).toBe(404);
  });

  it('sends invite email and returns success when admin', async () => {
    vi.mocked(requireSession).mockResolvedValue({
      user: { id: 'user1', name: 'Alice' }
    } as any);
    vi.mocked(requireAdmin).mockResolvedValue({
      _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      name: 'Family',
      inviteToken: 'testtoken123'
    });
    vi.mocked(Household.findById).mockResolvedValue({
      _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      name: 'Family',
      inviteToken: 'testtoken123'
    });

    const res = await POST(buildPostRequest({ email: 'friend@example.com' }), {
      params: { householdId: 'aaaaaaaaaaaaaaaaaaaaaaaa' }
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.invited).toBe('friend@example.com');
  });
});
