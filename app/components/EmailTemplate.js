import * as React from "react";

export function EmailTemplate({ receiverName, senderName }) {
  return (
    <div>
      <h1>Hey, {receiverName}!</h1>
      <p>{senderName} viewed your profile !! Expect a call from him.</p>
      <p>Thanks and regards,</p>
      <p>Team Kavisha.ai</p>
    </div>
  );
}
