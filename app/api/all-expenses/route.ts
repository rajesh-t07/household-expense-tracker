import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { connectDb } from '@/lib/db';
import { AuthError } from '@/lib/errors';
import { requireSession } from '@/lib/permissions';
import { Expense } from '@/lib/models/Expense';
import { Household } from '@/lib/models/Household';

const LIMIT_DEFAULT = 50;
const LIMIT_MAX = 200;

type HouseholdSummary = {
  _id: Types.ObjectId;
  name: string;
  currency: string;
};

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    await connectDb();

    const { searchParams } = new URL(request.url);
    const sinceParam = searchParams.get('since');
    const limitParam = searchParams.get('limit');
    const limit = Math.min(
      LIMIT_MAX,
      Math.max(1, Number(limitParam) || LIMIT_DEFAULT)
    );

    // The { _id, name, currency } projection + lean() returns a partial doc.
    // Cast to a concrete shape so downstream .map((h) => String(h._id)) is type-safe.
    const households = (await Household.find(
      { members: session.user.id },
      { _id: 1, name: 1, currency: 1 }
    ).lean()) as unknown as HouseholdSummary[];

    const householdIds = households.map((h) => h._id);
    if (householdIds.length === 0) {
      return NextResponse.json({
        expenses: [],
        households: [],
        count: 0,
        hasMore: false
      });
    }

    const query: { householdId: { $in: Types.ObjectId[] }; date?: { $gte: Date } } = {
      householdId: { $in: householdIds }
    };
    if (sinceParam) {
      const sinceDate = new Date(sinceParam);
      if (Number.isNaN(sinceDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid `since` query parameter' },
          { status: 400 }
        );
      }
      query.date = { $gte: sinceDate };
    }

    const expenses = await Expense.find(query)
      .sort({ date: -1, _id: -1 })
      .limit(limit)
      .lean();

    const householdMap = new Map<string, HouseholdSummary>(
      households.map((h) => [h._id.toString(), h])
    );
    const enriched = expenses.map((e) => {
      const hh = householdMap.get(String(e.householdId));
      return {
        ...e,
        householdName: hh?.name ?? null,
        householdCurrency: hh?.currency ?? null
      };
    });

    return NextResponse.json({
      expenses: enriched,
      households,
      count: enriched.length,
      hasMore: enriched.length === limit
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
