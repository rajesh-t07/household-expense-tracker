import { connectDb } from '../lib/db';
import { User } from '../lib/models/User';
import { Household } from '../lib/models/Household';
import { Expense } from '../lib/models/Expense';

async function main() {
  await connectDb();
  const user = await User.findOneAndUpdate(
    { email: 'demo@example.com' },
    { name: 'Demo User', email: 'demo@example.com' },
    { upsert: true, new: true }
  );
  const household = await Household.findOneAndUpdate(
    { name: 'Demo Household' },
    { name: 'Demo Household', currency: 'USD', createdBy: user._id, members: [user._id], inviteToken: 'demotoken123' },
    { upsert: true, new: true }
  );

  await Expense.deleteMany({ householdId: household._id });
  await Expense.create({
    householdId: household._id,
    date: new Date(),
    merchant: 'Grocery Mart',
    category: 'Groceries',
    subtotal: 45,
    taxTotal: 3,
    total: 48,
    createdByUserId: user._id,
    items: [
      { name: 'Milk', quantity: 1, unitPrice: 4.5, lineTotal: 4.5 },
      { name: 'Produce', quantity: 1, unitPrice: 40.5, lineTotal: 40.5 }
    ]
  });
  console.log('Seeded demo data.');
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
