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
    <div className="min-h-screen bg-background px-4 pb-8 pt-16 text-foreground">
      <div className="mx-auto max-w-lg">
        <button
          onClick={() => router.push(`/admin/${sub}/v2`)}
          className="mb-6 flex items-center gap-2 text-muted hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="mb-6 text-2xl font-bold text-foreground">Add Admin</h1>

        <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Admin name"
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-foreground placeholder:text-muted focus:border-ring focus:ring-2 focus:ring-ring/30 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-foreground placeholder:text-muted focus:border-ring focus:ring-2 focus:ring-ring/30 focus:outline-none"
              />
            </div>
          </div>
          {msg && <p className={`mt-3 text-sm ${msg.startsWith("Admin added") || msg.startsWith("Admin removed") ? "text-green-600" : "text-red-600"}`}>{msg}</p>}
          <button
            type="submit"
            disabled={loading || !email?.trim()}
            className="mt-4 w-full rounded-lg bg-highlight py-2.5 font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Adding…" : "Add Admin"}
          </button>
        </form>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-foreground">Admins</h2>
          {loadingList ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : admins.length === 0 ? (
            <p className="text-sm text-muted">No admins yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {admins.map((adminEmail) => (
                <li key={adminEmail} className="flex items-center justify-between gap-2 group">
                  <span className="truncate font-mono text-sm text-foreground">{adminEmail}</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(adminEmail)}
                    disabled={deleting === adminEmail}
                    className="rounded-lg p-1.5 text-muted transition-colors hover:bg-muted-bg hover:text-red-600 disabled:opacity-50"
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
