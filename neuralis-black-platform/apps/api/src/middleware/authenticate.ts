import { Request, Response, NextFunction } from "express";

export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    // In production, verify JWT token here
    const token = authHeader.replace("Bearer ", "");
    (req as Request & { userId?: string }).userId = token;
  }

  // Allow unauthenticated requests in development
  next();
}
