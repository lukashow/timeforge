// Environment configuration
export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  pocketbaseUrl: process.env.POCKETBASE_URL || "http://127.0.0.1:8090",
  isDev: process.env.NODE_ENV !== "production",
} as const;

export type Config = typeof config;
