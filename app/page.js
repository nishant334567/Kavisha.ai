import Home from "./components/Home";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
    return null;
  }

  if (!session.user?.profileType) {
    redirect("/set-role");
    return null;
  }

  // Don't fetch data here - let the client handle it
  // This makes the page load faster and simpler
  return (
    <div className="flex items-center justify-center max-h-screen bg-orange-100">
      <div className="flex flex-col gap-4 w-full mx-auto h-screen md:rounded-2xl">
        <Home
          initialChats={{ sessionIds: [], sessions: {} }}
          notifications={[]}
        />
      </div>
    </div>
  );
}
