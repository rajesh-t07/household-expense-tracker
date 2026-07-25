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
