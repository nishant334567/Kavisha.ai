/**
 * Batch-POC: for each **DerivedProfile** in a loaded set, re-runs the **same matching pipeline**
 * as `POST /api/tasks/compute-matches` (see `app/api/tasks/compute-matches/route.js`):
 *   1) Resolve `ChatSessions` for the anchor, apply community + counterpart-role candidate query
 *   2) `searchDerivedProfilesByEmbedding` (Atlas vector + type filter for counterpart role)
 *   3) `passesHardForPair` on payloads (identical to API)
 *
 * Differences from the API: no HTTP, and anchors are only the **loaded** derived profiles (batch).
 *
 *   ATLAS_VECTOR_SEARCH_INDEX_DERIVED_PROFILE=… node scripts/analyze-derived-profile-pairs.js
 *   npm run analyze:derived-pairs
 *
 * Env (vector stage matches route defaults: pool 200, numCandidates 500, final 25):
 *   MATCH_ANALYSIS_MAX_PROFILES (default 80)
 *   MATCH_ANALYSIS_SOURCE — optional `DerivedProfile.source` (e.g. community)
 *   MATCH_ANALYSIS_VECTOR_POOL / MATCH_ANALYSIS_NUM_CANDIDATES / MATCH_ANALYSIS_NEIGHBORS_PER_ANCHOR
 *   MATCH_ANALYSIS_QUERY_DELAY_MS
 *   MATCH_ANALYSIS_TOP_SUMMARY
 *   MATCH_ANALYSIS_OUT
 */
const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");
const mongoose = require("mongoose");

const root = path.join(__dirname, "..");
if (fs.existsSync(path.join(root, ".env.local"))) {
  require("dotenv").config({ path: path.join(root, ".env.local") });
}

const { connectDB } = require(path.join(root, "app/lib/db.js"));
const Session = require(path.join(root, "app/models/ChatSessions.js"));
const DerivedProfile = require(path.join(root, "app/models/DerivedProfile.js"));

