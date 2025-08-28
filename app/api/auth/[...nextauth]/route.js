import NextAuth from "next-auth";
// import GitHubProvider from "next-auth/providers/github";
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
    // GitHubProvider({
    //   clientId: process.env.GITHUB_CLIENT_ID,
    //   clientSecret: process.env.GITHUB_CLIENT_SECRET,
    // }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],

  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },

    async jwt({ token, user, req }) {
      if (user) {
        await connectDB();
        let dbuser = await User.findOne({ email: user.email });
        if (!dbuser) {
          dbuser = await User.create({
            name: user.name,
            email: user.email,
            image: user.image,
            profileType: null,
            isAdmin: false, // Explicitly set default value
          });
        }
        token.id = dbuser._id.toString();
        token.profileType = dbuser.profileType;
        token.isAdmin = dbuser.isAdmin || false;
      }
      return token;
    },
    async session({ session, token, req }) {
      session.user.id = token.id;
      session.user.profileType = token.profileType;
      session.user.isAdmin = token.isAdmin;
      session.user.name = token.name;
      session.user.image = token.image;
      session.user.email = token.email;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
