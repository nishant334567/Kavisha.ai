const dns = require("dns");
const mongoose = require("mongoose");

/** Node on some Windows / network setups gets querySrv ECONNREFUSED for mongodb+srv. */
function applyMongoDnsServers() {
  const raw = process.env.MONGODB_DNS_SERVERS;
  if (!raw?.trim()) return;
  const servers = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (servers.length) dns.setServers(servers);
}

applyMongoDnsServers();

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

async function connectDB() {
  if (isConnected) {
    return;
  }

  // If there's already a connection attempt in progress, wait for it
  if (connectionPromise) {
    return connectionPromise;
  }

  applyMongoDnsServers();

  connectionPromise = mongoose
    .connect(uri, options)
    .then(() => {
      isConnected = true;
    })
    .catch((error) => {
      isConnected = false;
      connectionPromise = null;
      throw error;
    });

  return connectionPromise;
}

// Add a function to check connection status
function isDBConnected() {
  return mongoose.connection.readyState === 1;
}

module.exports = { connectDB, isDBConnected };