const SALARY_OVER_BUDGET_RATIO = 1.22;

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function toNum(x) {
  if (x == null || x === "") return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function workModesCompatible(x, y) {
  const a = String(x || "any").toLowerCase();
  const b = String(y || "any").toLowerCase();
  if (a === "any" || b === "any") return true;
  return a === b;
}

function seekerRecruiterAnalysis(seeker, recruiter) {
  const failures = [];

  const sExp = toNum(seeker.expectedSalaryInr);
  const rBudget = toNum(recruiter.salaryInr);
  if (sExp != null && rBudget != null && sExp > rBudget * SALARY_OVER_BUDGET_RATIO) {
    failures.push({
      rule: "salary_vs_budget",
      detail: `seeker.expectedSalaryInr (${sExp}) > recruiter.salaryInr * ${SALARY_OVER_BUDGET_RATIO} (${Math.round(rBudget * SALARY_OVER_BUDGET_RATIO)})`,
    });
  }

  const sYoe = toNum(seeker.experienceYears);
  const rMin = toNum(recruiter.experienceMinYears);
  const rMax = toNum(recruiter.experienceMaxYears);
  if (sYoe != null) {
    if (rMin != null && sYoe < rMin) {
      failures.push({
        rule: "experience_below_min",
        detail: `seeker.experienceYears (${sYoe}) < recruiter.experienceMinYears (${rMin})`,
      });
    }
    if (rMax != null && sYoe > rMax) {
      failures.push({
        rule: "experience_above_max",
        detail: `seeker.experienceYears (${sYoe}) > recruiter.experienceMaxYears (${rMax})`,
      });
    }
  }

  const sNotice = toNum(seeker.noticePeriodDays);
  const rUrgent = toNum(recruiter.urgentJoinInDays);
  if (sNotice != null && rUrgent != null && sNotice > rUrgent) {
    failures.push({
      rule: "notice_vs_urgent",
      detail: `seeker.noticePeriodDays (${sNotice}) > recruiter.urgentJoinInDays (${rUrgent})`,
    });
  }

  if (!workModesCompatible(seeker.workMode, recruiter.workMode)) {
    failures.push({
      rule: "work_mode",
      detail: `seeker.workMode (${seeker.workMode ?? "null"}) incompatible with recruiter.workMode (${recruiter.workMode ?? "null"})`,
    });
  }

  const emp = String(recruiter.employmentType || "unknown").toLowerCase();
  if (emp === "internship" && sYoe != null && sYoe >= 2) {
    failures.push({
      rule: "internship_vs_experience",
      detail: `recruiter employmentType internship but seeker.experienceYears (${sYoe}) >= 2`,
    });
  }

  const passes = failures.length === 0;
  return { passes, failures };
}

function preview(text, max = 140) {
  const s = String(text || "").trim();
  if (!s) return "";
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}

/** Same as `compute-matches` route. */
function passesHardForPair(srcKind, srcPayload, candPayload, passesSeekerRecruiter) {
  if (srcKind === "friends") return true;
  if (srcKind === "job_seeker") {
    return passesSeekerRecruiter(srcPayload, candPayload);
  }
  if (srcKind === "recruiter") {
    return passesSeekerRecruiter(candPayload, srcPayload);
  }
  return false;
}

async function loadLibs() {
  const hardUrl = pathToFileURL(path.join(root, "app/lib/community-match/hardFilters.js")).href;
  const roleUrl = pathToFileURL(path.join(root, "app/lib/communitySessionRole.js")).href;
  const atlasUrl = pathToFileURL(path.join(root, "app/lib/community-match/atlasVectorSearch.js")).href;
  const [{ passesSeekerRecruiter }, roleLib, { searchDerivedProfilesByEmbedding }] = await Promise.all([
    import(hardUrl),
    import(roleUrl),
    import(atlasUrl),
  ]);
  return { passesSeekerRecruiter, searchDerivedProfilesByEmbedding, ...roleLib };
}

function pairHardFilterAnalysis(profileA, profileB, { normalizeSessionRole, passesSeekerRecruiter }) {
  const ta = normalizeSessionRole(profileA.type);
  const tb = normalizeSessionRole(profileB.type);

  const pa = profileA.payload || {};
  const pb = profileB.payload || {};

  if (ta === "friends" && tb === "friends") {
    return {
      applicable: true,
      pairKind: "friends_friends",
      passesHardFilters: true,
      failureDetails: [],
      note: "friends ↔ friends: no numeric gates in product code",
    };
  }

  if (ta === "job_seeker" && tb === "recruiter") {
    const pass = passesSeekerRecruiter(pa, pb);
    const detail = seekerRecruiterAnalysis(pa, pb);
    return {
      applicable: true,
      pairKind: "job_seeker_vs_recruiter",
      orientation: "A=seeker B=recruiter",
      passesHardFilters: pass,
      failureDetails: pass ? [] : detail.failures,
      summary: pass ? "passes hard filters" : `failed ${detail.failures.length} rule(s)`,
    };
  }

  if (ta === "recruiter" && tb === "job_seeker") {
    const pass = passesSeekerRecruiter(pb, pa);
    const detail = seekerRecruiterAnalysis(pb, pa);
    return {
      applicable: true,
      pairKind: "job_seeker_vs_recruiter",
      orientation: "A=recruiter B=seeker",
      passesHardFilters: pass,
      failureDetails: pass ? [] : detail.failures,
      summary: pass ? "passes hard filters" : `failed ${detail.failures.length} rule(s)`,
    };
  }

  return {
    applicable: false,
    pairKind: "not_counterpart_roles",
    normalizedTypes: { a: ta, b: tb },
    passesHardFilters: null,
    failureDetails: [],
    note: "Hard filters only apply to seeker↔recruiter or friends↔friends (same schema family)",
  };
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI missing");

  const indexName = process.env.ATLAS_VECTOR_SEARCH_INDEX_DERIVED_PROFILE?.trim();
  if (!indexName) {
    throw new Error(
      "Set ATLAS_VECTOR_SEARCH_INDEX_DERIVED_PROFILE (same index as compute-matches)."
    );
  }

  const maxProfiles = Math.max(
    1,
    parseInt(process.env.MATCH_ANALYSIS_MAX_PROFILES || "80", 10) || 80
  );
  const sourceFilter = process.env.MATCH_ANALYSIS_SOURCE?.trim();
  const topSummary = Math.max(
    1,
    parseInt(process.env.MATCH_ANALYSIS_TOP_SUMMARY || "12", 10) || 12
  );
  const outPath = process.env.MATCH_ANALYSIS_OUT?.trim();
  const vectorPoolLimit = Math.min(
    500,
    Math.max(25, parseInt(process.env.MATCH_ANALYSIS_VECTOR_POOL || "200", 10) || 200)
  );
  const numCandidates = Math.min(
    2000,
    Math.max(vectorPoolLimit, parseInt(process.env.MATCH_ANALYSIS_NUM_CANDIDATES || "500", 10) || 500)
  );
  const neighborsPerAnchor = Math.min(
    100,
    Math.max(1, parseInt(process.env.MATCH_ANALYSIS_NEIGHBORS_PER_ANCHOR || "25", 10) || 25)
  );
  const queryDelayMs = Math.max(
    0,
    parseInt(process.env.MATCH_ANALYSIS_QUERY_DELAY_MS || "0", 10) || 0
  );

  const {
    passesSeekerRecruiter,
    searchDerivedProfilesByEmbedding,
    normalizeSessionRole,
    counterpartSessionRole,
    sessionRoleMatch,
  } = await loadLibs();

  await connectDB();

  const dpQuery = {
    enrichmentStatus: "completed",
    "embedding.0": { $exists: true },
  };
  if (sourceFilter) dpQuery.source = sourceFilter;

  const profiles = await DerivedProfile.find(dpQuery)
    .sort({ updatedAt: -1 })
    .limit(maxProfiles)
    .lean();

  const summarySkip =
    profiles.length >= maxProfiles
      ? `(loaded first ${maxProfiles} by updatedAt; raise MATCH_ANALYSIS_MAX_PROFILES for more)`
      : "";

  const perAnchor = [];
  let atlasQueries = 0;
  const skipCounts = {
    session_not_found: 0,
    not_community: 0,
    not_counterpart_role: 0,
    no_embedding: 0,
  };

  for (const anchor of profiles) {
    const session = await Session.findById(anchor.sessionId).lean();

    if (!session) {
      skipCounts.session_not_found++;
      perAnchor.push({
        anchorSessionId: String(anchor.sessionId),
        skipped: true,
        skipReason: "session_not_found",
      });
      continue;
    }

    if (!session.isCommunityChat) {
      skipCounts.not_community++;
      perAnchor.push({
        anchorSessionId: String(anchor.sessionId),
        skipped: true,
        skipReason: "not_community",
      });
      continue;
    }

    if (!Array.isArray(anchor.embedding) || anchor.embedding.length === 0) {
      skipCounts.no_embedding++;
      perAnchor.push({
        anchorSessionId: String(anchor.sessionId),
        skipped: true,
        skipReason: "no_embedding",
      });
      continue;
    }

    const pairRole = counterpartSessionRole(session.role);
    if (!pairRole) {
      skipCounts.not_counterpart_role++;
      perAnchor.push({
        anchorSessionId: String(anchor.sessionId),
        skipped: true,
        skipReason: "not_counterpart_role",
        sessionRole: session.role,
      });
      continue;
    }

    const roleRe = sessionRoleMatch(pairRole);

    const candIds = (
      await Session.find({
        isCommunityChat: true,
        _id: { $ne: session._id },
        userId: { $ne: session.userId },
        role: roleRe,
      })
        .select("_id")
        .lean()
    ).map((s) => s._id);

    const level1CandidateCount = await DerivedProfile.countDocuments({
      sessionId: { $in: candIds },
      enrichmentStatus: "completed",
      "embedding.0": { $exists: true },
    });

    let vectorResults = [];
    if (candIds.length > 0) {
      vectorResults = await searchDerivedProfilesByEmbedding(DerivedProfile.collection, {
        indexName,
        queryVector: anchor.embedding,
        candidateSessionIds: candIds,
        excludeUserId: session.userId,
        counterpartRole: pairRole,
        vectorPoolLimit,
        numCandidates,
        finalLimit: neighborsPerAnchor,
      });
      atlasQueries++;
    }

    const srcKind = normalizeSessionRole(session.role);
    const srcPayload = anchor.payload || {};
    const anchorForAnalysis = { ...anchor, type: session.role };

    const neighbors = vectorResults.map((row, idx) => {
      const eligible = Boolean(
        srcKind && passesHardForPair(srcKind, srcPayload, row.payload || {}, passesSeekerRecruiter)
      );
      const hardFilterAnalysis = pairHardFilterAnalysis(anchorForAnalysis, row, {
        normalizeSessionRole,
        passesSeekerRecruiter,
      });
      return {
        atlasRank: idx + 1,
        sessionId: String(row.sessionId),
        userId: String(row.userId),
        type: row.type,
        normalizedType: normalizeSessionRole(row.type),
        summaryPreview: preview(row.summary, 220),
        eligible,
        hardFilterAnalysis,
      };
    });

    const eligibleCandidateCount = neighbors.filter((n) => n.eligible).length;

    perAnchor.push({
      anchorSessionId: String(anchor.sessionId),
      anchorUserId: String(session.userId),
      sessionRole: session.role,
      pairRole,
      srcKind,
      anchorSummaryPreview: preview(anchor.summary, 220),
      sourceSummary: String(anchor.summary || ""),
      level1CandidateCount,
      vectorSearchCount: vectorResults.length,
      eligibleCandidateCount,
      sessionCandidateCount: candIds.length,
      neighbors,
    });

    if (queryDelayMs) await delay(queryDelayMs);
  }

  const snapshotTable = perAnchor
    .filter((b) => !b.skipped)
    .map((b) => ({
      anchorSessionId: b.anchorSessionId,
      sessionRole: b.sessionRole,
      pairRole: b.pairRole,
      level1: b.level1CandidateCount,
      vectorN: b.vectorSearchCount,
      eligible: b.eligibleCandidateCount,
      topNeighbor: b.neighbors?.[0]?.sessionId ?? null,
      topEligible: b.neighbors?.[0]?.eligible ?? null,
    }));

  const report = {
    meta: {
      generatedAt: new Date().toISOString(),
      pipeline: "same as app/api/tasks/compute-matches/route.js",
      similaritySource: "mongodb_atlas_vector_search via searchDerivedProfilesByEmbedding",
      atlasIndex: indexName,
      anchorProfilesLoaded: profiles.length,
      atlasAggregationRuns: atlasQueries,
      skipCounts,
      maxProfilesCap: maxProfiles,
      derivedProfileSourceFilter: sourceFilter || null,
      vectorPoolLimit,
      numCandidates,
      neighborsPerAnchor,
      note: `Each anchor uses Session candidate query + counterpart type filter in vector $match, then hard filters. ${summarySkip}`,
    },
    topAnchors: snapshotTable.slice(0, topSummary),
    perAnchor,
  };

  const json = JSON.stringify(report, null, 2);

  console.error("\n=== DerivedProfile batch analysis (compute-matches parity) ===");
  console.error(`Anchors loaded: ${profiles.length} ${summarySkip}`);
  console.error(`Atlas aggregations: ${atlasQueries}`);
  console.error(`Skips: ${JSON.stringify(skipCounts)}`);
  console.error(`\nFirst ${Math.min(topSummary, snapshotTable.length)} anchors (summary):\n`);
  for (const row of report.topAnchors) {
    console.error(
      `  …${String(row.anchorSessionId).slice(-8)}  role=${row.sessionRole}  pair=${row.pairRole}  L1=${row.level1}  vec=${row.vectorN}  eligible=${row.eligible}  top…${row.topNeighbor ? String(row.topNeighbor).slice(-8) : "none"}`
    );
  }

  if (outPath) {
    fs.writeFileSync(outPath, json, "utf8");
    console.error(`\nFull report written to ${outPath} (${Buffer.byteLength(json, "utf8")} bytes)`);
    console.log(
      JSON.stringify(
        {
          meta: report.meta,
          topAnchors: report.topAnchors,
          outputFile: outPath,
        },
        null,
        2
      )
    );
  } else {
    console.error("\nFull JSON on stdout (set MATCH_ANALYSIS_OUT=file.json for file only).\n");
    console.log(json);
  }

  await mongoose.connection.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
