import * as React from "react";

export function EmailTemplate({ profileType }) {
  return (
    <div>
      <div>
        <p>
          {profileType === "recruiter"
            ? "We have found some exciting oppurtunity for you"
            : "We have found some great set of candidates for you job posting"}
          . Login now at Kavisha.ai (www.kavisha.ai) to find the matches
        </p>
      </div>
    </div>
  );
}
