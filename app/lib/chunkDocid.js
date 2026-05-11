/**
 * Derive TrainingData `docid` from Pinecone vector id (see `buildChunkId` in embeddings).
 * Formats: `docid_0` … or `docid_v1_0` when embeddingVersion > 0.
 * @param {string} chunkId
 * @returns {string | null}
 */
export function docidFromChunkId(chunkId) {
    const s = String(chunkId || "").trim();
    if (!s) return null;
    const vMatch = s.match(/^(.+)_v(\d+)_(\d+)$/);
    if (vMatch) return vMatch[1];
    const idxMatch = s.match(/^(.+)_(\d+)$/);
    if (idxMatch) return idxMatch[1];
    return null;
}
