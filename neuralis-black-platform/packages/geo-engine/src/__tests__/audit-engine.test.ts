jest.mock("bullmq");

import { GEOAuditEngine, AuditResult } from "../audit-engine";

// Use the same values as the mock
const AuditStatus = {
  PENDING: "PENDING",
  RUNNING: "RUNNING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

// Mock types for Prisma and LLMClient
const mockPrisma = {
  audit: {
    create: jest.fn(),
    update: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    findMany: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
};

const mockLLMClient = {
  generate: jest.fn(),
};

describe("GEOAuditEngine", () => {
  let engine: GEOAuditEngine;

  beforeEach(() => {
    jest.clearAllMocks();

    engine = new GEOAuditEngine({
      prisma: mockPrisma as any,
      llmClient: mockLLMClient as any,
      redisUrl: "redis://localhost:6379",
    });
  });

  describe("enqueueAudit", () => {
    it("creates an audit record with PENDING status", async () => {
      mockPrisma.audit.create.mockResolvedValue({
        id: "audit-123",
        userId: "user-1",
        query: "test query",
        status: AuditStatus.PENDING,
      });

      await engine.enqueueAudit("user-1", "test query");

      expect(mockPrisma.audit.create).toHaveBeenCalledWith({
        data: {
          userId: "user-1",
          query: "test query",
          status: AuditStatus.PENDING,
        },
      });
    });

    it("returns the created audit ID", async () => {
      mockPrisma.audit.create.mockResolvedValue({
        id: "audit-456",
        userId: "user-1",
        query: "test query",
        status: AuditStatus.PENDING,
      });

      const auditId = await engine.enqueueAudit("user-1", "test query");
      expect(auditId).toBe("audit-456");
    });

    it("enqueues a job to the BullMQ queue", async () => {
      mockPrisma.audit.create.mockResolvedValue({
        id: "audit-789",
        userId: "user-1",
        query: "my query",
        status: AuditStatus.PENDING,
      });

      await engine.enqueueAudit("user-1", "my query");

      // The Queue.add method is called via the mocked bullmq
      const { Queue } = require("bullmq");
      const mockQueueInstance = Queue.mock.instances[0];
      expect(mockQueueInstance.add).toHaveBeenCalledWith("run-geo-audit", {
        auditId: "audit-789",
        query: "my query",
      });
    });
  });

  describe("runAudit", () => {
    beforeEach(() => {
      mockPrisma.audit.findUniqueOrThrow.mockResolvedValue({
        id: "audit-100",
        query: "optimize my website",
        status: AuditStatus.PENDING,
      });

      mockPrisma.audit.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});
    });

    it("updates audit status to RUNNING at start", async () => {
      mockLLMClient.generate
        .mockResolvedValueOnce({ text: "Analysis text", model: "gpt-4o" })
        .mockResolvedValueOnce({
          text: '["Rec 1", "Rec 2"]',
          model: "gpt-4o",
        });

      await engine.runAudit("audit-100");

      expect(mockPrisma.audit.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "audit-100" },
          data: { status: AuditStatus.RUNNING },
        })
      );
    });

    it("calls LLM for analysis and recommendations", async () => {
      mockLLMClient.generate
        .mockResolvedValueOnce({ text: "Analysis text", model: "gpt-4o" })
        .mockResolvedValueOnce({
          text: '["Rec 1", "Rec 2"]',
          model: "gpt-4o",
        });

      await engine.runAudit("audit-100");

      expect(mockLLMClient.generate).toHaveBeenCalledTimes(2);

      // First call - analysis
      expect(mockLLMClient.generate).toHaveBeenCalledWith(
        expect.stringContaining("optimize my website"),
        expect.stringContaining("GEO audit specialist")
      );

      // Second call - recommendations
      expect(mockLLMClient.generate).toHaveBeenCalledWith(
        expect.stringContaining("Analysis text"),
        expect.stringContaining("GEO optimization expert")
      );
    });

    it("parses JSON array recommendations from LLM response", async () => {
      mockLLMClient.generate
        .mockResolvedValueOnce({ text: "Analysis", model: "gpt-4o" })
        .mockResolvedValueOnce({
          text: '["Improve headings", "Add structured data"]',
          model: "gpt-4o",
        });

      const result = await engine.runAudit("audit-100");

      expect(result.recommendations).toEqual([
        "Improve headings",
        "Add structured data",
      ]);
    });

    it("wraps non-JSON recommendation text in an array", async () => {
      mockLLMClient.generate
        .mockResolvedValueOnce({ text: "Analysis", model: "gpt-4o" })
        .mockResolvedValueOnce({
          text: "Just a plain text recommendation",
          model: "gpt-4o",
        });

      const result = await engine.runAudit("audit-100");

      expect(result.recommendations).toEqual([
        "Just a plain text recommendation",
      ]);
    });

    it("returns a score between 60 and 100", async () => {
      mockLLMClient.generate
        .mockResolvedValueOnce({ text: "Analysis", model: "gpt-4o" })
        .mockResolvedValueOnce({ text: '["Rec"]', model: "gpt-4o" });

      const result = await engine.runAudit("audit-100");

      expect(result.score).toBeGreaterThanOrEqual(60);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(Number.isInteger(result.score)).toBe(true);
    });

    it("updates audit status to COMPLETED with results on success", async () => {
      mockLLMClient.generate
        .mockResolvedValueOnce({ text: "Analysis text", model: "gpt-4o" })
        .mockResolvedValueOnce({ text: '["Rec 1"]', model: "gpt-4o" });

      await engine.runAudit("audit-100");

      // The second update call should be the COMPLETED one
      const completedCall = mockPrisma.audit.update.mock.calls.find(
        (call: any[]) => call[0].data.status === AuditStatus.COMPLETED
      );

      expect(completedCall).toBeDefined();
      expect(completedCall![0].data.results).toBeDefined();
      expect(completedCall![0].where).toEqual({ id: "audit-100" });
    });

    it("returns a valid AuditResult", async () => {
      mockLLMClient.generate
        .mockResolvedValueOnce({ text: "Detailed analysis", model: "gpt-4o" })
        .mockResolvedValueOnce({
          text: '["Do this", "Do that"]',
          model: "gpt-4o",
        });

      const result = await engine.runAudit("audit-100");

      expect(result).toMatchObject({
        auditId: "audit-100",
        query: "optimize my website",
        analysis: "Detailed analysis",
        recommendations: ["Do this", "Do that"],
      });
      expect(typeof result.score).toBe("number");
    });

    it("logs steps during audit execution", async () => {
      mockLLMClient.generate
        .mockResolvedValueOnce({ text: "Analysis", model: "gpt-4o" })
        .mockResolvedValueOnce({ text: '["Rec"]', model: "gpt-4o" });

      await engine.runAudit("audit-100");

      const logCalls = mockPrisma.auditLog.create.mock.calls;
      const logSteps = logCalls.map((call: any[]) => call[0].data.step);

      expect(logSteps).toContain("start");
      expect(logSteps).toContain("llm-analysis");
      expect(logSteps).toContain("llm-recommendations");
      expect(logSteps).toContain("complete");
    });

    it("updates audit status to FAILED on error", async () => {
      mockLLMClient.generate.mockRejectedValueOnce(
        new Error("LLM service unavailable")
      );

      await expect(engine.runAudit("audit-100")).rejects.toThrow(
        "LLM service unavailable"
      );

      const failedCall = mockPrisma.audit.update.mock.calls.find(
        (call: any[]) => call[0].data.status === AuditStatus.FAILED
      );

      expect(failedCall).toBeDefined();
      expect(failedCall![0].where).toEqual({ id: "audit-100" });
    });

    it("logs error message on failure", async () => {
      mockLLMClient.generate.mockRejectedValueOnce(
        new Error("Connection timeout")
      );

      await expect(engine.runAudit("audit-100")).rejects.toThrow();

      const errorLog = mockPrisma.auditLog.create.mock.calls.find(
        (call: any[]) => call[0].data.step === "error"
      );

      expect(errorLog).toBeDefined();
      expect(errorLog![0].data.message).toBe("Connection timeout");
    });

    it("re-throws the original error after failure handling", async () => {
      const originalError = new Error("Original error");
      mockLLMClient.generate.mockRejectedValueOnce(originalError);

      await expect(engine.runAudit("audit-100")).rejects.toThrow(originalError);
    });

    it("handles non-Error thrown values", async () => {
      mockLLMClient.generate.mockRejectedValueOnce("string error");

      await expect(engine.runAudit("audit-100")).rejects.toBe("string error");

      const errorLog = mockPrisma.auditLog.create.mock.calls.find(
        (call: any[]) => call[0].data.step === "error"
      );

      expect(errorLog![0].data.message).toBe("string error");
    });
  });
});
