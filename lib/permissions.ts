import { Types } from 'mongoose';
import { auth } from './auth';
import { ForbiddenError, UnauthorizedError } from './errors';
import { Household } from './models/Household';

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }
  return session;
}

export async function requireHouseholdMember(householdId: string, userId: string) {
  const household = await Household.findById(householdId);
  if (!household || !household.members.some((member: Types.ObjectId) => member.toString() === userId)) {
    throw new ForbiddenError();
  }
  return household;
}

export async function requireAdmin(householdId: string, userId: string) {
  const household = await requireHouseholdMember(householdId, userId);
  const role = household.roles?.get(userId);
  // createdBy is always an admin; fall back to 'member' if no role is stored
  const isCreator = household.createdBy?.toString() === userId;
  if (!isCreator && role !== 'admin') {
    throw new ForbiddenError('Admin access required');
  }
  return household;
}
