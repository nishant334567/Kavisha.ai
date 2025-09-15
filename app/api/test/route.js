import { NextResponse } from "next/server";
import OpenAI from "openai";
import { connectDB } from "@/app/lib/db";
// import ChatSession from "@/app/models/ChatSessions";
import Session from "@/app/models/ChatSessions";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;
export async function POST(req) {
  await connectDB(); // connect mongoose once

  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    if (!openai) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    // 1. Generate embedding
    const embeddingRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });
    const queryEmbedding = embeddingRes.data[0].embedding;

    // 2. Debug collection and try vector search
    console.log("Attempting vector search...");
    console.log("Query embedding length:", queryEmbedding.length);
    console.log("Collection name:", Session.collection.name);
    console.log("Database name:", Session.db.name);

    // First, let's check if we have any documents with embeddings
    const sampleDoc = await Session.findOne({
      embedding: { $exists: true },
    });
    console.log(
      "Sample document with embedding:",
      sampleDoc ? "Found" : "Not found"
    );

    if (sampleDoc) {
      console.log("Sample embedding length:", sampleDoc.embedding?.length);
    }

    // Use the database directly for vector search
    const db = Session.db;
    const collection = db.collection("chatsessions");

    const results = await collection
      .aggregate([
        {
          $vectorSearch: {
            index: "vector_index", // Specify the index name
            queryVector: queryEmbedding,
            path: "embedding",
            numCandidates: 100,
            limit: 5,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $unwind: "$user",
        },
        {
          $project: {
            chatSummary: 1,
            role: 1,
            "user.name": 1,
            "user.email": 1,
          },
        },
      ])
      .toArray();

    console.log("Vector search successful, found", results.length, "results");

    return NextResponse.json({ matches: results });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
