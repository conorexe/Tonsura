export function buildUpstreamUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/$/, "");
  const normalised = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalised}`;
}
