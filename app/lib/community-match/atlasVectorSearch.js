import { derivedProfileTypesForRole } from "../communitySessionRole.js";

/**
 * Atlas Vector Search on `derivedprofiles.embedding` only.
 * Index must define the vector path (`embedding`); do not rely on filter fields on the index.
 *
 * Stage 1: $vectorSearch — semantic neighbors (no filter on the index).
 * Stage 2: $match — session/type/user/enrichment filters (same logic as before).
 * Stage 3: $limit — cap results (default 25). Order stays vector similarity order; no extra reorder.
 *
 * @param {import("mongoose").Collection} collection - DerivedProfile.collection
 */
export async function searchDerivedProfilesByEmbedding(collection, opts) {
  const {
    indexName,
    queryVector,
    candidateSessionIds,
    excludeUserId,
    counterpartRole,
    /** Neighbors requested from vector stage before filtering (pool). */
    vectorPoolLimit = 200,
    numCandidates = 500,
    /** Final row cap after $match (semantic order preserved). */
    finalLimit = 25,
  } = opts;

  if (!candidateSessionIds?.length || !queryVector?.length) {
    return [];
  }

  const typeValues = derivedProfileTypesForRole(counterpartRole);
  if (!typeValues.length) {
    return [];
  }

  const pool = Math.min(Math.max(vectorPoolLimit, finalLimit), 500);
  const candidatesCap = Math.min(Math.max(numCandidates, pool), 2000);

  const pipeline = [
    {
      $vectorSearch: {
        index: indexName,
        path: "embedding",
        queryVector,
        numCandidates: candidatesCap,
        limit: pool,
      },
    },
    {
      $match: {
        enrichmentStatus: "completed",
        userId: { $ne: excludeUserId },
        sessionId: { $in: candidateSessionIds },
        type: { $in: typeValues },
      },
    },
    { $limit: finalLimit },
    {
      $project: {
        sessionId: 1,
        userId: 1,
        payload: 1,
        type: 1,
        summary: 1,
      },
    },
  ];

  return collection.aggregate(pipeline).toArray();
}

/**
 * Same embedding-only vector stage as {@link searchDerivedProfilesByEmbedding}, but matches **any**
 * candidate session ids (no `type` / counterpart-role filter). Use for cohort-wide semantic neighbors.
 *
 * @param {import("mongoose").Collection} collection
 */
export async function vectorSearchAmongCandidateSessions(collection, opts) {
  const {
    indexName,
    queryVector,
    candidateSessionIds,
    excludeUserId,
    vectorPoolLimit = 200,
    numCandidates = 500,
    finalLimit = 25,
  } = opts;

  if (!candidateSessionIds?.length || !queryVector?.length) {
    return [];
  }

  const pool = Math.min(Math.max(vectorPoolLimit, finalLimit), 500);
  const candidatesCap = Math.min(Math.max(numCandidates, pool), 2000);

  const pipeline = [
    {
      $vectorSearch: {
        index: indexName,
        path: "embedding",
        queryVector,
        numCandidates: candidatesCap,
        limit: pool,
      },
    },
    {
      $match: {
        enrichmentStatus: "completed",
        userId: { $ne: excludeUserId },
        sessionId: { $in: candidateSessionIds },
      },
    },
    { $limit: finalLimit },
    {
      $project: {
        sessionId: 1,
        userId: 1,
        payload: 1,
        type: 1,
        summary: 1,
      },
    },
  ];

  return collection.aggregate(pipeline).toArray();
}
