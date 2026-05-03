import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";
import DerivedProfile from "@/app/models/DerivedProfile";
import { passesSeekerRecruiter } from "@/app/lib/community-match/hardFilters";
import { searchDerivedProfilesByEmbedding } from "@/app/lib/community-match/atlasVectorSearch";
import {
  normalizeSessionRole,
  counterpartSessionRole,
  sessionRoleMatch,
} from "@/app/lib/communitySessionRole";

function hasEmbedding(doc) {
  return Array.isArray(doc?.embedding) && doc.embedding.length > 0;
}

function passesHardForPair(srcKind, srcPayload, candPayload) {
  if (srcKind === "friends") return true;
  if (srcKind === "job_seeker") {
    return passesSeekerRecruiter(srcPayload, candPayload);
  }
  if (srcKind === "recruiter") {
    return passesSeekerRecruiter(candPayload, srcPayload);
  }
  return false;
}

export async function POST(request) {
  const { sessionId } = await request.json();
  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  await connectDB();
  const session = await Session.findById(sessionId).lean();
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (!session.isCommunityChat) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "not_community",
    });
  }

  const pairRole = counterpartSessionRole(session.role);
  if (!pairRole) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "not_counterpart_role",
    });
  }

  const srcProfile = await DerivedProfile.findOne({
    sessionId: session._id,
  }).lean();
  if (!srcProfile || srcProfile.enrichmentStatus !== "completed") {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "no_derived_profile",
    });
  }
  if (!hasEmbedding(srcProfile)) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "no_embedding",
    });
  }

  const indexName = process.env.ATLAS_VECTOR_SEARCH_INDEX_DERIVED_PROFILE?.trim();
  if (!indexName) {
    return NextResponse.json(
      {
        error:
          "Set ATLAS_VECTOR_SEARCH_INDEX_DERIVED_PROFILE to your Atlas Vector Search index name (DerivedProfile.embedding).",
      },
      { status: 500 }
    );
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

  if (candIds.length === 0) {
    return NextResponse.json({
      ok: true,
      level1CandidateCount: 0,
      vectorSearchCount: 0,
      eligibleCandidateCount: 0,
    });
  }

  const derivedReadyCount = await DerivedProfile.countDocuments({
    sessionId: { $in: candIds },
    enrichmentStatus: "completed",
    "embedding.0": { $exists: true },
  });

  const vectorResults = await searchDerivedProfilesByEmbedding(
    DerivedProfile.collection,
    {
      indexName,
      queryVector: srcProfile.embedding,
      candidateSessionIds: candIds,
      excludeUserId: session.userId,
      counterpartRole: pairRole,
      vectorPoolLimit: 200,
      numCandidates: 500,
      finalLimit: 25,
    }
  );

  const srcKind = normalizeSessionRole(session.role);
  const srcPayload = srcProfile.payload || {};

  const semanticMatches = vectorResults.map((row) => {
    const eligible = Boolean(
      srcKind && passesHardForPair(srcKind, srcPayload, row.payload || {})
    );
    return {
      sessionId: String(row.sessionId),
      summary: String(row.summary || ""),
      eligible,
    };
  });

  const eligibleCandidateCount = semanticMatches.filter((m) => m.eligible).length;

  console.log(
    "[compute-matches] vector search:",
    semanticMatches.map((m) => ({
      sessionId: String(m.sessionId),
      eligible: m.eligible,
      summary:
        m.summary.length > 220 ? `${m.summary.slice(0, 220)}…` : m.summary || "(empty)",
    }))
  );

  return NextResponse.json({
    ok: true,
    level1CandidateCount: derivedReadyCount,
    vectorSearchCount: vectorResults.length,
    eligibleCandidateCount,
    sourceSummary: String(srcProfile.summary || ""),
    semanticMatches,
  });
}
