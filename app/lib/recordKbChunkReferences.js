import TrainingData from "@/app/models/TrainingData";
import { docidFromChunkId } from "@/app/lib/chunkDocid";

/**
 * Increment `chunkReferenceCount` on TrainingData — at most once per doc per
 * assistant answer, no matter how many chunks from that doc were cited.
 *
 * @param {string} brand
 * @param {string[]} chunkIds
 * @param {Map<string, { docid?: string }>} uniqueContext
 */
export async function recordKbChunkReferences(brand, chunkIds, uniqueContext) {
    if (!brand || !Array.isArray(chunkIds) || chunkIds.length === 0) return;

    const docids = new Set();
    for (const chunkId of chunkIds) {
        const id = String(chunkId || "").trim();
        if (!id) continue;
        const fromMeta = String(
            uniqueContext?.get?.(id)?.docid || ""
        ).trim();
        const docid = fromMeta || docidFromChunkId(id);
        if (docid) docids.add(docid);
    }

    const ops = [...docids].map((docid) => ({
        updateOne: {
            filter: { brand, docid },
            update: { $inc: { chunkReferenceCount: 1 } },
        },
    }));

    if (ops.length === 0) return;

    try {
        await TrainingData.bulkWrite(ops, { ordered: false });
    } catch (e) {
        console.warn("[recordKbChunkReferences]", e?.message || e);
    }
}
