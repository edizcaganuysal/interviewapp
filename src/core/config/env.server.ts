import { z } from "zod";

const ServerEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ADMIN_USERNAME: z.string().min(1),
  ADMIN_PASSWORD: z.string().min(1),
  COOKIE_SECRET: z.string().min(1),
});

export function serverEnv() {
  const parsed = ServerEnvSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ADMIN_USERNAME: process.env.ADMIN_USERNAME,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    COOKIE_SECRET: process.env.COOKIE_SECRET,
  });

  if (!parsed.success) {
    throw new Error("SERVER_ENV_INVALID");
  }

  return parsed.data;
}
