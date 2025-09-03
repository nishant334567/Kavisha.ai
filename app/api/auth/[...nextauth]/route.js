import NextAuth from "next-auth";
// import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { connectDB } from "@/app/lib/db";
import User from "@/app/models/Users";

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      return new URL(url, baseUrl).toString();
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
            isAdmin: false,
          });
        }
        token.id = dbuser._id.toString();
        token.profileType = dbuser.profileType;
        token.isAdmin = dbuser.isAdmin || false;
      }
      return token;
    },
    async session({ session, token }) {
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
