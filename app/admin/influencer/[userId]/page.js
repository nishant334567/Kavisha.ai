"use client";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import AddEvent from "@/app/components/admin/AddEvent";
import { useBrandContext } from "@/app/context/brand/BrandContextProvider";

export default function InfluencerPage() {
  const { userId } = useParams();
  const [showAddCampaign, setShowAddCampaign] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [relevantSessions, setRelevantSessions] = useState([]);
  const [events, setEvents] = useState([]);
  const brandContext = useBrandContext();
  useEffect(() => {
    const fetchOverview = async () => {
      const response = await fetch(
        `/api/admin/influencer/${brandContext?.subdomain}`
      );
      const data = await response.json();

      setRelevantSessions(data.relevantSessions);
    };

    const fetchEvents = async () => {
      const response = await fetch(`/api/events/${brandContext?.subdomain}`);
      const data = await response.json();
      if (data.events) {
        setEvents(data.events);
      }
    };

    fetchOverview();
    fetchEvents();
  }, [brandContext?.subdomain]);
  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-lg">
                {userId?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Influencer Dashboard
                </h1>
                <p className="text-sm sm:text-base text-gray-600">
                  User ID: {userId}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAddCampaign(!showAddCampaign)}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl text-sm sm:text-base"
            >
              {showAddCampaign ? "Cancel" : "+ Add New Campaign"}
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          {/* Add Event Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
              Create Campaign
            </h2>
            {showAddCampaign ? (
              <AddEvent />
            ) : (
              <div className="text-center py-8 sm:py-12">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                </div>
                <p className="text-sm sm:text-base text-gray-500 mb-4">
                  Click the button above to create a new campaign
                </p>
                <button
                  onClick={() => setShowAddCampaign(true)}
                  className="text-blue-500 hover:text-blue-600 font-medium text-sm sm:text-base"
                >
                  Start Creating
                </button>
              </div>
            )}
          </div>

          {/* Events Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-2 sm:space-y-0">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                All Events
              </h2>
              <button
                onClick={() => setShowAllEvents(!showAllEvents)}
                className="text-blue-500 hover:text-blue-600 font-medium flex items-center justify-center space-x-2 text-sm sm:text-base"
              >
                <span>{showAllEvents ? "Hide Events" : "Show All Events"}</span>
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${showAllEvents ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </div>

            {showAllEvents ? (
              <div className="space-y-3 sm:space-y-4 max-h-80 sm:max-h-96 overflow-y-auto">
                {events.length === 0 ? (
                  <div className="text-center py-6 sm:py-8">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg
                        className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                    </div>
                    <p className="text-sm sm:text-base text-gray-500">
                      No events found
                    </p>
                  </div>
                ) : (
                  events.map((event) => (
                    <div
                      key={event._id}
                      className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow duration-200"
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-2 sm:space-y-0">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 mb-2">
                            <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                              {event.title}
                            </h3>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium w-fit ${
                                event.contentType === "event"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-green-100 text-green-700"
                              }`}
                            >
                              {event.contentType}
                            </span>
                          </div>
                          <p className="text-gray-600 text-xs sm:text-sm mb-2 line-clamp-2">
                            {event.description}
                          </p>
                          {event.link && (
                            <a
                              href={event.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-blue-500 hover:text-blue-600 text-xs sm:text-sm font-medium"
                            >
                              <svg
                                className="w-3 h-3 sm:w-4 sm:h-4 mr-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                />
                              </svg>
                              View Link
                            </a>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 sm:ml-4 sm:flex-shrink-0">
                          {new Date(event.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <p className="text-sm sm:text-base text-gray-500 mb-2">
                  Click to view all events
                </p>
                <p className="text-xs sm:text-sm text-gray-400">
                  {events.length} events available
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sessions Section */}
        {relevantSessions.length > 0 && (
          <div className="mt-4 sm:mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
              Recent Sessions
            </h2>
            <div className="space-y-3">
              {relevantSessions.map((session) => (
                <div
                  key={session._id}
                  className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow duration-200"
                >
                  <h3 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">
                    {session.title}
                  </h3>
                  <p className="text-gray-600 text-xs sm:text-sm line-clamp-2">
                    {session.chatSummary}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
