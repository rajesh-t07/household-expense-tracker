import { auth } from './auth';
import { Household } from './models/Household';

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }
  return session;
}

export async function requireHouseholdMember(householdId: string, userId: string) {
  const household = await Household.findById(householdId);
  if (!household || !household.members.some((member) => member.toString() === userId)) {
    throw new Error('Forbidden');
  }
  return household;
}
