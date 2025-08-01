import SessionSection from "./components/SessionSection";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
export default async function Admin() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/login");
    return null;
  }
  const cookieStore = await cookies();

  const cookieString = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  const apiUrl = baseUrl ? `${baseUrl}/api/admin/stats` : "/api/admin/stats";

  const response = await fetch(apiUrl, {
    cache: "no-store",
    headers: {
      Cookie: cookieString,
    },
  });
  const stats = await response.json();


  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Admin Dashboard
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* User Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Users</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Users:</span>
                <span className="font-semibold">{stats.stats.totalUser}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Job Seekers:</span>
                <span className="font-semibold">
                  {stats.stats.totalUserWithJobSeekers}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Recruiters:</span>
                <span className="font-semibold">
                  {stats.stats.totalUserWithRecruiter}
                </span>
              </div>
            </div>
          </div>

          {/* Job Seeker Sessions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Job Seeker Sessions
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total:</span>
                <span className="font-semibold">
                  {stats.stats.totalJobSeekerSession}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Not Initiated:</span>
                <span className="font-semibold text-orange-600">
                  {stats.stats.totalJobSeekerNotInitiated}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">In Progress:</span>
                <span className="font-semibold text-blue-600">
                  {stats.stats.totalJobSeekerSessionInitiated}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Completed:</span>
                <span className="font-semibold text-green-600">
                  {stats.stats.totalJobSeekerCompletedSession}
                </span>
              </div>
            </div>
          </div>

          {/* Recruiter Sessions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Recruiter Sessions
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total:</span>
                <span className="font-semibold">
                  {stats.stats.totalRecruiterSession}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Not Initiated:</span>
                <span className="font-semibold text-orange-600">
                  {stats.stats.totalRecruiterNotInitiated}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">In Progress:</span>
                <span className="font-semibold text-blue-600">
                  {stats.stats.totalRecruiterWithSessionInitiated}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Completed:</span>
                <span className="font-semibold text-green-600">
                  {stats.stats.totalRecruiterWithCompletedSession}
                </span>
              </div>
            </div>
          </div>

          {/* Connections & Matches */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Engagement
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Sessions:</span>
                <span className="font-semibold">
                  {stats.stats.totalChatSessions}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Matches:</span>
                <span className="font-semibold text-purple-600">
                  {stats.stats.totalMatches}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Connections:</span>
                <span className="font-semibold text-indigo-600">
                  {stats.stats.totalConnections}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {stats.stats.totalUser}
              </div>
              <div className="text-sm text-gray-600">Total Users</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {stats.stats.totalChatSessions}
              </div>
              <div className="text-sm text-gray-600">Total Sessions</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {stats.stats.totalMatches}
              </div>
              <div className="text-sm text-gray-600">Total Matches</div>
            </div>
            <div className="p-4 bg-indigo-50 rounded-lg">
              <div className="text-2xl font-bold text-indigo-600">
                {stats.stats.totalConnections}
              </div>
              <div className="text-sm text-gray-600">Total Connections</div>
            </div>
          </div>
        </div>

        {/* Interactive Sessions Section */}
        <SessionSection totalSessions={stats.stats.totalChatSessions} />
      </div>
    </div>
  );
}
