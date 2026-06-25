import { google } from "googleapis";

type GoogleOAuthTokens = {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
  scope?: string | null;
};

import { prisma } from "@/lib/prisma";
import { getSiteOrigin } from "@/lib/site-origin";

import { decryptToken, encryptToken } from "./encrypt-token";

export const GOOGLE_CALENDAR_EVENTS_SCOPE =
  "https://www.googleapis.com/auth/calendar.events";

function requireGoogleOAuthEnv(): { clientId: string; clientSecret: string } {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth client env is not configured");
  }
  return { clientId, clientSecret };
}

export function getGoogleOAuthRedirectUri(): string {
  return `${getSiteOrigin()}/api/integrations/google/callback`;
}

export function createGoogleOAuth2Client() {
  const { clientId, clientSecret } = requireGoogleOAuthEnv();
  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    getGoogleOAuthRedirectUri(),
  );
}

export function getGoogleAuthorizeUrl(state: string): string {
  const client = createGoogleOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [GOOGLE_CALENDAR_EVENTS_SCOPE],
    state,
  });
}

export async function upsertGoogleCalendarCredential(
  userId: string,
  tokens: GoogleOAuthTokens,
): Promise<void> {
  const existing = await prisma.googleCalendarCredential.findUnique({
    where: { userId },
  });

  const refreshToken =
    tokens.refresh_token ??
    (existing ? decryptToken(existing.refreshTokenEnc) : null);

  if (!refreshToken) {
    throw new Error("Google OAuth response missing refresh_token");
  }

  const accessToken = tokens.access_token ?? "";
  const expiresAt = tokens.expiry_date
    ? new Date(tokens.expiry_date)
    : new Date(Date.now() + 3_600_000);

  await prisma.googleCalendarCredential.upsert({
    where: { userId },
    create: {
      userId,
      accessTokenEnc: encryptToken(accessToken),
      refreshTokenEnc: encryptToken(refreshToken),
      expiresAt,
      scope: tokens.scope ?? GOOGLE_CALENDAR_EVENTS_SCOPE,
    },
    update: {
      accessTokenEnc: encryptToken(accessToken),
      ...(tokens.refresh_token
        ? { refreshTokenEnc: encryptToken(refreshToken) }
        : {}),
      expiresAt,
      scope: tokens.scope ?? GOOGLE_CALENDAR_EVENTS_SCOPE,
    },
  });
}

export async function isGoogleCalendarConnected(
  userId: string,
): Promise<boolean> {
  const cred = await prisma.googleCalendarCredential.findUnique({
    where: { userId },
    select: { id: true },
  });
  return cred !== null;
}

export async function disconnectGoogleCalendar(userId: string): Promise<void> {
  await prisma.googleCalendarCredential.deleteMany({ where: { userId } });
}

export async function getGoogleCalendarApi(userId: string) {
  const cred = await prisma.googleCalendarCredential.findUnique({
    where: { userId },
  });
  if (!cred) {
    return null;
  }

  const client = createGoogleOAuth2Client();
  const refreshToken = decryptToken(cred.refreshTokenEnc);
  let accessToken = decryptToken(cred.accessTokenEnc);

  const needsRefresh = cred.expiresAt.getTime() <= Date.now() + 60_000;
  if (needsRefresh) {
    client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await client.refreshAccessToken();
    if (!credentials.access_token) {
      throw new Error("Failed to refresh Google access token");
    }
    accessToken = credentials.access_token;
    await upsertGoogleCalendarCredential(userId, credentials);
    client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: credentials.expiry_date,
    });
  } else {
    client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: cred.expiresAt.getTime(),
    });
  }

  return google.calendar({ version: "v3", auth: client });
}
