import { Worker, Job } from "bullmq";
import { prisma } from "@neuralis/database";
import { GEOAuditEngine } from "@neuralis/geo-engine";
import { LLMClient } from "@neuralis/llm-clients";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
const url = new URL(redisUrl);

const connection = {
  host: url.hostname,
  port: Number(url.port) || 6379,
};

const llmClient = new LLMClient({
  provider: "openai",
  apiKey: process.env.OPENAI_API_KEY ?? "",
});

const auditEngine = new GEOAuditEngine({
  prisma,
  llmClient,
  redisUrl,
});

const worker = new Worker(
  "run-geo-audit",
  async (job: Job) => {
    const { auditId } = job.data;
    console.log(`Processing audit job: ${auditId}`);

    const result = await auditEngine.runAudit(auditId);
    console.log(`Audit ${auditId} completed with score: ${result.score}`);

    return result;
  },
  { connection }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

worker.on("error", (err) => {
  console.error("Worker error:", err);
});

async function shutdown(): Promise<void> {
  console.log("Shutting down worker...");
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

console.log("Neuralis audit worker started, waiting for jobs...");
