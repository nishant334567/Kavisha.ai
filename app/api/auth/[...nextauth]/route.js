import NextAuth from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { connectDB } from "@/app/lib/db";
import User from "@/app/models/Users";
import Session from "@/app/models/ChatSessions";
import { createSessionWithDefaultLog } from "@/app/lib/createSessionWithDefaultLog";

export const authOptions = {
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
      console.log(token, user, "inside jwt");
      if (user) {
        await connectDB();
        let dbuser = await User.findOne({ email: user.email });
        console.log(token, user, "inside jwt user");
        if (!dbuser) {
          dbuser = await User.create({
            name: user.name,
            email: user.email,
            image: user.image,
            profileType: null,
          });
        }
        console.log(token, dbuser, "new created profile data");
        token.id = dbuser._id.toString();
        token.profileType = dbuser.profileType;
        console.log(token, user, "updated token");
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
        session.user.profileType = dbuser?.profileType || null; // Use fresh data from DB
        session.user.name = token.name;
        session.user.image = token.image;

        if (dbuser) {
          const existing = await Session.findOne({ userId: token.id });
          if (!existing && dbuser.profileType) {
            await createSessionWithDefaultLog(token.id, dbuser.profileType);
          }
        }
      } catch (err) {
        console.error("Session callback error:", error);
        // Fallback to token data if DB is down
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
