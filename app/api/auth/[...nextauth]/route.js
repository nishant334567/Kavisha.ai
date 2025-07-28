import NextAuth from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import LinkedInProvider from "next-auth/providers/linkedin";
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
    LinkedInProvider({
      clientId: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "openid email profile",
        },
      },
      idToken: true,
      token: {
        async request({ client, params, checks, provider }) {
          const tokenEndpoint = "https://www.linkedin.com/oauth/v2/accessToken";

          const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
          const redirectUri = `${baseUrl}/api/auth/callback/linkedin`;

          const body = new URLSearchParams({
            grant_type: "authorization_code",
            code: params.code,
            redirect_uri: redirectUri,
            client_id: provider.clientId,
            client_secret: provider.clientSecret,
          });

          const response = await fetch(tokenEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Accept: "application/json",
            },
            body: body.toString(),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(
              "LinkedIn token exchange error:",
              response.status,
              errorText
            );
            throw new Error(
              `Token exchange failed: ${response.status} - ${errorText}`
            );
          }

          const tokens = await response.json();

          // LinkedIn might return id_token only with OpenID Connect scope
          const userinfoRes = await fetch(
            "https://api.linkedin.com/v2/userinfo",
            {
              headers: {
                Authorization: `Bearer ${tokens.access_token}`,
                "Content-Type": "application/json",
              },
            }
          );
          const userinfo = await userinfoRes.json();
          ("Fetched user info", userinfo);
          return tokens;
        },
      },
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
            isAdmin: false, // Explicitly set default value
          });
        }
        token.id = dbuser._id.toString();
        token.profileType = dbuser.profileType;
        token.isAdmin = dbuser.isAdmin || false;
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
        session.user.isAdmin = dbuser?.isAdmin || false;

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
