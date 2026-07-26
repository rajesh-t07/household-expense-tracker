import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PATCH } from '@/app/api/households/[householdId]/members/[memberId]/role/route';
import { requireSession, requireAdmin } from '@/lib/permissions';
import { Household } from '@/lib/models/Household';
import { connectDb } from '@/lib/db';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';

vi.mock('@/lib/db', () => ({ connectDb: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/permissions', () => ({
  requireSession: vi.fn(),
  requireAdmin: vi.fn()
}));
vi.mock('@/lib/models/Household', () => ({
  Household: {
    findById: vi.fn()
  }
}));

function buildPatchRequest(body?: unknown): NextRequest {
  return {
    json: vi.fn().mockResolvedValue(body || { role: 'admin' })
  } as unknown as NextRequest;
}

describe('PATCH /api/households/[householdId]/members/[memberId]/role', () => {
  const householdId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
  const creatorId = 'creator123456789abcdef0';
  const targetId = 'target123456789abcdef00';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not signed in', async () => {
    vi.mocked(requireSession).mockRejectedValue(new UnauthorizedError());

    const res = await PATCH(buildPatchRequest(), {
      params: { householdId, memberId: targetId }
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 when not an admin', async () => {
    vi.mocked(requireSession).mockResolvedValue({ user: { id: 'user1' } } as any);
    vi.mocked(requireAdmin).mockRejectedValue(new ForbiddenError());

    const res = await PATCH(buildPatchRequest(), {
      params: { householdId, memberId: targetId }
    });
    expect(res.status).toBe(403);
  });

  it('returns 400 when trying to change the creator role', async () => {
    vi.mocked(requireSession).mockResolvedValue({ user: { id: 'user1' } } as any);
    vi.mocked(requireAdmin).mockResolvedValue({
      _id: householdId,
      createdBy: creatorId,
      members: [creatorId, targetId],
      roles: new Map(),
      save: vi.fn()
    });

    const res = await PATCH(buildPatchRequest({ role: 'member' }), {
      params: { householdId, memberId: creatorId }
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("creator's role");
  });

  it('returns 404 when target is not a member', async () => {
    vi.mocked(requireSession).mockResolvedValue({ user: { id: 'user1' } } as any);
    vi.mocked(requireAdmin).mockResolvedValue({
      _id: householdId,
      createdBy: creatorId,
      members: [creatorId],
      roles: new Map(),
      save: vi.fn()
    });

    const res = await PATCH(buildPatchRequest({ role: 'admin' }), {
      params: { householdId, memberId: targetId }
    });
    expect(res.status).toBe(404);
  });

  it('returns 200 and updates role for valid member', async () => {
    const mockSave = vi.fn();
    const mockRoles = new Map<string, string>();

    vi.mocked(requireSession).mockResolvedValue({ user: { id: 'user1' } } as any);
    vi.mocked(requireAdmin).mockResolvedValue({
      _id: householdId,
      createdBy: creatorId,
      members: [creatorId, targetId],
      roles: mockRoles,
      save: mockSave
    });

    const res = await PATCH(buildPatchRequest({ role: 'admin' }), {
      params: { householdId, memberId: targetId }
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.role).toBe('admin');
    expect(mockRoles.get(targetId)).toBe('admin');
    expect(mockSave).toHaveBeenCalled();
  });

  it('returns 200 and demotes admin to member', async () => {
    const mockSave = vi.fn();
    const mockRoles = new Map<string, string>([[targetId, 'admin']]);

    vi.mocked(requireSession).mockResolvedValue({ user: { id: 'user1' } } as any);
    vi.mocked(requireAdmin).mockResolvedValue({
      _id: householdId,
      createdBy: creatorId,
      members: [creatorId, targetId],
      roles: mockRoles,
      save: mockSave
    });

    const res = await PATCH(buildPatchRequest({ role: 'member' }), {
      params: { householdId, memberId: targetId }
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.role).toBe('member');
    expect(mockRoles.get(targetId)).toBe('member');
    expect(mockSave).toHaveBeenCalled();
  });

  it('returns 400 for invalid role value', async () => {
    vi.mocked(requireSession).mockResolvedValue({ user: { id: 'user1' } } as any);
    vi.mocked(requireAdmin).mockResolvedValue({
      _id: householdId,
      createdBy: creatorId,
      members: [creatorId, targetId],
      roles: new Map(),
      save: vi.fn()
    });

    const res = await PATCH(buildPatchRequest({ role: 'superadmin' }), {
      params: { householdId, memberId: targetId }
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Invalid role');
  });
});
