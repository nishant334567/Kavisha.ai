"use client";

import { useState } from "react";

const PERSONALITY_TABS = [
  { id: "about", label: "About", field: "about" },
  { id: "behaviour", label: "Behaviour", field: "behaviour" },
  { id: "rules", label: "Rules", field: "rules" },
];

function ChatServiceDetail({ service }) {
  const [personalityTab, setPersonalityTab] = useState("about");
  const welcoming = service.initialMessage || service.initialmessage || "";
  const activeField =
    PERSONALITY_TABS.find((t) => t.id === personalityTab)?.field || "about";
  const personalityText = String(service[activeField] || "").trim() || "—";

  return (
    <div className="space-y-4">
      {service.title ? (
        <p className="text-sm font-medium text-highlight">{service.title}</p>
      ) : null}

      <div>
        <p className="text-sm font-semibold text-foreground">Welcoming message</p>
        <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
          {welcoming || "—"}
        </p>
      </div>

      <div>
        <p className="text-sm font-semibold text-foreground">Personality core</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {PERSONALITY_TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setPersonalityTab(id)}
              className={`rounded-lg border px-3 py-1 text-sm ${
                personalityTab === id
                  ? "border-border bg-muted-bg text-foreground"
                  : "border-border text-muted hover:bg-muted-bg"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-3 whitespace-pre-wrap text-sm text-muted">
          {personalityText}
        </p>
      </div>
    </div>
  );
}

export default function BrandChatServicesSection({ brandDetail }) {
  const services = Array.isArray(brandDetail?.services)
    ? brandDetail.services
    : [];

  if (services.length === 0) return null;

  return (
    <section className="mt-6 border-t border-border pt-6">
      <h2 className="text-sm font-semibold text-foreground">Chat services</h2>
      <div className="mt-4 space-y-6">
        {services.map((service, index) => (
          <div
            key={service._key || service.name || index}
            className={index > 0 ? "border-t border-border pt-6" : undefined}
          >
            <ChatServiceDetail service={service} />
          </div>
        ))}
      </div>
    </section>
  );
}
