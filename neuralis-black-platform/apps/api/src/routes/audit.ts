import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "@neuralis/database";
import { GEOAuditEngine } from "@neuralis/geo-engine";
import { LLMClient } from "@neuralis/llm-clients";
import { authenticate } from "../middleware/authenticate";

const router = Router();

const llmClient = new LLMClient({
  provider: "openai",
  apiKey: process.env.OPENAI_API_KEY ?? "",
});

const auditEngine = new GEOAuditEngine({
  prisma,
  llmClient,
  redisUrl: process.env.REDIS_URL,
});

router.post(
  "/",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query } = req.body;

      if (!query || typeof query !== "string") {
        res.status(400).json({ error: "Query is required" });
        return;
      }

      const userId = (req as Request & { userId?: string }).userId ?? "anonymous";
      const auditId = await auditEngine.enqueueAudit(userId, query);

      res.status(201).json({ auditId, status: "PENDING" });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/:id",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const audit = await prisma.audit.findUnique({
        where: { id: req.params.id },
        include: { logs: true },
      });

      if (!audit) {
        res.status(404).json({ error: "Audit not found" });
        return;
      }

      res.json(audit);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as Request & { userId?: string }).userId;
      const audits = await prisma.audit.findMany({
        where: userId ? { userId } : undefined,
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      res.json(audits);
    } catch (error) {
      next(error);
    }
  }
);

export { router as auditRoutes };
