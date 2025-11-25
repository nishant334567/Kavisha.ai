import { connectDB } from "@/app/lib/db";
import TrainingData from "@/app/models/TrainingData";
import { NextResponse } from "next/server";
import pc from "@/app/lib/pinecone";
