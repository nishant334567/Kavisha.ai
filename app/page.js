import Header from "./components/Header";
import Home from "./components/Home";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // adjust path as needed
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const cookieStore = await cookies();

  const cookieString = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/allchats`, {
    headers: {
      Cookie: cookieString,
    },
  });
  const allChats = await res.json();

  if (!session) {
    redirect("/login");
    return null;
  }

  if (!session.user?.profileType) {
    redirect("/set-role");
    return null;
  }

  const fetchNotis = await fetch(
    `${baseUrl}/api/notifications/${session.user.id}`
  );
  const initialNotifications = await fetchNotis.json();

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="shadow-xl flex flex-col gap-4 w-full xl:w-[80%] mx-auto h-screen  bg-gray-100 p-8 md:rounded-2xl">
        <Header />
        <Home
          initialChats={allChats}
          notifications={initialNotifications.messages}
        />
      </div>
    </div>
  );
}
