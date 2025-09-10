const CHAT_OPTIONS = {
  lead_journey: { k: "lead_journey", label: "LEAD JOURNEY" },
  job_seeker: { k: "job_seeker", label: "JOB SEEKER" },
  recruiter: { k: "recruiter", label: "RECRUITER" },
};

const getChatOptions = (brandContext) => {
  const { brandType, subdomain, isBrandAdmin } = brandContext;

  if (brandType !== "brand") {
    return [CHAT_OPTIONS.lead_journey];
  }

  if (subdomain === "kavisha") {
    return Object.values(CHAT_OPTIONS);
  }

  const options = [CHAT_OPTIONS.job_seeker, CHAT_OPTIONS.lead_journey];

  if (isBrandAdmin) {
    options.unshift(CHAT_OPTIONS.recruiter);
  }

  return options;
};

export default getChatOptions;
