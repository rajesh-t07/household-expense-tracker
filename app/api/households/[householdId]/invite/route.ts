import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDb } from '@/lib/db';
import { AuthError } from '@/lib/errors';
import { requireSession } from '@/lib/permissions';
import { requireAdmin } from '@/lib/permissions';
import { Household } from '@/lib/models/Household';
import { resend, FROM_EMAIL } from '@/lib/resend';

const inviteSchema = z.object({
  email: z.string().email('Invalid email address')
});

export async function POST(
  request: NextRequest,
  { params }: { params: { householdId: string } }
) {
  try {
    const session = await requireSession();
    await connectDb();

    // Only admins can invite
    await requireAdmin(params.householdId, session.user.id);

    const body = await request.json();
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid email', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { email } = parsed.data;
    const household = await Household.findById(params.householdId);
    if (!household) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const inviteUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/households?invite=${household.inviteToken}`;

    // Send invitation email via Resend
    if (resend) {
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: email,
          subject: `You've been invited to join "${household.name}"`,
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
              <h1 style="font-size: 20px; margin-bottom: 8px;">You're invited!</h1>
              <p style="color: #555;">
                <strong>${session.user.name || 'Someone'}</strong> has invited you to join the household
                <strong>"${household.name}"</strong> on Household Expense Tracker.
              </p>
              <a
                href="${inviteUrl}"
                style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #1e293b; color: #fff; border-radius: 6px; text-decoration: none; font-weight: 600;"
              >
                Join "${household.name}"
              </a>
              <p style="margin-top: 24px; font-size: 13px; color: #999;">
                Or paste this link into your browser: <br />
                <a href="${inviteUrl}" style="color: #1e293b;">${inviteUrl}</a>
              </p>
            </div>
          `
        });
      } catch {
        return NextResponse.json(
          { error: 'Failed to send invitation email. Check your Resend configuration.' },
          { status: 500 }
        );
      }
    } else {
      console.warn('Resend not configured — invite email not sent to', email);
    }

    return NextResponse.json({ success: true, invited: email });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
