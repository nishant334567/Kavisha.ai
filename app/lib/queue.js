// lib/queue.js
import { Queue } from "bullmq";
import { connection } from "./redis";

export const scrapeQueue = new Queue("scrape-queue", {
  connection,
});
