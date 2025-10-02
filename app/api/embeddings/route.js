// app/api/embed/route.js
import { NextResponse } from "next/server";

import pc from "../../lib/pinecone.js";
import { generateEmbedding } from "../../lib/embeddings.js";

const getWordCount = (text) => {
  return text.split(" ").length;
}

export async function POST(request) {
  try {
    const { text, brand } = await request.json();
    
    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }
    
    if (!brand) {
      return NextResponse.json({ error: "Brand is required" }, { status: 400 });
    }

    const totalWords = getWordCount(text);
    const chunks = text.split(" ");
    const chunkSize = 250;
    const totalChunks = Math.ceil(chunks.length / chunkSize);
    
    const results = [];
    
    for (let i = 0; i < chunks.length; i += chunkSize) {
      const chunk = chunks.slice(i, i + chunkSize).join(" ");
      const chunkIndex = Math.floor(i / chunkSize) + 1;
      const datapointId = `chunk_${Date.now()}_${brand}_${chunkIndex}`;
      
      try {
        const embedding = await generateEmbedding(chunk);
        
        if (embedding === 0) {
          console.error(`Failed to generate embedding for chunk ${chunkIndex}`);
          continue;
        }
        
        const metadata = {
          text: chunk,
          generatedAt: new Date().toISOString(),
          embeddingModel: 'text-embedding-005',
          dimensions: embedding.length,
          brand: brand,
          chunkIndex: chunkIndex,
          totalChunks: totalChunks,
          wordCount: getWordCount(chunk)
        };
        
        await pc.index("intelligent-kavisha").namespace(brand).upsert([{
          id: datapointId,
          values: embedding,
          metadata: metadata
        }]);
        
        results.push({
          chunkIndex,
          datapointId,
          wordCount: getWordCount(chunk)
        });
        
      } catch (chunkError) {
        console.error(`Error processing chunk ${chunkIndex}:`, chunkError);
        // Continue with other chunks
      }
    }

    return NextResponse.json({ 
      success: true,
      message: `Successfully processed ${results.length} chunks out of ${totalChunks}`,
      totalWords,
      totalChunks,
      processedChunks: results.length,
      results
    });
  } catch (error) {
    console.error('Error in embeddings API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}