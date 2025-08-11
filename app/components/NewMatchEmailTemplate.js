import React from "react";

const NewMatchEmailTemplate = ({ receiverEmail }) => {
  // Extract name from email (fallback approach)
  const extractNameFromEmail = (email) => {
    if (!email) return "there";
    const localPart = email.split("@")[0];
    const name = localPart.split(/[._-]/)[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  const receiverName = extractNameFromEmail(receiverEmail);

  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        lineHeight: "1.6",
        color: "#333",
      }}
    >
      <h2 style={{ color: "#4CAF50" }}>You got Matches!</h2>

      <p>Dear {receiverName},</p>

      <p>
        Based on our conversation, we've found some relevant Matches for you!
        These people/opportunities seem very close to what you were looking for.
        Please check them out and let us know what you feel! Hope it leads to
        great things! 🙂
      </p>

      <p>
        We'll keep working to connect you with the most relevant
        people/opportunities in the meantime.
      </p>

      <div style={{ margin: "20px 0", textAlign: "center" }}>
        <a
          href="https://www.kavisha.ai"
          style={{
            backgroundColor: "#4CAF50",
            color: "white",
            padding: "12px 24px",
            textDecoration: "none",
            borderRadius: "5px",
            display: "inline-block",
          }}
        >
          Check Your Matches
        </a>
      </div>

      <p>
        Visit us at: <a href="https://www.kavisha.ai">www.kavisha.ai</a>
      </p>

      <p>
        Yours truly,
        <br />
        Team Kavisha
      </p>

      <hr
        style={{
          margin: "20px 0",
          border: "none",
          borderTop: "1px solid #ddd",
        }}
      />

      <p style={{ fontSize: "12px", color: "#666" }}>
        Kavisha.ai is the force to forge human connections in the age of AI,
        starting with the world of recruitment.
      </p>
    </div>
  );
};

export default NewMatchEmailTemplate;
