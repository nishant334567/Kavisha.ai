"use client";
import { useState, useEffect } from "react";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";

async function api(url, opts) {
  const r = await fetch(url, opts);
  return r.json();
}

export default function AddAdminPage() {
  const brand = useBrandContext();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [msg, setMsg] = useState("");
  const sub = brand?.subdomain;

  useEffect(() => {
    if (!sub) return;
    let cancelled = false;
    setLoadingList(true);
    (async () => {
      try {
        const d = await api(`/api/admin/add-admin?brand=${sub}`);
        if (!cancelled) setAdmins(d.admins || []);
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sub]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!sub || !email?.trim()) return;
    setLoading(true);
    setMsg("");
    try {
      const d = await api("/api/admin/add-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), brand: sub }),
      });
      if (d.error) return setMsg(d.error);
      setAdmins(d.admins || []);
      setName("");
      setEmail("");
      setMsg("Admin added. Notification email sent.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (adminEmail) => {
    if (!sub || !adminEmail) return;
    setDeleting(adminEmail);
    setMsg("");
    try {
      const params = new URLSearchParams({ brand: sub, email: adminEmail });
      const d = await api(`/api/admin/add-admin?${params}`, { method: "DELETE" });
      if (d.error) return setMsg(d.error);
      setAdmins(d.admins || []);
      setMsg("Admin removed.");
    } finally {
      setDeleting(null);
    }
  };

  if (!brand) return null;

  return (
    <div className="min-h-screen bg-gray-50 pt-16 px-4 pb-8">
      <div className="max-w-lg mx-auto">
        <button
          onClick={() => router.push(`/admin/${sub}/v2`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Add Admin</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Admin name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-800 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-800 focus:border-transparent"
              />
            </div>
          </div>
          {msg && <p className={`mt-3 text-sm ${msg.startsWith("Admin added") || msg.startsWith("Admin removed") ? "text-green-600" : "text-red-600"}`}>{msg}</p>}
          <button
            type="submit"
            disabled={loading || !email?.trim()}
            className="mt-4 w-full py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Adding…" : "Add Admin"}
          </button>
        </form>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Admins</h2>
          {loadingList ? (
            <p className="text-gray-500 text-sm">Loading…</p>
          ) : admins.length === 0 ? (
            <p className="text-gray-500 text-sm">No admins yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {admins.map((adminEmail) => (
                <li key={adminEmail} className="flex items-center justify-between gap-2 group">
                  <span className="text-gray-700 font-mono text-sm truncate">{adminEmail}</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(adminEmail)}
                    disabled={deleting === adminEmail}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Remove admin"
                  >
                    {deleting === adminEmail ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
