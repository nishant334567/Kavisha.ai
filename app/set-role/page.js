"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SetRole() {
  const { data: session } = useSession();
  const [role, setRole] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!session?.user) {
      router.push("/login");
    }
  }, [session]);
  const handleChange = (e) => {
    setRole(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    const response = await fetch("/api/set-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const data = await response.json();
    if (data?.success) {
      window.location.href = "/";
    } else {
      setIsUpdating(false);
      alert("Failed to set the role");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-lg shadow-md w-full max-w-md"
      >
        <h2 className="text-2xl font-semibold mb-6 text-center text-slate-800">
          I am
        </h2>
        <div className="flex flex-col gap-4 mb-6">
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="role"
              value="job_seeker"
              checked={role === "job_seeker"}
              onChange={handleChange}
              className="form-radio h-5 w-5 text-blue-600"
            />
            <span className="ml-3 text-lg text-slate-700">Job Seeker</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="role"
              value="recruiter"
              checked={role === "recruiter"}
              onChange={handleChange}
              className="form-radio h-5 w-5 text-blue-600"
            />
            <span className="ml-3 text-lg text-slate-700">Recruiter</span>
          </label>
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          disabled={!role || isUpdating}
        >
          Continue
        </button>
      </form>
    </div>
  );
}
