import { Router, Request, Response } from "express";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Subscription endpoint - not yet implemented" });
});

export { router as subscriptionRoutes };
