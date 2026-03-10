import IORedis from "ioredis";

let redis: IORedis | null = null;

export function getRedis() {
  if (!redis) {
    redis = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });
  }
  return redis;
}
