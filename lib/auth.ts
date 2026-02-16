import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { connectDb } from './db';
import { User } from './models/User';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    })
  ],
  pages: { signIn: '/auth/signin' },
  callbacks: {
    async signIn({ user }) {
      await connectDb();
      if (!user.email || !user.name) return false;
      await User.findOneAndUpdate(
        { email: user.email },
        { name: user.name, email: user.email, avatar: user.image || '' },
        { upsert: true }
      );
      return true;
    },
    async session({ session }) {
      if (session.user?.email) {
        await connectDb();
        const dbUser = await User.findOne({ email: session.user.email }).lean();
        if (dbUser) {
          session.user.id = dbUser._id.toString();
        }
      }
      return session;
    }
  },
  session: { strategy: 'jwt' },
  secret: process.env.AUTH_SECRET
});
