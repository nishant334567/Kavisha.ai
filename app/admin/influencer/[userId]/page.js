import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import AddEvent from "@/app/admin/components/AddEvent";

export default function InfluencerPage() {
  const { userId } = useParams();
  const [showAddCampaign, setShowAddCampaign] = useState(false);
  const [relevantSessions, setRelevantSessions] = useState([]);
  useEffect(() => {
    const fetchOverview = async () => {
      const response = await fetch(`/api/admin/influencer/${userId}`);
      const data = await response.json();
      console.log(data);
      setRelevantSessions(data.relevantSessions);
    };
    fetchOverview();
  }, [userId]);
  return (
    <>
      <p>Hi {userId}</p>
      <button onClick={() => setShowAddCampaign(!showAddCampaign)}>
        Add a new campaign
      </button>
      {showAddCampaign && <AddEvent />}
      {relevantSessions.map((session) => (
        <div key={session._id}>
          <p>{session.title}</p>
          <p>{session.chatSummary}</p>
        </div>
      ))}
    </>
  );
}
