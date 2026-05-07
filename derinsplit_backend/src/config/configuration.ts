export interface AppConfig {
  port: number;
  cors: { origin: string };
  database: { url: string };
  redis: { url: string };
  jwt: { secret: string; expiresIn: string };
  ai: { latencyMs: number; defaultRisk: string };
  payments: { provider: string; webhookSecret: string };
}

export const configuration = (): AppConfig => ({
  port: parseInt(process.env.PORT ?? '4000', 10),
  cors: { origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000' },
  database: { url: process.env.DATABASE_URL ?? '' },
  redis: { url: process.env.REDIS_URL ?? 'redis://localhost:6379' },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-only-please-change',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  ai: {
    latencyMs: parseInt(process.env.AI_LATENCY_MS ?? '1500', 10),
    defaultRisk: process.env.AI_RISK_DEFAULT ?? 'low',
  },
  payments: {
    provider: process.env.PAYMENTS_PROVIDER ?? 'stub',
    webhookSecret: process.env.PAYMENTS_WEBHOOK_SECRET ?? 'stub',
  },
});
