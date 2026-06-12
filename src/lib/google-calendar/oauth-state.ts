import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const MAX_AGE_MS = 10 * 60 * 1000;

function getStateSecret(): string {
  const secret = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("GOOGLE_TOKEN_ENCRYPTION_KEY is not configured");
  }
  return secret;
}

function sign(body: string): string {
  return createHmac("sha256", getStateSecret())
    .update(body)
    .digest("base64url");
}

export function createOAuthState(params: {
  userId: string;
  returnPlanId: string;
}): string {
  const payload = {
    userId: params.userId,
    returnPlanId: params.returnPlanId,
    nonce: randomBytes(16).toString("hex"),
    ts: Date.now(),
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifyOAuthState(
  token: string,
): { userId: string; returnPlanId: string } | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) {
    return null;
  }
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(body);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (
    sigBuf.length !== expectedBuf.length ||
    !timingSafeEqual(sigBuf, expectedBuf)
  ) {
    return null;
  }

  const payload = JSON.parse(
    Buffer.from(body, "base64url").toString("utf8"),
  ) as {
    userId: string;
    returnPlanId: string;
    ts: number;
  };

  if (Date.now() - payload.ts > MAX_AGE_MS) {
    return null;
  }

  if (!payload.userId || !payload.returnPlanId) {
    return null;
  }

  return {
    userId: payload.userId,
    returnPlanId: payload.returnPlanId,
  };
}
