import { NextResponse } from "next/server";
import { authMiddleware } from "next-firebase-auth-edge";
import { serverConfig } from "@/app/lib/firebase/config";
import { getCookieOptions } from "@/app/lib/firebase/cookie-config";
import { createOrGetUser } from "@/app/lib/firebase/create-user";

export async function GET(request) {
  return authMiddleware(request, {
    apiKey: serverConfig.apiKey,
    cookieName: serverConfig.cookieName,
    cookieSignatureKeys: serverConfig.cookieSignatureKeys,
    cookieSerializeOptions: getCookieOptions(),
    serviceAccount: serverConfig.serviceAccount,
    loginPath: "/api/login",
    handleValidToken: async ({ decodedToken }) => {
      try {
        await createOrGetUser(decodedToken);
        return NextResponse.json({ status: "success" });
      } catch (error) {
        console.error("Error saving user:", error);
        return NextResponse.json({ status: "error" }, { status: 500 });
      }
    },
    handleInvalidToken: async (reason) => {
      return NextResponse.json({ status: "error", reason }, { status: 401 });
    },
    handleError: async (error) => {
      console.error("Login error:", error);
      return NextResponse.json({ status: "error" }, { status: 500 });
    },
  });
}
