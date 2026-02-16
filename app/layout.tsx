import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Household Expense Tracker',
  description: 'Chat-style collaborative expense tracker for households.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
