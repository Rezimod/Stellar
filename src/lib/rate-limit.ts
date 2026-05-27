// Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in environment variables.
// Get free Redis at upstash.com
import { Ratelimit, type Duration } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Lazy initialization — avoids running Redis.fromEnv() at build/import time
let _redis: Redis | null = null;
function getRedis(): Redis {
  if (!_redis) _redis = Redis.fromEnv();
  return _redis;
}

function makeLimit(window: Duration, requests: number, prefix: string) {
  return new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(requests, window),
    prefix,
  });
}

export const chatRateLimit = { limit: (id: string) => makeLimit('60 s', 10, 'rl:chat').limit(id) };
export const verifyRateLimit = { limit: (id: string) => makeLimit('60 s', 5, 'rl:verify').limit(id) };
export const mintRateLimit = { limit: (id: string) => makeLimit('3600 s', 30, 'rl:mint').limit(id) };
export const awardStarsRateLimit = { limit: (id: string) => makeLimit('3600 s', 10, 'rl:award').limit(id) };
export const redeemRateLimit = { limit: (id: string) => makeLimit('3600 s', 5, 'rl:redeem').limit(id) };
// 60 req/min/IP — generous for legit users (page reload + a few region switches),
// blocks scrapers from blowing through the Open-Meteo quota.
export const skyForecastRateLimit = { limit: (id: string) => makeLimit('60 s', 60, 'rl:sky:f').limit(id) };

// Daily ceilings (24h sliding) — bound the worst-case AI cost / token
// issuance per user even if the per-minute / per-hour limits are saturated.
// These are the numbers we cite in the pitch math:
//   chat:    50 msg/day/user → ~$0.08/user/day worst-case OpenAI bill
//   verify:  20 attempts/day → ~$0.40/user/day worst-case Claude bill
//   award:   30 grants/day  → bounds Stars issuance through this route
export const chatDailyLimit   = { limit: (id: string) => makeLimit('86400 s', 50, 'rl:chat:d').limit(id) };
export const verifyDailyLimit = { limit: (id: string) => makeLimit('86400 s', 20, 'rl:verify:d').limit(id) };
export const awardStarsDailyLimit = { limit: (id: string) => makeLimit('86400 s', 30, 'rl:award:d').limit(id) };

export async function checkRateLimit(
  limiter: { limit: (id: string) => Promise<{ success: boolean; remaining: number; reset: number }> },
  identifier: string
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const result = await limiter.limit(identifier);
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}
