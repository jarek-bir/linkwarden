import { z } from "zod";

// Schema for environment variable validation
const envSchema = z.object({
  // Core authentication
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters"),
  
  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  POSTGRES_PASSWORD: z.string().min(16, "POSTGRES_PASSWORD must be at least 16 characters"),
  
  // Search
  MEILI_HOST: z.string().url("MEILI_HOST must be a valid URL").optional(),
  MEILI_MASTER_KEY: z.string().min(16, "MEILI_MASTER_KEY must be at least 16 characters").optional(),
  
  // Storage
  STORAGE_FOLDER: z.string().optional(),
  
  // Limits and timeouts
  PAGINATION_TAKE_COUNT: z.coerce.number().min(1).max(1000).optional(),
  MAX_LINKS_PER_USER: z.coerce.number().min(1).optional(),
  BROWSER_TIMEOUT: z.coerce.number().min(1000).max(60000).optional(),
  ARCHIVE_TAKE_COUNT: z.coerce.number().min(1).max(20).optional(),
  
  // Feature flags
  NEXT_PUBLIC_DISABLE_REGISTRATION: z.enum(["true", "false"]).optional(),
  NEXT_PUBLIC_CREDENTIALS_ENABLED: z.enum(["true", "false"]).optional(),
  DISABLE_NEW_SSO_USERS: z.enum(["true", "false"]).optional(),
  DISABLE_PRESERVATION: z.enum(["true", "false"]).optional(),
  
  // Buffer sizes
  NEXT_PUBLIC_MAX_FILE_BUFFER: z.coerce.number().min(1).optional(),
  PDF_MAX_BUFFER: z.coerce.number().min(1).optional(),
  SCREENSHOT_MAX_BUFFER: z.coerce.number().min(1).optional(),
  READABILITY_MAX_BUFFER: z.coerce.number().min(1).optional(),
  PREVIEW_MAX_BUFFER: z.coerce.number().min(1).optional(),
  MONOLITH_MAX_BUFFER: z.coerce.number().min(1).optional(),
  
  // AI Settings
  NEXT_PUBLIC_OLLAMA_ENDPOINT_URL: z.string().url().optional(),
  OLLAMA_MODEL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),
  AZURE_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  
  // S3/Spaces
  SPACES_KEY: z.string().optional(),
  SPACES_SECRET: z.string().optional(),
  SPACES_ENDPOINT: z.string().url().optional(),
  SPACES_BUCKET_NAME: z.string().optional(),
  SPACES_REGION: z.string().optional(),
  SPACES_FORCE_PATH_STYLE: z.enum(["true", "false"]).optional(),
  
  // Email/SMTP
  NEXT_PUBLIC_EMAIL_PROVIDER: z.enum(["true", "false"]).optional(),
  EMAIL_FROM: z.string().email().optional(),
  EMAIL_SERVER: z.string().optional(),
  
  // Proxy
  PROXY: z.string().optional(),
  PROXY_USERNAME: z.string().optional(),
  PROXY_PASSWORD: z.string().optional(),
  
  // Node environment
  NODE_ENV: z.enum(["development", "production", "test"]).optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(): EnvConfig {
  try {
    const env = envSchema.parse(process.env);
    console.log("✅ Environment variables validated successfully");
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Environment validation failed:");
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join(".")}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

// Validate environment on import in production (but not during build)
if (process.env.NODE_ENV === "production" && !process.env.NEXT_PHASE && !process.env.SKIP_ENV_VALIDATION) {
  validateEnv();
}
