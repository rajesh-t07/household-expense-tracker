import { NextResponse, type NextRequest } from 'next/server';

/**
 * Edge middleware: only intercepts `/`.
 *
 * If a user is unauthenticated but still carries a `lastHouseholdId` cookie
 * (typical when they logged out — NextAuth cleared its session cookie but
 * our httpOnly cookie persisted), bounce them to /auth/signin so a stale
 * cookie can't be carried across sessions.
 */
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname !== '/') {
    return NextResponse.next();
  }

  const hasSession =
    !!request.cookies.get('authjs.session-token')?.value ||
    !!request.cookies.get('__Secure-authjs.session-token')?.value;
  const hasLastHousehold = !!request.cookies.get('lastHouseholdId')?.value;

  if (!hasSession && hasLastHousehold) {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/']
};
