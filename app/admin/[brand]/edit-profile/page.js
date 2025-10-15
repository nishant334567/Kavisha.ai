"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";

export default function EditProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const brandContext = useBrandContext();
  const [brandName, setBrandName] = useState(brandContext.brandName);
  const [subdomain, setSubdomain] = useState(brandContext.subdomain);
  const [loginButtonText, setLoginButtonText] = useState(
    brandContext.loginButtonText
  );
  const [title, setTitle] = useState(brandContext.title);
  const [subtitle, setSubtitle] = useState(brandContext.subtitle);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState(brandContext.services || []);

  useEffect(() => {
    // Check if user is not logged in
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    // Check if session is still loading
    if (status === "loading") {
      return;
    }

    // Check if user is logged in but not an admin
    if (session && brandContext && brandContext.admins) {
      if (!brandContext.admins.includes(session.user?.email)) {
        alert(
          "You don't have admin privileges to access this. Ask admins for access"
        );
        router.push("/login");
        return;
      }
    }
  }, [session, status, brandContext, router]);

  // Show loading while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated or not admin
  if (
    status === "unauthenticated" ||
    !session ||
    !brandContext?.admins ||
    !brandContext.admins.includes(session.user?.email)
  ) {
    return null;
  }

  const handleRemoveAdmin = async (adminEmail) => {
    if (!confirm(`Are you sure you want to remove ${adminEmail}?`)) return;

    setLoading(true);
    try {
      const response = await fetch("/api/admin/edit-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName,
          loginButtonText,
          title,
          subtitle,
          removeAdmin: adminEmail,
          subdomain,
          services,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        alert("Admin removed successfully!");
        // Refresh the page or update context
        window.location.reload();
      } else {
        alert(data.error || "Failed to remove admin");
      }
    } catch (error) {
      alert("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/admin/edit-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName,
          loginButtonText,
          title,
          subtitle,
          email,
          subdomain,
          services,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        alert("Profile updated successfully!");
        window.location.reload();
      } else {
        alert(data.error || "Failed to update profile");
      }
    } catch (error) {
      alert("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const updateService = (name, field, value) => {
    setServices(
      services.map((service) =>
        service.name === name ? { ...service, [field]: value } : service
      )
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-semibold text-gray-900 mb-6">
          Edit Profile
        </h1>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <p>Brand Logo</p>
                <img
                  src={brandContext.logoUrl}
                  alt="Brand Logo"
                  className="w-24 h-24"
                />{" "}
              </div>
              <div className="flex flex-col gap-2">
                <p>Brand Hero Image</p>
                <img
                  src={brandContext.brandImageUrl}
                  alt="Brand Hero Image"
                  className="w-24 h-24"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Brand Name
                </label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Login Button Text
                </label>
                <input
                  type="text"
                  value={loginButtonText}
                  onChange={(e) => setLoginButtonText(e.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  required
                />
              </div>

              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">
                  Title
                </label>
                <textarea
                  rows={3}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">
                  Subtitle
                </label>
                <textarea
                  rows={4}
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none"
                  required
                />
              </div>
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">
                  Current Admins
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {brandContext.admins?.map((admin) => (
                    <div
                      key={admin}
                      className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center justify-between group hover:bg-gray-100 transition"
                    >
                      <span className="text-sm text-gray-700 truncate flex-1 mr-2">
                        {admin}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAdmin(admin)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded"
                        title="Remove admin"
                      >
                        <img
                          src="/delete_2.png"
                          alt="Remove"
                          className="w-4 h-4"
                        />
                      </button>
                    </div>
                  ))}
                </div>
                {(!brandContext.admins || brandContext.admins.length === 0) && (
                  <p className="text-sm text-gray-500 italic">
                    No admins added yet
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">
                  Add Admin Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
                <p className="text-xs text-gray-500">
                  Optional: Add an admin by email
                </p>
              </div>
            </div>
            <div>
              <div>Edit Services:</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 ">
                {services
                  .filter(
                    (service) =>
                      // Show all services for Kavisha, hide recruiter for other brands
                      brandContext.subdomain === "kavisha" ||
                      service.name?.toLowerCase() !== "recruiter"
                  )
                  .map((service) => (
                    <div
                      key={service.name}
                      className="flex flex-col gap-4 border border-gray-300 rounded-lg p-4  overflow-y-auto"
                    >
                      <div className="grid grid-cols-1 gap-4 flex-shrink-0">
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-gray-700">
                            Service Name
                          </label>
                          <input
                            type="text"
                            disabled
                            value={service.name}
                            className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-gray-700">
                            Service Initial Message
                          </label>
                          <input
                            type="text"
                            value={service.initialMessage}
                            onChange={(e) =>
                              updateService(
                                service.name,
                                "initialMessage",
                                e.target.value
                              )
                            }
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-gray-700">
                            Service Title
                          </label>
                          <input
                            type="text"
                            value={service.title}
                            onChange={(e) =>
                              updateService(
                                service.name,
                                "title",
                                e.target.value
                              )
                            }
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                          />
                        </div>
                      </div>
                      <div className="flex-1 min-h-0">
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-gray-700">
                            Service Prompt
                          </label>
                          <textarea
                            value={service.prompt}
                            onChange={(e) =>
                              updateService(
                                service.name,
                                "prompt",
                                e.target.value
                              )
                            }
                            className="w-full h-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none overflow-y-auto"
                            style={{ minHeight: "200px" }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                {services.filter(
                  (service) =>
                    brandContext.subdomain === "kavisha" ||
                    service.name?.toLowerCase() !== "recruiter"
                ).length === 0 && (
                  <p className="text-sm text-gray-500 italic col-span-2">
                    No editable services available
                  </p>
                )}
              </div>
            </div>
            <div className="pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
