import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_SECRET: z.string().min(16),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  AWS_REGION: z.string().default("ap-south-1"),
  AWS_S3_BUCKET: z.string().optional()
});

export const env = schema.parse(process.env);
