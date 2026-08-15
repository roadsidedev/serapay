import { ActivityJournal } from "@/components/ActivityJournal";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSeraPrivy } from "@/contexts/PrivyContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useLocale } from "@/contexts/LocaleContext";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { COUNTRY_OPTIONS, CURRENCY_OPTIONS, DEVICE_APPROVAL_OPTIONS, LANGUAGE_OPTIONS, normalizeAccountPreferences } from "@shared/accountPreferences";
import { normalizeUsername, validateUsername } from "@shared/profile";
import { Check, Code2, Download, Globe2, History, KeyRound, Palette, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type ThemeOption = "light" | "dark" | "system";

const themeOptions: Array<{ value: ThemeOption; label: string }> = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "system", label: "System" },
];

type AccountProfilePanelProps = {
  address: string | null;
  onOpenDevConsole?: () => void;
  onOpenBuild?: () => void;
};

export function AccountProfilePanel({ address, onOpenDevConsole, onOpenBuild }: AccountProfilePanelProps) {
  const { user } = useAuth();
  const { authenticated, configured, exportWallet, login, linkPasskey, enrollPasskeyMfa, usernameSuggestion, displayName, avatarUrl } = useSeraPrivy();
  const { theme, setTheme } = useTheme();
  const { setLanguage } = useLocale();
  const [username, setUsername] = useState(user?.username ?? "");
  const [preferences, setPreferences] = useState(() => normalizeAccountPreferences({
    countryCode: user?.countryCode,
    preferredCurrency: user?.preferredCurrency,
    preferredLanguage: user?.preferredLanguage,
    deviceApproval: user?.deviceApproval,
  }));
  const normalizedUsername = useMemo(() => normalizeUsername(username), [username]);
  const usernameValidity = validateUsername(normalizedUsername);
  const availabilityInput = useMemo(() => ({ username: normalizedUsername }), [normalizedUsername]);
  const availability = trpc.profile.usernameAvailability.useQuery(availabilityInput, {
    enabled: authenticated && usernameValidity.valid && normalizedUsername !== user?.username,
    retry: false,
  });
  const utils = trpc.useUtils();
  const profileUpdate = trpc.profile.update.useMutation({ onSuccess: () => utils.auth.me.invalidate() });

  useEffect(() => {
    if (user?.username) setUsername(user.username);
    else if (usernameSuggestion) setUsername(usernameSuggestion);
  }, [user?.username, usernameSuggestion]);

  useEffect(() => {
    setPreferences(normalizeAccountPreferences({
      countryCode: user?.countryCode,
      preferredCurrency: user?.preferredCurrency,
      preferredLanguage: user?.preferredLanguage,
      deviceApproval: user?.deviceApproval,
    }));
  }, [user?.countryCode, user?.deviceApproval, user?.preferredCurrency, user?.preferredLanguage]);

  useEffect(() => {
    if (user?.preferredTheme === "dark" || user?.preferredTheme === "light" || user?.preferredTheme === "system") setTheme?.(user.preferredTheme);
  }, [setTheme, user?.preferredTheme]);

  const ensureAuthenticated = () => {
    if (authenticated) return true;
    if (configured) login();
    else toast.error("Set VITE_PRIVY_APP_ID to activate secure SeraPay sign-in.");
    return false;
  };

  const saveUsername = async () => {
    if (!ensureAuthenticated()) return;
    if (!usernameValidity.valid) return toast.error(usernameValidity.message);
    if (availability.data && !availability.data.available) return toast.error("That username is already taken.");
    try {
      await profileUpdate.mutateAsync({ username: normalizedUsername, embeddedWalletAddress: address ?? undefined });
      toast.success(`@${normalizedUsername} is now your SeraPay username.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update your SeraPay username.");
    }
  };

  const savePreference = async (input: Parameters<typeof normalizeAccountPreferences>[0]) => {
    const next = normalizeAccountPreferences(input);
    setPreferences(next);
    setLanguage(next.preferredLanguage);
    if (!authenticated) return;
    try {
      await profileUpdate.mutateAsync({ ...next, embeddedWalletAddress: address ?? undefined });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your account preferences.");
    }
  };

  const selectTheme = async (value: ThemeOption) => {
    setTheme?.(value);
    if (!authenticated) return;
    try {
      await profileUpdate.mutateAsync({ preferredTheme: value, embeddedWalletAddress: address ?? undefined });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your theme preference.");
    }
  };

  const requestWalletExport = async () => {
    if (!ensureAuthenticated() || !address) return toast.error("Create or link an embedded wallet before exporting it.");
    try {
      await exportWallet();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Privy could not open the secure wallet-export flow.");
    }
  };

  const protectWithPasskey = async () => {
    if (!ensureAuthenticated()) return;
    try {
      await linkPasskey();
      await savePreference({ ...preferences, deviceApproval: "passkey" });
      toast.success("Passkey added. You can use your device unlock to access SeraPay.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The passkey setup was not completed.");
    }
  };

  const enrollWalletMfa = async () => {
    if (!ensureAuthenticated()) return;
    try {
      await enrollPasskeyMfa();
      toast.success("Privy opened the wallet-approval setup on your device.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Wallet approval setup was not completed.");
    }
  };

  const usernameStatus = !authenticated ? "Sign in to claim" : !usernameValidity.valid ? usernameValidity.message : normalizedUsername === user?.username ? "Current username" : availability.isFetching ? "Checking availability…" : availability.data?.available ? "Available" : availability.data ? "Taken" : "Choose a username";
  const openDevConsole = onOpenDevConsole ?? onOpenBuild;
  const identityName = user?.name ?? displayName ?? (username ? `@${username}` : "SeraPay account");
  const initial = identityName.slice(0, 1).toUpperCase();

  return (
    <section className="space-y-5">
      <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">
        <div className="flex items-center gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border border-white/15 bg-white text-base font-semibold text-black">{avatarUrl ? <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : initial}</div><div className="min-w-0"><p className="truncate text-base font-semibold text-white">{identityName}</p><p className="mt-0.5 text-xs text-white/50">Your SeraPay identity and device preferences.</p></div><Badge variant="outline" className="ml-auto hidden border-white/15 text-white/60 sm:inline-flex">Ethereum</Badge></div>
        <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]"><div><Label htmlFor="username" className="text-xs text-white/65">Public username</Label><Input id="username" value={username} onChange={event => setUsername(event.target.value)} onBlur={() => setUsername(normalizedUsername)} placeholder="ayo_pay" className="mt-2 h-11 border-white/15 bg-black/20 text-white placeholder:text-white/30" /><p className={cn("mt-2 text-xs", usernameStatus === "Available" || usernameStatus === "Current username" ? "text-white/75" : usernameStatus === "Taken" || !usernameValidity.valid ? "text-red-300" : "text-white/45")}>{usernameStatus}</p></div><Button onClick={saveUsername} disabled={profileUpdate.isPending || !usernameValidity.valid || Boolean(availability.data && !availability.data.available)} className="h-11 self-end rounded-xl bg-white text-black hover:bg-white/85">Save username</Button></div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">
        <SectionHeading icon={Globe2} title="Regional preferences" copy="Set defaults for local display, prices, and language-aware experiences." />
        <div className="mt-5 grid gap-3 sm:grid-cols-3"><PreferenceSelect label="Country or region" value={preferences.countryCode} onChange={countryCode => { const country = COUNTRY_OPTIONS.find(option => option.code === countryCode); void savePreference({ ...preferences, countryCode, preferredCurrency: country?.currency ?? preferences.preferredCurrency }); }} options={COUNTRY_OPTIONS.map(option => ({ value: option.code, label: option.label }))} /><PreferenceSelect label="Default currency" value={preferences.preferredCurrency} onChange={preferredCurrency => void savePreference({ ...preferences, preferredCurrency })} options={CURRENCY_OPTIONS.map(value => ({ value, label: value }))} /><PreferenceSelect label="Preferred language" value={preferences.preferredLanguage} onChange={preferredLanguage => void savePreference({ ...preferences, preferredLanguage })} options={LANGUAGE_OPTIONS.map(option => ({ value: option.code, label: option.label }))} /></div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">
        <SectionHeading icon={Palette} title="Appearance" copy="Choose a calm monochrome surface that follows your device when you want it to." />
        <div className="mt-5 grid grid-cols-3 gap-2">{themeOptions.map(option => <button key={option.value} onClick={() => void selectTheme(option.value)} className={cn("rounded-xl border px-3 py-3 text-left text-sm font-medium transition", theme === option.value ? "border-white bg-white text-black" : "border-white/12 text-white/60 hover:border-white/35 hover:text-white")}>{option.label}</button>)}</div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><SectionHeading icon={KeyRound} title="Device approval" copy="Passkeys use your device’s Face Unlock, Touch ID, fingerprint, or screen lock. SeraPay never receives biometric data." /><div className="mt-5 space-y-2"><Button onClick={protectWithPasskey} variant="outline" className="h-10 w-full rounded-xl border-white/15 text-white hover:bg-white hover:text-black">Add or update passkey</Button><Button onClick={enrollWalletMfa} variant="outline" className="h-10 w-full rounded-xl border-white/15 text-white hover:bg-white hover:text-black"><ShieldCheck className="mr-2 h-4 w-4" />Secure wallet approvals</Button></div><p className="mt-3 text-xs leading-5 text-white/45">Passkey is your preferred device approval. Privy enforces the actual signature and transaction challenge once wallet MFA is enabled.</p></section>
        <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><SectionHeading icon={Download} title="Wallet export" copy="Recovery and export remain inside Privy’s protected flow. Your private key never enters SeraPay." /><Button onClick={requestWalletExport} variant="outline" className="mt-5 h-10 w-full rounded-xl border-white/15 text-white hover:bg-white hover:text-black">Open secure export</Button>{openDevConsole ? <Button onClick={openDevConsole} variant="ghost" className="mt-2 h-10 w-full rounded-xl text-white/70 hover:bg-white/[0.08] hover:text-white"><Code2 className="mr-2 h-4 w-4" />Open Dev Console</Button> : null}</section>
      </div>

      <details className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><summary className="flex cursor-pointer list-none items-center gap-3 text-sm font-medium text-white"><span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-white"><History className="h-4 w-4" /></span>Activity history <Badge variant="outline" className="ml-auto border-white/15 text-white/55">Wallet & Sera</Badge></summary><div className="mt-5 border-t border-white/10 pt-5"><ActivityJournal address={address} isAuthenticated={authenticated} /></div></details>
    </section>
  );
}

function SectionHeading({ icon: Icon, title, copy }: { icon: typeof UserRound; title: string; copy: string }) {
  return <div className="flex gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-white"><Icon className="h-4 w-4" /></span><div><h2 className="text-sm font-medium text-white">{title}</h2><p className="mt-1 text-xs leading-5 text-white/48">{copy}</p></div></div>;
}

function PreferenceSelect({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return <div><Label className="text-xs text-white/65">{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger className="mt-2 h-11 border-white/15 bg-black/20 text-white"><SelectValue /></SelectTrigger><SelectContent className="border-white/15 bg-[#111111] text-white">{options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>;
}
