const loopbackHosts = new Set(["localhost", "127.0.0.1", "::1"]);

export function isStagingMiniAppUrl(value: string) {
  try {
    const url = new URL(value.trim());
    if (url.username || url.password) return false;
    if (url.protocol === "https:") return true;
    return url.protocol === "http:" && loopbackHosts.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}
