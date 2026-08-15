export const COUNTRY_OPTIONS = [
  { code: "US", label: "United States", currency: "USD" },
  { code: "GB", label: "United Kingdom", currency: "GBP" },
  { code: "NG", label: "Nigeria", currency: "NGN" },
  { code: "KE", label: "Kenya", currency: "KES" },
  { code: "ZA", label: "South Africa", currency: "ZAR" },
  { code: "AE", label: "United Arab Emirates", currency: "AED" },
  { code: "SG", label: "Singapore", currency: "SGD" },
  { code: "EU", label: "European Union", currency: "EUR" },
] as const;

export const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "NGN", "KES", "ZAR", "AED", "SGD"] as const;
export const LANGUAGE_OPTIONS = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "pt", label: "Português" },
  { code: "yo", label: "Yorùbá" },
] as const;

export const DEVICE_APPROVAL_OPTIONS = ["passkey", "wallet"] as const;

export type CountryCode = (typeof COUNTRY_OPTIONS)[number]["code"];
export type CurrencyCode = (typeof CURRENCY_OPTIONS)[number];
export type LanguageCode = (typeof LANGUAGE_OPTIONS)[number]["code"];
export type DeviceApproval = (typeof DEVICE_APPROVAL_OPTIONS)[number];

export type AccountPreferences = {
  countryCode: CountryCode;
  preferredCurrency: CurrencyCode;
  preferredLanguage: LanguageCode;
  deviceApproval: DeviceApproval;
};

const defaultPreferences: AccountPreferences = {
  countryCode: "US",
  preferredCurrency: "USD",
  preferredLanguage: "en",
  deviceApproval: "passkey",
};

function includes(values: readonly string[], value: string | undefined) {
  return Boolean(value && values.includes(value));
}

export function normalizeAccountPreferences(input: Partial<Record<keyof AccountPreferences, string>>): AccountPreferences {
  return {
    countryCode: includes(COUNTRY_OPTIONS.map(option => option.code), input.countryCode) ? input.countryCode! as CountryCode : defaultPreferences.countryCode,
    preferredCurrency: includes(CURRENCY_OPTIONS, input.preferredCurrency) ? input.preferredCurrency! as CurrencyCode : defaultPreferences.preferredCurrency,
    preferredLanguage: includes(LANGUAGE_OPTIONS.map(option => option.code), input.preferredLanguage) ? input.preferredLanguage! as LanguageCode : defaultPreferences.preferredLanguage,
    deviceApproval: includes(DEVICE_APPROVAL_OPTIONS, input.deviceApproval) ? input.deviceApproval! as DeviceApproval : defaultPreferences.deviceApproval,
  };
}
