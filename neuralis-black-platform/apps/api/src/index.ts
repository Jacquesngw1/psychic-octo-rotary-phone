import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { auditRoutes } from "./routes/audit";
import { userRoutes } from "./routes/user";
import { subscriptionRoutes } from "./routes/subscription";
import { errorHandler } from "./middleware/error-handler";

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/audits", auditRoutes);
app.use("/api/users", userRoutes);
app.use("/api/subscriptions", subscriptionRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Neuralis API server running on port ${PORT}`);
});

export default app;
