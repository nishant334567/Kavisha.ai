import { toNum } from "./numbers.js";

const SALARY_OVER_BUDGET_RATIO = 1.22;

export function workModesCompatible(a, b) {
  const x = String(a || "any").toLowerCase();
  const y = String(b || "any").toLowerCase();
  if (x === "any" || y === "any") return true;
  return x === y;
}

/**
 * Job seeker vs recruiter payloads (`enrich-derived-profile` schema).
 * Rejects only when both sides have values that conflict.
 */
export function passesSeekerRecruiter(seeker, recruiter) {
  const sExp = toNum(seeker.expectedSalaryInr);
  const rBudget = toNum(recruiter.salaryInr);
  if (sExp != null && rBudget != null && sExp > rBudget * SALARY_OVER_BUDGET_RATIO) {
    return false;
  }

  const sYoe = toNum(seeker.experienceYears);
  const rMin = toNum(recruiter.experienceMinYears);
  const rMax = toNum(recruiter.experienceMaxYears);
  if (sYoe != null) {
    if (rMin != null && sYoe < rMin) return false;
    if (rMax != null && sYoe > rMax) return false;
  }

  const sNotice = toNum(seeker.noticePeriodDays);
  const rUrgent = toNum(recruiter.urgentJoinInDays);
  if (sNotice != null && rUrgent != null && sNotice > rUrgent) {
    return false;
  }

  if (
    !workModesCompatible(
      /** @type {string} */ (seeker.workMode),
      /** @type {string} */ (recruiter.workMode)
    )
  ) {
    return false;
  }

  const emp = String(recruiter.employmentType || "unknown").toLowerCase();
  if (emp === "internship" && sYoe != null && sYoe >= 2) return false;

  return true;
}
