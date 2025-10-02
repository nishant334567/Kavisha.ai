import pc from "../../lib/pinecone.js";
import { NextResponse } from "next/server";

export async function GET(request) {
    try {
        const records = [
            { id: "rec1", values: [0.1, 0.2, 0.3, 0.4, 0.5], metadata: { chunk_text: "The Eiffel Tower was completed in 1889 and stands in Paris, France.", category: "history" } },
            { id: "rec2", values: [0.2, 0.3, 0.4, 0.5, 0.6], metadata: { chunk_text: "Photosynthesis allows plants to convert sunlight into energy.", category: "science" } },
            { id: "rec3", values: [0.3, 0.4, 0.5, 0.6, 0.7], metadata: { chunk_text: "Albert Einstein developed the theory of relativity.", category: "science" } },
            { id: "rec4", values: [0.4, 0.5, 0.6, 0.7, 0.8], metadata: { chunk_text: "The mitochondrion is often called the powerhouse of the cell.", category: "biology" } },
            { id: "rec5", values: [0.5, 0.6, 0.7, 0.8, 0.9], metadata: { chunk_text: "Shakespeare wrote many famous plays, including Hamlet and Macbeth.", category: "literature" } }
        ];
        
        console.log("Starting Pinecone upsertion...");
        console.log(`Upserting ${records.length} records to index "intelligent-kavisha" namespace "ns1"`);
        
        const index = pc.index("intelligent-kavisha").namespace("ns1");
        
        // Use upsert method instead of upsertRecords
        const result = await index.upsert(records);
        
        console.log("Upsertion completed successfully!");
        console.log("Result:", result);
        
        return NextResponse.json({ 
            success: true,
            message: "Records upserted successfully",
            upsertedCount: records.length,
            result: result
        });
        
    } catch (error) {
        console.error("Error during Pinecone upsertion:", error);
        return NextResponse.json({ 
            success: false,
            error: error.message,
            details: error
        }, { status: 500 });
    }
}