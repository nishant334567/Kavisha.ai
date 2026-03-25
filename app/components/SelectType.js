"use client";

import ServiceCard from "./chat/ServiceCard";

/**
 * Shows only talk-to-me / lead journey services from Sanity (no Community, Quiz, Jobs, Products).
 * Expects servicesWithStats from GET /api/chat-services-stats (each item has chatCount, userCount, messageCount).
 */
export default function SelectChatType({
  servicesWithStats = [],
  userDisplayName = "there",
  selectChatType,
  isCreating,
  creatingForServiceKey = null,
  loading = false,
}) {
  const displayName =
    (userDisplayName || "there").trim();
  const services = Array.isArray(servicesWithStats) ? servicesWithStats : [];

  const handleStart = (service, serviceKey) => {
    if (!selectChatType || isCreating) return;
    selectChatType(
      service.name,
      service.initialMessage,
      false,
      service.title,
      serviceKey
    );
  };

  if (services.length === 0 && !loading) {
    return (
      <div className="font-baloo tracking-[0.08em] flex flex-col items-center justify-center px-4 py-12 min-h-full">
        <p className="text-muted text-center">No chat services available.</p>
      </div>
    );
  }

  return (
    <div className="font-baloo tracking-[0.08em] flex flex-1 flex-col items-start justify-center px-4 py-8 w-full max-w-2xl mx-auto min-h-0">
      <div className="text-center md:text-left mb-8 w-full">
        <h1 className="text-2xl md:text-3xl font-regular text-foreground">
          Hi{" "}
          <span className="text-[#00888E]">
            {displayName.charAt(0).toUpperCase() + displayName.slice(1)}!
          </span>
        </h1>
        <p className="mt-2 text-muted">What&apos;s on your mind?</p>
      </div>

      {loading ? (
        <p className="text-muted">Loading services…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
          {services.map((item, index) => {
            const serviceKey = item._key ?? item.name ?? index;
            const isLoading = isCreating && creatingForServiceKey === serviceKey;
            return (
              <ServiceCard
                key={serviceKey}
                service={item}
                isLoading={isLoading}
                onStart={handleStart}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
