const { z } = require("zod");

const envSchema = z.object({
  PORT: z.string().optional(),
  GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required"),
  DEV_MODE: z.string().optional()
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("❌ Invalid environment variables:");
    console.error(parsed.error.format());
    process.exit(1); // STOP the app immediately
  }

  return parsed.data;
}

module.exports = { loadEnv };