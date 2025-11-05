import NextAuth from "next-auth";
// import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { connectDB } from "@/app/lib/db";
import User from "@/app/models/Users";

const getCookieDomain = () => {
  if (process.env?.NODE_ENV === "production") {
    return ".kavisha.ai";
  }

  return undefined;
};

const rootDomain = getCookieDomain();

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
  // ===============================================
  // 👇 THIS IS THE NEW, CRITICAL SECTION YOU MUST ADD
  // ===============================================
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
        domain: rootDomain, // Set to ".kavisha.ai" in production
      },
    },
    callbackUrl: {
      name: `__Secure-next-auth.callback-url`,
      options: {
        sameSite: "lax",
        path: "/",
        secure: true,
        domain: rootDomain, // Set to ".kavisha.ai" in production
      },
    },
    // ===============================================
    // 👇 ADD THIS SECTION
    // ===============================================
    state: {
      name: `__Secure-next-auth.state`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
        domain: rootDomain, // <-- The all-important fix
      },
    },
    // ===============================================
    // 👇 AND ADD THIS SECTION
    // ===============================================
    pkceCodeVerifier: {
      name: `__Secure-next-auth.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
        domain: rootDomain, // <-- The all-important fix
      },
    },
  },
  // ===============================================
  // END OF NEW SECTION
  // ===============================================
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
