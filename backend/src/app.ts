import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { ZodError } from "zod";

import carbonRoutes from "./routes/carbon.js";
import gmailRoutes from "./routes/gmail.js";
import notificationRoutes from "./routes/notifications.js";
import orderRoutes from "./routes/orders.js";
import predictionRoutes from "./routes/predictions.js";
import recommendationRoutes from "./routes/recommendations.js";
import uploadRoutes from "./routes/uploads.js";
import userRoutes from "./routes/users.js";

export const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(",") ?? ["http://localhost:3000"], credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan("combined"));

app.get("/health", (_req, res) => res.json({ ok: true, service: "ecoguardian-ai-backend" }));
app.use("/v1/notifications", notificationRoutes);
app.use("/v1/orders", orderRoutes);
app.use("/v1/carbon", carbonRoutes);
app.use("/v1/predictions", predictionRoutes);
app.use("/v1/recommendations", recommendationRoutes);
app.use("/v1/uploads", uploadRoutes);
app.use("/v1/gmail", gmailRoutes);
app.use("/v1/users", userRoutes);

// Global error handler — must be after routes
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid input", details: err.errors } });
  }
  console.error("Unhandled error:", err);
  res.status(err.statusCode ?? 500).json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } });
});
