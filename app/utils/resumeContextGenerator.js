const CONTEXT_MESSAGES = {
  recruiter: (resumeText) =>
    `USER HAS PROVIDED JD: ${resumeText}\n\nIMPORTANT: The user has already uploaded their JD. Process this JD content and ask contextual questions based on it. DO NOT ask for JD again. Acknowledge that you can read the JD.`,
  job_seeker: (resumeText) =>
    `USER HAS PROVIDED RESUME: ${resumeText}\n\nIMPORTANT: The user has already uploaded their resume. Process this resume content and ask contextual questions based on it. DO NOT ask for resume again. Acknowledge that you can read the resume.`,
  lead_journey: () => null, // No context needed
};

export const generateResumeContext = (resumeText, sessionType) => {
  if (!resumeText) return null;

  const messageGenerator = CONTEXT_MESSAGES[sessionType];
  return messageGenerator ? messageGenerator(resumeText) : null;
};
