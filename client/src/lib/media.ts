export function resolveMediaUrl(value: string | null | undefined) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value) || value.startsWith("data:")) return value;
  const apiBaseUrl = String(import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");
  return apiBaseUrl ? `${apiBaseUrl}${value.startsWith("/") ? value : `/${value}`}` : value;
}
