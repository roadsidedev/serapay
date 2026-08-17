import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSeraPrivy } from "@/contexts/PrivyContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useLocale } from "@/contexts/LocaleContext";
import { getSeraApiKeyManagementTypedData } from "@shared/sera";
import { signTypedData as signInjectedTypedData } from "@/lib/walletClient";
import { resolveMediaUrl } from "@/lib/media";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { COUNTRY_OPTIONS, CURRENCY_OPTIONS, DEVICE_APPROVAL_OPTIONS, LANGUAGE_OPTIONS, normalizeAccountPreferences } from "@shared/accountPreferences";
import { normalizeUsername, validateUsername } from "@shared/profile";
import { Check, Download, Globe2, ImagePlus, KeyRound, Loader2, Palette, Pencil, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type ThemeOption = "light" | "dark" | "system";
const themeOptions: Array<{ value: ThemeOption; label: string }> = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "system", label: "System" },
];

type AccountProfilePanelProps = { address: string | null; mode?: "profile" | "settings" };

function prepareAvatarDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The selected image could not be read."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("The selected image could not be decoded."));
      image.onload = () => {
        const maxDimension = 512;
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) return reject(new Error("Your browser could not prepare this image."));
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
          if (!blob) return reject(new Error("Your browser could not prepare this image."));
          const outputReader = new FileReader();
          outputReader.onerror = () => reject(new Error("The selected image could not be prepared."));
          outputReader.onload = () => resolve(String(outputReader.result));
          outputReader.readAsDataURL(blob);
        }, "image/jpeg", 0.82);
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function AccountProfilePanel({ address, mode = "settings" }: AccountProfilePanelProps) {
  const { user, isAuthenticated: previewAuthenticated } = useAuth();
  const { authenticated, configured, exportWallet, login, linkPasskey, enrollPasskeyMfa, usernameSuggestion, displayName, avatarUrl, walletAddress, signTypedData: signPrivyTypedData } = useSeraPrivy();
  const { theme, setTheme } = useTheme();
  const showPreferences = mode === "settings";
  const showProfile = mode === "profile";
  const { setLanguage } = useLocale();
  const [username, setUsername] = useState(user?.username ?? usernameSuggestion ?? "");
  const [usernameEditing, setUsernameEditing] = useState(false);
  const [preferences, setPreferences] = useState(() => normalizeAccountPreferences({ countryCode: user?.countryCode, preferredCurrency: user?.preferredCurrency, preferredLanguage: user?.preferredLanguage, deviceApproval: user?.deviceApproval }));
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const normalizedUsername = useMemo(() => normalizeUsername(username), [username]);
  const usernameValidity = validateUsername(normalizedUsername);
  const appAuthenticated = authenticated || previewAuthenticated;
  const availability = trpc.profile.usernameAvailability.useQuery({ username: normalizedUsername }, { enabled: appAuthenticated && usernameEditing && usernameValidity.valid && normalizedUsername !== user?.username, retry: false });
  const utils = trpc.useUtils();
  const profileUpdate = trpc.profile.update.useMutation({ onSuccess: () => utils.auth.me.invalidate() });
  const uploadAvatar = trpc.profile.uploadAvatar.useMutation({ onSuccess: () => utils.auth.me.invalidate() });
  const ownerAddress = address ?? walletAddress;
  const seraConfig = trpc.sera.config.useQuery(undefined, { retry: false });
  const seraTime = trpc.sera.systemTime.useQuery(undefined, { retry: false });
  const seraKeyStatus = trpc.sera.apiKeyStatus.useQuery({ ownerAddress: ownerAddress ?? "0x0000000000000000000000000000000000000000" }, { enabled: appAuthenticated && Boolean(ownerAddress), retry: false });
  const createSeraApiKey = trpc.sera.createApiKey.useMutation({ onSuccess: () => seraKeyStatus.refetch() });
  const revokeSeraApiKey = trpc.sera.revokeApiKey.useMutation({ onSuccess: () => seraKeyStatus.refetch() });
  const [seraKeyBusy, setSeraKeyBusy] = useState(false);

  useEffect(() => {
    if (user?.username) setUsername(user.username);
    else if (usernameSuggestion) setUsername(usernameSuggestion);
  }, [user?.username, usernameSuggestion]);

  useEffect(() => {
    setPreferences(normalizeAccountPreferences({ countryCode: user?.countryCode, preferredCurrency: user?.preferredCurrency, preferredLanguage: user?.preferredLanguage, deviceApproval: user?.deviceApproval }));
  }, [user?.countryCode, user?.deviceApproval, user?.preferredCurrency, user?.preferredLanguage]);

  useEffect(() => {
    if (user?.preferredTheme === "dark" || user?.preferredTheme === "light" || user?.preferredTheme === "system") setTheme(user.preferredTheme);
  }, [setTheme, user?.preferredTheme]);

  const ensureAuthenticated = () => {
    if (appAuthenticated) return true;
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
      setUsername(normalizedUsername);
      setUsernameEditing(false);
      toast.success(`@${normalizedUsername} saved.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update your username.");
    }
  };

  const uploadProfileImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !ensureAuthenticated()) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return toast.error("Choose a JPEG, PNG, or WebP image.");
    try {
      const dataUrl = await prepareAvatarDataUrl(file);
      await uploadAvatar.mutateAsync({ dataUrl });
      toast.success("Profile photo updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Profile photo could not be updated.");
    }
  };

  const savePreference = async (input: Parameters<typeof normalizeAccountPreferences>[0]) => {
    const next = normalizeAccountPreferences(input);
    setPreferences(next);
    setLanguage(next.preferredLanguage);
    if (!appAuthenticated) return;
    try {
      await profileUpdate.mutateAsync({ ...next, embeddedWalletAddress: address ?? undefined });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your account preferences.");
    }
  };

  const selectTheme = async (value: ThemeOption) => {
    setTheme(value);
    if (!appAuthenticated) return;
    try {
      await profileUpdate.mutateAsync({ preferredTheme: value, embeddedWalletAddress: address ?? undefined });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your theme preference.");
    }
  };

  const provisionSeraApiKey = async () => {
    if (!ensureAuthenticated()) return;
    if (!ownerAddress) return toast.error("Connect an Ethereum wallet before enabling Sera access.");
    try {
      setSeraKeyBusy(true);
      const timestamp = Number((seraTime.data as { timestamp?: number } | undefined)?.timestamp ?? Math.floor(Date.now() / 1000));
      const config = seraConfig.data as { chain_id?: number; sera_address?: string } | undefined;
      const typedData = getSeraApiKeyManagementTypedData(ownerAddress, timestamp, { chainId: config?.chain_id, verifyingContract: config?.sera_address });
      const signature = signPrivyTypedData ? await signPrivyTypedData(ownerAddress, typedData) : await signInjectedTypedData(ownerAddress, typedData);
      await createSeraApiKey.mutateAsync({ ownerAddress, timestamp, signature, label: "SeraPay wallet" });
      toast.success("Sera access enabled for this wallet.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sera access could not be enabled.");
    } finally {
      setSeraKeyBusy(false);
    }
  };

  const revokeSeraAccess = async () => {
    if (!ownerAddress) return;
    try {
      setSeraKeyBusy(true);
      await revokeSeraApiKey.mutateAsync({ ownerAddress });
      toast.success("Sera access revoked for this wallet.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sera access could not be revoked.");
    } finally {
      setSeraKeyBusy(false);
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
      toast.success("Passkey added.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The passkey setup was not completed.");
    }
  };

  const enrollWalletMfa = async () => {
    if (!ensureAuthenticated()) return;
    try {
      await enrollPasskeyMfa();
      toast.success("Wallet approval protection updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Wallet approval setup was not completed.");
    }
  };

  const identityName = user?.name ?? displayName ?? (username ? `@${username}` : "SeraPay account");
  const fallbackUsername = identityName.replace(/^@/, "").trim().split(/\s+/)[0].toLowerCase() || "serapay";
  const identityAvatar = resolveMediaUrl(user?.avatarUrl ?? avatarUrl);
  const initial = identityName.slice(0, 1).toUpperCase();
  const usernameStatus = !appAuthenticated ? "Sign in to edit" : !usernameValidity.valid ? usernameValidity.message : normalizedUsername === user?.username ? "Current username" : availability.isFetching ? "Checking availability…" : availability.data?.available ? "Available" : availability.data ? "Taken" : "Choose a username";

  return (
    <section className="space-y-4">
      {showProfile ? <section className="liquid-glass rounded-2xl p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => avatarInputRef.current?.click()} className="group relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border border-[#7161DF]/40 bg-white text-base font-semibold text-black shadow-[0_0_30px_rgba(113,97,223,0.2)]" aria-label="Edit profile photo">
            {identityAvatar ? <img src={identityAvatar} alt="Profile" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : initial}
            <span className="absolute inset-0 grid place-items-center bg-[#7161DF]/85 text-white opacity-0 transition group-hover:opacity-100"><ImagePlus className="h-5 w-5" /></span>
          </button>
          <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadProfileImage} className="sr-only" />
          <div className="min-w-0 flex-1">
            {usernameEditing ? <><Input autoFocus value={username} onChange={event => setUsername(event.target.value)} onKeyDown={event => { if (event.key === "Enter") void saveUsername(); if (event.key === "Escape") setUsernameEditing(false); }} className="h-10 border-[#7161DF]/50 bg-black/20 text-sm text-white" aria-label="Username" /><p className={cn("mt-1 text-[11px]", usernameStatus === "Available" || usernameStatus === "Current username" ? "text-[#9b90f5]" : usernameStatus === "Taken" || !usernameValidity.valid ? "text-red-300" : "text-white/45")}>{usernameStatus}</p></> : <><p className="truncate text-sm font-semibold text-white">@{username || fallbackUsername}</p>{identityName && identityName.toLowerCase() !== (username || "").toLowerCase() ? <p className="mt-1 truncate text-xs text-white/45">{identityName}</p> : null}</>}
          </div>
          {usernameEditing ? <Button onClick={() => void saveUsername()} disabled={profileUpdate.isPending || !usernameValidity.valid || Boolean(availability.data && !availability.data.available)} size="sm" className="rounded-xl bg-[#7161DF] text-white hover:bg-[#6656d4]"><Check className="h-4 w-4" />Save</Button> : <Button onClick={() => setUsernameEditing(true)} variant="ghost" size="icon-sm" className="text-white/55 hover:bg-[#7161DF]/15 hover:text-[#b8b0ff]" aria-label="Edit username"><Pencil className="h-4 w-4" /></Button>}
        </div>
      </section> : null}
{showPreferences ?
      <section className="liquid-glass rounded-3xl p-4 sm:p-5">
        <SectionHeading icon={Palette} title="Settings and preferences" />
        <div className="mt-5 space-y-5">
          <div><Subheading icon={Globe2} title="Regional preferences" /><div className="mt-3 grid gap-3 sm:grid-cols-3"><PreferenceSelect label="Country or region" value={preferences.countryCode} onChange={countryCode => { const country = COUNTRY_OPTIONS.find(option => option.code === countryCode); void savePreference({ ...preferences, countryCode, preferredCurrency: country?.currency ?? preferences.preferredCurrency }); }} options={COUNTRY_OPTIONS.map(option => ({ value: option.code, label: option.label }))} /><PreferenceSelect label="Default currency" value={preferences.preferredCurrency} onChange={preferredCurrency => void savePreference({ ...preferences, preferredCurrency })} options={CURRENCY_OPTIONS.map(value => ({ value, label: value }))} /><PreferenceSelect label="Language" value={preferences.preferredLanguage} onChange={preferredLanguage => void savePreference({ ...preferences, preferredLanguage })} options={LANGUAGE_OPTIONS.map(option => ({ value: option.code, label: option.label }))} /></div></div>
          <div className="border-t border-white/10 pt-5"><Subheading icon={Palette} title="Appearance" /><div className="mt-3 grid grid-cols-3 gap-2">{themeOptions.map(option => <button key={option.value} onClick={() => void selectTheme(option.value)} className={cn("rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition", theme === option.value ? "border-[#7161DF] bg-[#7161DF] text-white shadow-[0_0_22px_rgba(113,97,223,0.2)]" : "border-white/12 text-white/60 hover:border-[#7161DF]/50 hover:text-white")}>{option.label}</button>)}</div></div>
          <div className="border-t border-white/10 pt-5"><Subheading icon={KeyRound} title="Sera access" /><p className="mt-2 text-xs leading-5 text-white/50">Protected wallet balances and activity use a server-encrypted key for this wallet.</p><div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">{seraKeyStatus.error ? <div className="flex items-start gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-3 text-xs leading-5 text-amber-100/85" role="status"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><span>Sera access storage needs the latest production database migration before this wallet can be enabled.</span></div> : seraKeyStatus.data?.configured ? <><span className="text-xs text-[#b8b0ff]">Connected · {seraKeyStatus.data.fingerprint}</span><Button onClick={revokeSeraAccess} disabled={seraKeyBusy} variant="outline" className="h-9 rounded-xl border-white/15 text-white hover:bg-[#7161DF] hover:text-white">Revoke access</Button></> : <Button onClick={provisionSeraApiKey} disabled={seraKeyBusy || !ownerAddress} className="h-9 rounded-xl bg-[#7161DF] text-white hover:bg-[#6656d4]">{seraKeyBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}Enable Sera access</Button>}</div></div>
          <div className="border-t border-white/10 pt-5"><Subheading icon={ShieldCheck} title="Device approval" /><div className="mt-3 grid gap-2 sm:grid-cols-2"><Button onClick={protectWithPasskey} variant="outline" className="h-9 rounded-xl border-white/15 text-white hover:bg-[#7161DF] hover:text-white">Add or update passkey</Button><Button onClick={enrollWalletMfa} variant="outline" className="h-9 rounded-xl border-white/15 text-white hover:bg-[#7161DF] hover:text-white"><ShieldCheck className="h-4 w-4" />Secure approvals</Button></div></div>
          <div className="border-t border-white/10 pt-5"><Subheading icon={Download} title="Wallet export" /><Button onClick={requestWalletExport} variant="outline" className="mt-3 h-9 w-full rounded-xl border-white/15 text-white hover:bg-[#7161DF] hover:text-white sm:w-auto">Open secure export</Button></div>
        </div>
      </section> : null}
    </section>
  );
}

function SectionHeading({ icon: Icon, title }: { icon: typeof UserRound; title: string }) {
  return <div className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#7161DF]/35 bg-[#7161DF]/12 text-[#b8b0ff]"><Icon className="h-4 w-4" /></span><h2 className="text-sm font-medium text-white">{title}</h2></div>;
}

function Subheading({ icon: Icon, title }: { icon: typeof UserRound; title: string }) {
  return <div className="flex items-center gap-2 text-sm font-medium text-white"><Icon className="h-4 w-4 text-[#9b90f5]" />{title}</div>;
}

function PreferenceSelect({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return <div><Label className="text-xs text-foreground/65">{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger className="mt-2 h-10 border-border bg-background/70 text-foreground"><SelectValue /></SelectTrigger><SelectContent className="border-border bg-popover text-popover-foreground">{options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>;
}
