import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { connectDB } from "@/app/lib/db";
import User from "@/app/models/Users";

// ... (getCookieDomain and rootDomain)
const getCookieDomain = () => {
  if (process.env?.NODE_ENV === "production") {
    return ".kavisha.ai";
  }
  return undefined;
};
const rootDomain = getCookieDomain();

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV !== "production",
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      checks: ["none"],
    }),
  ],

  cookies: {
    // ... (Your full cookie config from Step 2)
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
        domain: rootDomain,
      },
    },
    callbackUrl: {
      name: `__Secure-next-auth.callback-url`,
      options: {
        sameSite: "lax",
        path: "/",
        secure: true,
        domain: rootDomain,
      },
    },
    state: {
      name: `__Secure-next-auth.state`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
        domain: rootDomain,
      },
    },
    pkceCodeVerifier: {
      name: `__Secure-next-auth.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
        domain: rootDomain,
      },
    },
  },

  // ==== ADD YOUR CALLBACKS BACK IN ====
  callbacks: {
    async jwt({ token, user }) {
      console.log("Inside JWT");
      if (user) {
        try {
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
        } catch (error) {
          console.error("Error in JWT callback:", error);
          // By returning an error, we stop the login
          return { ...token, error: "DatabaseError" };
        }
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
