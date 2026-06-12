/** Canonical site origin for server-side loopback fetches and OAuth redirect URIs. */
export function getSiteOrigin(): string {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    return siteUrl.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}
