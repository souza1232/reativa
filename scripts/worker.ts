/**
 * BullMQ Worker — Reativa
 * Run with: npx tsx scripts/worker.ts
 *
 * Requires:
 *   REDIS_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   ENCRYPTION_KEY, NEXT_PUBLIC_APP_URL
 */

import "dotenv/config";
import { startWorker } from "../lib/queue";

console.log("Starting Reativa BullMQ worker...");

const worker = startWorker();

if (worker) {
  worker.on("completed", (job) => {
    console.log(`Job ${job?.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed:`, err.message);
  });

  worker.on("error", (err) => {
    console.error("Worker error:", err);
  });

  process.on("SIGTERM", async () => {
    console.log("SIGTERM received — closing worker...");
    await worker.close();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    console.log("SIGINT received — closing worker...");
    await worker.close();
    process.exit(0);
  });

  console.log("Worker running. Press Ctrl+C to stop.");
} else {
  console.error("Failed to start worker — check REDIS_URL env var.");
  process.exit(1);
}
