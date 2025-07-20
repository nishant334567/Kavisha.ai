"use client";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { data: session } = useSession();
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white rounded-lg shadow p-6 w-full max-w-xs flex flex-col items-center">
        <h1 className="text-xl font-semibold mb-6 text-slate-800">
          Sign in to Kavisha.ai
        </h1>
        {!session ? (
          <>
            <button
              onClick={() => signIn("github")}
              className="w-full mb-3 py-2 px-4 bg-slate-800 text-white rounded hover:bg-slate-700 transition-colors"
            >
              Login with GitHub
            </button>
            <button
              onClick={() => signIn("google")}
              className="w-full py-2 px-4 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              Login with Google
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 w-full">
            {session.user?.image && (
              <img
                src={session.user.image}
                alt="User Avatar"
                className="w-14 h-14 rounded-full border border-slate-200"
              />
            )}
            <p className="text-base text-slate-700">
              Welcome, {session.user.name}
            </p>
            <button
              onClick={() => {
                router.push("/");
              }}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Go To Homepage
            </button>
            <button
              onClick={() => signOut()}
              className="w-full py-2 px-4 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
