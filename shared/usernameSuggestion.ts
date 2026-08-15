import { normalizeUsername, validateUsername } from "./profile";

type LinkedAccount = {
  type?: string;
  username?: string | null;
  address?: string | null;
  email?: string | null;
  name?: string | null;
};

type PrivyIdentityLike = {
  linkedAccounts?: LinkedAccount[];
};

const preferredAccountTypes = ["twitter_oauth", "farcaster", "github_oauth", "discord_oauth", "google_oauth"];

function toValidSuggestion(value: string | null | undefined) {
  if (!value) return null;
  const normalized = normalizeUsername(value);
  return validateUsername(normalized).valid ? normalized : null;
}

export function deriveUsernameSuggestion(identity: PrivyIdentityLike | undefined | null) {
  const accounts = identity?.linkedAccounts ?? [];
  for (const type of preferredAccountTypes) {
    const account = accounts.find(item => item.type === type);
    const suggestion = toValidSuggestion(account?.username ?? account?.name);
    if (suggestion) return suggestion;
  }

  for (const account of accounts) {
    const email = account.address ?? account.email;
    const suggestion = toValidSuggestion(email?.split("@")[0]);
    if (suggestion) return suggestion;
  }
  return null;
}
