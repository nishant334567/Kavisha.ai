"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function Admin() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState("all"); // 'all', 'job_seeker', 'recruiter'

  useEffect(() => {
    if (status === "loading") return; // Wait for session to load

    if (!session?.user?.isAdmin) {
      router.push("/");
    }
  }, [session, status, router]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/admin/users");
        const data = await res.json();

        if (data.success) {
          setUsers(data.users);
          console.log("Users fetched:", data.users); // Debug log
        } else {
          console.error("API Error:", data.message);
        }
      } catch (error) {
        console.error("Fetch error:", error);
      }
    };

    if (session?.user?.isAdmin) {
      fetchUsers();
    }
  }, [session]);

  // Filter users based on selected filter
  const filteredUsers = users.filter((user) => {
    if (filter === "all") return true;
    return user.profileType === filter;
  });

  // Calculate stats based on filtered users
  const totalFiltered = filteredUsers.length;
  const jobSeekersCount = filteredUsers.filter(
    (user) => user.profileType === "job_seeker"
  ).length;
  const recruitersCount = filteredUsers.filter(
    (user) => user.profileType === "recruiter"
  ).length;
  // Show loading while checking session
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if not admin
  if (!session?.user?.isAdmin) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-slate-800 mb-6">
            🛡️ Admin Dashboard
          </h1>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800">
                Total Users
              </h3>
              <p className="text-3xl font-bold text-blue-600">
                {totalFiltered}
              </p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-green-800">
                Job Seekers
              </h3>
              <p className="text-3xl font-bold text-green-600">
                {jobSeekersCount}
              </p>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-800">
                Recruiters
              </h3>
              <p className="text-3xl font-bold text-purple-600">
                {recruitersCount}
              </p>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h2 className="text-xl font-semibold text-slate-800">
                  All Users
                </h2>

                {/* Filter Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilter("all")}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      filter === "all"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    All ({users.length})
                  </button>
                  <button
                    onClick={() => setFilter("job_seeker")}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      filter === "job_seeker"
                        ? "bg-green-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Job Seekers (
                    {users.filter((u) => u.profileType === "job_seeker").length}
                    )
                  </button>
                  <button
                    onClick={() => setFilter("recruiter")}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      filter === "recruiter"
                        ? "bg-purple-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Recruiters (
                    {users.filter((u) => u.profileType === "recruiter").length})
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Type
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {filteredUsers.map((user, index) => (
                    <tr key={index} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {user.name || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.profileType === "job_seeker"
                              ? "bg-green-100 text-green-800"
                              : user.profileType === "recruiter"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {user.profileType || "Not Set"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 && (
              <div className="px-6 py-8 text-center text-slate-500">
                No users found
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
