export function parseCookieHeader(header: string | undefined): Record<string, string> {
  if (!header) return {};

  return header.split(";").reduce<Record<string, string>>((cookies, part) => {
    const separator = part.indexOf("=");
    if (separator < 1) return cookies;

    const name = part.slice(0, separator).trim();
    const encodedValue = part.slice(separator + 1).trim();
    if (!name) return cookies;

    try {
      cookies[name] = decodeURIComponent(encodedValue);
    } catch {
      cookies[name] = encodedValue;
    }

    return cookies;
  }, {});
}
