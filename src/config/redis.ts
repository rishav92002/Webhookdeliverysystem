import { Redis } from "ioredis";
import { config } from "./config.js";

const redisOptions = {
  maxRetriesPerRequest: null,
  ...(config.redisUrl.startsWith("rediss://") ? { tls: {} } : {}),
};

export const redis = new Redis(config.redisUrl, redisOptions);
