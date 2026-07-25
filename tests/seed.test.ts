import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { seed } from '../scripts/seed';
import { Expense } from '../lib/models/Expense';
import { Household } from '../lib/models/Household';

beforeEach(async () => {
  // Ensure connection is open, then drop the test DB so each test starts clean
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGODB_URI!, { dbName: process.env.MONGODB_DB });
  }
  if (mongoose.connection.db) {
    await mongoose.connection.db.dropDatabase();
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
  }
});

describe('seed', () => {
  it('creates demo user, household, and 1 expense on first run', async () => {
    const { user, household } = await seed();
    expect(user).toBeTruthy();
    expect(user.email).toBe('demo@example.com');
    expect(household).toBeTruthy();
    expect(household.name).toBe('Demo Household');
    expect(household.inviteToken).toBe('demotoken123');

    const expenseCount = await Expense.countDocuments({ householdId: household._id });
    expect(expenseCount).toBe(1);
  });

  it('clears prior demo expenses on re-run (no duplication)', async () => {
    await seed();
    await seed();
    await seed();

    const household = await Household.findOne({ name: 'Demo Household' });
    expect(household).toBeTruthy();
    const expenseCount = await Expense.countDocuments({ householdId: household!._id });
    expect(expenseCount).toBe(1);
  });
});