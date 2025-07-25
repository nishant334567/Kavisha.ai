import * as React from "react";

export function EmailTemplate({
  profileType,
  senderName,
  jobTitle,
  matchPercentage,
  receiverEmail,
}) {
  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        lineHeight: "1.6",
        color: "#333",
      }}
    >
      <p>
        Dear{" "}
        {receiverEmail
          ? receiverEmail.split("@")[0].charAt(0).toUpperCase() +
            receiverEmail.split("@")[0].slice(1)
          : "User"}
        ,
      </p>

      <p>
        {profileType === "recruiter" ? (
          <>
            <strong>{senderName}</strong> has applied to your job posting{" "}
            <strong>"{jobTitle || "position"}"</strong>.
            {matchPercentage && ` They are ${matchPercentage} matching!`}
          </>
        ) : (
          <>
            <strong>{senderName}</strong> is interested in you
            {jobTitle && ` for the "${jobTitle}" position`}.
            {matchPercentage && ` You are ${matchPercentage} matching!`}
          </>
        )}
      </p>

      <p>
        Login now at Kavisha.ai (www.kavisha.ai) to view the connection request
        and respond.
      </p>

      <p>
        Yours truly,
        <br />
        <strong>Team Kavisha</strong>
      </p>
    </div>
  );
}
