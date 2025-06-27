import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;

// Simple connection options
const options = {
  maxPoolSize: 5,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 30000,
  bufferCommands: false,
};

let isConnected = false;

export async function connectDB() {
  // If already connected, return
  if (isConnected) {
    console.log("Using existing connection");
    return;
  }

  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(uri, options);
    isConnected = true;
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    isConnected = false;
    throw error;
  }
}
