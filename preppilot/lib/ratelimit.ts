import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (redis) return redis;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  return redis;
}

function buildLimiter(prefix: string, limit: number, window: `${number} ${"s" | "m" | "h" | "d"}`) {
  const r = getRedis();
  if (!r) return null;
  return new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(limit, window),
    analytics: true,
    prefix: `pp:${prefix}`,
  });
}

const dailyChat = buildLimiter("chat-day", 50, "1 d");
const burstChat = buildLimiter("chat-burst", 5, "1 m");
const onboardingLimit = buildLimiter("onboarding", 5, "1 h");
const ipLimit = buildLimiter("ip", 200, "1 m");

export type RateResult = {
  ok: boolean;
  remaining: number;
  reset: number;
  retryAfterSeconds: number;
};

async function check(limiter: Ratelimit | null, key: string): Promise<RateResult> {
  if (!limiter) {
    return { ok: true, remaining: 999, reset: 0, retryAfterSeconds: 0 };
  }
  const { success, remaining, reset } = await limiter.limit(key);
  return {
    ok: success,
    remaining,
    reset,
    retryAfterSeconds: success ? 0 : Math.max(1, Math.ceil((reset - Date.now()) / 1000)),
  };
}

export async function checkChatLimits(userId: string): Promise<RateResult> {
  const daily = await check(dailyChat, userId);
  if (!daily.ok) return daily;
  return await check(burstChat, userId);
}

export async function checkOnboardingLimit(userId: string): Promise<RateResult> {
  return await check(onboardingLimit, userId);
}

export async function checkIpLimit(ip: string): Promise<RateResult> {
  return await check(ipLimit, ip);
}
