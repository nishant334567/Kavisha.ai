import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;

// Connection options with better error handling
const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  bufferCommands: true, // Changed to true to prevent connection issues
  connectTimeoutMS: 30000,
};

let isConnected = false;
let connectionPromise = null;

export async function connectDB() {
  if (isConnected) {
    return;
  }

  // If there's already a connection attempt in progress, wait for it
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = mongoose
    .connect(uri, options)
    .then(() => {
      isConnected = true;
    })
    .catch((error) => {
      console.error("MongoDB connection error:", error.message);
      isConnected = false;
      connectionPromise = null;
      throw error;
    });

  return connectionPromise;
}

// Add a function to check connection status
export function isDBConnected() {
  return mongoose.connection.readyState === 1;
}
