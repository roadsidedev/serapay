const USERNAME_PATTERN = /^[a-z][a-z0-9_]{2,23}$/;

export function normalizeUsername(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[.’']/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

export function validateUsername(value: string): { valid: true } | { valid: false; message: string } {
  if (!USERNAME_PATTERN.test(value)) {
    return { valid: false, message: "Use 3–24 lowercase letters, numbers, or underscores, starting with a letter." };
  }
  return { valid: true };
}
