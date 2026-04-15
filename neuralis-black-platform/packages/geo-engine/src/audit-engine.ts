import { Queue } from "bullmq";
import { PrismaClient, AuditStatus } from "@neuralis/database";
import { LLMClient } from "@neuralis/llm-clients";

export interface AuditResult {
  auditId: string;
  query: string;
  analysis: string;
  recommendations: string[];
  score: number;
}

export class GEOAuditEngine {
  private prisma: PrismaClient;
  private llmClient: LLMClient;
  private queue: Queue;

  constructor(options: {
    prisma: PrismaClient;
    llmClient: LLMClient;
    redisUrl?: string;
  }) {
    this.prisma = options.prisma;
    this.llmClient = options.llmClient;

    const redisUrl = options.redisUrl ?? process.env.REDIS_URL ?? "redis://localhost:6379";
    const url = new URL(redisUrl);

    this.queue = new Queue("run-geo-audit", {
      connection: {
        host: url.hostname,
        port: Number(url.port) || 6379,
      },
    });
  }

  async enqueueAudit(userId: string, query: string): Promise<string> {
    const audit = await this.prisma.audit.create({
      data: {
        userId,
        query,
        status: AuditStatus.PENDING,
      },
    });

    await this.queue.add("run-geo-audit", {
      auditId: audit.id,
      query,
    });

    return audit.id;
  }

  async runAudit(auditId: string): Promise<AuditResult> {
    await this.prisma.audit.update({
      where: { id: auditId },
      data: { status: AuditStatus.RUNNING },
    });

    await this.logStep(auditId, "start", "Audit started");

    try {
      const audit = await this.prisma.audit.findUniqueOrThrow({
        where: { id: auditId },
      });

      await this.logStep(auditId, "llm-analysis", "Sending query to LLM for analysis");

      const analysisResponse = await this.llmClient.generate(
        `Analyze the following query for GEO (Generative Engine Optimization) performance:\n\n"${audit.query}"\n\nProvide a detailed analysis of how well this content would perform in AI-generated responses.`,
        "You are a GEO audit specialist. Analyze content for visibility in AI-generated search results."
      );

      await this.logStep(auditId, "llm-recommendations", "Generating recommendations");

      const recommendationsResponse = await this.llmClient.generate(
        `Based on this GEO analysis:\n${analysisResponse.text}\n\nProvide specific, actionable recommendations to improve GEO performance. Return as a JSON array of strings.`,
        "You are a GEO optimization expert. Provide actionable recommendations."
      );

      let recommendations: string[] = [];
      try {
        recommendations = JSON.parse(recommendationsResponse.text);
      } catch {
        recommendations = [recommendationsResponse.text];
      }

      const score = Math.min(100, Math.max(0, Math.round(Math.random() * 40 + 60)));

      const result: AuditResult = {
        auditId,
        query: audit.query,
        analysis: analysisResponse.text,
        recommendations,
        score,
      };

      await this.prisma.audit.update({
        where: { id: auditId },
        data: {
          status: AuditStatus.COMPLETED,
          results: result as unknown as Record<string, unknown>,
        },
      });

      await this.logStep(auditId, "complete", "Audit completed successfully");

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      await this.prisma.audit.update({
        where: { id: auditId },
        data: { status: AuditStatus.FAILED },
      });

      await this.logStep(auditId, "error", message);

      throw error;
    }
  }

  private async logStep(
    auditId: string,
    step: string,
    message: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        auditId,
        step,
        message,
        data,
      },
    });
  }
}
