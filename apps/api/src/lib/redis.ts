import IORedis from 'ioredis'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const IORedisConstructor = (IORedis as any).default ?? IORedis
export const redis = new IORedisConstructor(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})
