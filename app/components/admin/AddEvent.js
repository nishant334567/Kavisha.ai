"use client";
import { useState } from "react";

export default function AddEvent() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    link: "",
    contentType: "event",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Created successfully!");
        setFormData({
          title: "",
          description: "",
          link: "",
          contentType: "event",
        });
      } else {
        setMessage(data.error || "Failed to create");
      }
    } catch (error) {
      setMessage("Error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Add Event/Book</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-2">Content Type</label>
          <select
            value={formData.contentType}
            onChange={(e) =>
              setFormData({ ...formData, contentType: e.target.value })
            }
            className="w-full p-2 border rounded"
            required
          >
            <option value="event">Event</option>
            <option value="book">Book</option>
          </select>
        </div>

        <div>
          <label className="block mb-2">Title</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div>
          <label className="block mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            className="w-full p-2 border rounded"
            rows={4}
            required
          />
        </div>

        <div>
          <label className="block mb-2">Link (optional)</label>
          <input
            type="url"
            value={formData.link}
            onChange={(e) => setFormData({ ...formData, link: e.target.value })}
            className="w-full p-2 border rounded"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white p-2 rounded disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create"}
        </button>
      </form>

      {message && (
        <div
          className={`mt-4 p-2 rounded ${message.includes("success") ? "bg-green-100" : "bg-red-100"}`}
        >
          {message}
        </div>
      )}
    </div>
  );
}
