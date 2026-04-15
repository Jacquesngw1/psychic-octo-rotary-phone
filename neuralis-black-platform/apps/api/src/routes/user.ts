import { Router, Request, Response } from "express";

const router = Router();

router.get("/me", (_req: Request, res: Response) => {
  res.json({ message: "User endpoint - not yet implemented" });
});

export { router as userRoutes };
