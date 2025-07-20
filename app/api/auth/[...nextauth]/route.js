import NextAuth from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { connectDB } from "@/app/lib/db";
import User from "@/app/models/Users";
import Session from "@/app/models/ChatSessions";
import { createSessionWithDefaultLog } from "@/app/lib/createSessionWithDefaultLog";

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  callbacks: {
    async redirect({ url, baseUrl }) {
      return baseUrl;
    },
    async jwt({ token, user }) {
      if (user) {
        await connectDB();
        let dbuser = await User.findOne({ email: user.email });
        if (!dbuser) {
          dbuser = await User.create({
            name: user.name,
            email: user.email,
            image: user.image,
            profileType: null,
          });
        }
        token.id = dbuser._id.toString();
        token.profileType = dbuser.profileType;
      }
      return token;
    },
    async session({ session, token }) {
      try {
        await connectDB();

        let dbuser = await User.findOne({ email: session.user.email });
        if (dbuser) {
          token.id = dbuser._id.toString();
        }
        session.user.id = token.id;
        session.user.profileType = dbuser?.profileType || null;
        session.user.name = token.name;
        session.user.image = token.image;

        if (dbuser) {
          const existing = await Session.findOne({ userId: token.id });
          if (!existing && dbuser.profileType) {
            await createSessionWithDefaultLog(token.id, dbuser.profileType);
          }
        }
      } catch (err) {
        console.error("Session callback error:", err);
        session.user.id = token.id;
        session.user.profileType = token.profileType;
        session.user.name = token.name;
        session.user.image = token.image;
      }

      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
