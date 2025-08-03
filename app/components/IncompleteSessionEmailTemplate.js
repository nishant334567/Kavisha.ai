// app/components/IncompleteSessionEmailTemplate.js
import * as React from "react";

export function IncompleteSessionEmailTemplate({ receiverEmail }) {
  // Extract name from email
  const userName = receiverEmail 
    ? receiverEmail.split("@")[0].charAt(0).toUpperCase() + receiverEmail.split("@")[0].slice(1)
    : "User";

  return (
    <div style={{
      fontFamily: "Arial, sans-serif",
      lineHeight: "1.6",
      color: "#333",
      maxWidth: "600px",
      margin: "0 auto",
      padding: "20px"
    }}>
      <p>Dear {userName},</p>
      
      <p>
        You started talking to us, but didn't finish the conversation. In this case, 
        we're not sure of what you're looking at career wise, or in general. 
        Please complete your conversation with us, so we could connect you with the 
        right people and opportunities. We'll hope it leads to great things! 🙂
      </p>

      <p>
        <a 
          href="https://www.kavisha.ai"
          style={{
            backgroundColor: "#007bff",
            color: "white",
            padding: "12px 24px",
            textDecoration: "none",
            borderRadius: "5px",
            display: "inline-block",
            fontWeight: "bold"
          }}
        >
          Complete Your Conversation
        </a>
      </p>

      <p>Visit us at: <a href="https://www.kavisha.ai">www.kavisha.ai</a></p>

      <p>
        Yours truly,<br />
        <strong>Team Kavisha</strong>
      </p>
    </div>
  );
}