import express from "express";
import request from "supertest";
import { prisma } from "@neuralis/database";
import { mockEnqueueAudit } from "@neuralis/geo-engine";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

// Build a minimal express app with just the audit routes
function createApp() {
  const app = express();
  app.use(express.json());

  const { auditRoutes } = require("../../routes/audit");
  app.use("/api/audits", auditRoutes);

  return app;
}

describe("Audit Routes", () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  describe("POST /api/audits", () => {
    it("returns 400 when query is missing", async () => {
      const res = await request(app)
        .post("/api/audits")
        .send({})
        .expect(400);

      expect(res.body.error).toBe("Query is required");
    });

    it("returns 400 when query is not a string", async () => {
      const res = await request(app)
        .post("/api/audits")
        .send({ query: 123 })
        .expect(400);

      expect(res.body.error).toBe("Query is required");
    });

    it("returns 400 when query is empty string", async () => {
      const res = await request(app)
        .post("/api/audits")
        .send({ query: "" })
        .expect(400);

      expect(res.body.error).toBe("Query is required");
    });

    it("returns 201 with auditId on success", async () => {
      mockEnqueueAudit.mockResolvedValue("audit-abc-123");

      const res = await request(app)
        .post("/api/audits")
        .send({ query: "optimize my SEO" })
        .expect(201);

      expect(res.body).toEqual({
        auditId: "audit-abc-123",
        status: "PENDING",
      });
    });

    it("uses 'anonymous' userId when not authenticated", async () => {
      mockEnqueueAudit.mockResolvedValue("audit-anon");

      await request(app)
        .post("/api/audits")
        .send({ query: "test query" })
        .expect(201);

      expect(mockEnqueueAudit).toHaveBeenCalledWith("anonymous", "test query");
    });

    it("uses authenticated userId when available", async () => {
      mockEnqueueAudit.mockResolvedValue("audit-xyz");

      await request(app)
        .post("/api/audits")
        .set("Authorization", "Bearer user-42")
        .send({ query: "test query" })
        .expect(201);

      expect(mockEnqueueAudit).toHaveBeenCalledWith("user-42", "test query");
    });
  });

  describe("GET /api/audits/:id", () => {
    it("returns 404 when audit is not found", async () => {
      mockPrisma.audit.findUnique.mockResolvedValue(null as any);

      const res = await request(app)
        .get("/api/audits/nonexistent-id")
        .expect(404);

      expect(res.body.error).toBe("Audit not found");
    });

    it("returns audit with logs when found", async () => {
      const auditData = {
        id: "audit-100",
        userId: "user-1",
        query: "test query",
        status: "COMPLETED",
        results: { score: 85 },
        logs: [
          { id: "log-1", step: "start", message: "Audit started" },
          { id: "log-2", step: "complete", message: "Done" },
        ],
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:01:00.000Z",
      };

      mockPrisma.audit.findUnique.mockResolvedValue(auditData as any);

      const res = await request(app)
        .get("/api/audits/audit-100")
        .expect(200);

      expect(res.body).toEqual(auditData);
      expect(mockPrisma.audit.findUnique).toHaveBeenCalledWith({
        where: { id: "audit-100" },
        include: { logs: true },
      });
    });
  });

  describe("GET /api/audits", () => {
    it("returns list of audits", async () => {
      const audits = [
        { id: "audit-1", query: "query 1", status: "COMPLETED" },
        { id: "audit-2", query: "query 2", status: "PENDING" },
      ];

      mockPrisma.audit.findMany.mockResolvedValue(audits as any);

      const res = await request(app)
        .get("/api/audits")
        .expect(200);

      expect(res.body).toEqual(audits);
    });

    it("filters by userId when authenticated", async () => {
      mockPrisma.audit.findMany.mockResolvedValue([] as any);

      await request(app)
        .get("/api/audits")
        .set("Authorization", "Bearer user-42")
        .expect(200);

      expect(mockPrisma.audit.findMany).toHaveBeenCalledWith({
        where: { userId: "user-42" },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    });

    it("returns all audits when not authenticated", async () => {
      mockPrisma.audit.findMany.mockResolvedValue([] as any);

      await request(app)
        .get("/api/audits")
        .expect(200);

      expect(mockPrisma.audit.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    });

    it("limits results to 50 audits", async () => {
      mockPrisma.audit.findMany.mockResolvedValue([] as any);

      await request(app).get("/api/audits").expect(200);

      expect(mockPrisma.audit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 })
      );
    });

    it("orders audits by createdAt descending", async () => {
      mockPrisma.audit.findMany.mockResolvedValue([] as any);

      await request(app).get("/api/audits").expect(200);

      expect(mockPrisma.audit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: "desc" } })
      );
    });
  });
});
