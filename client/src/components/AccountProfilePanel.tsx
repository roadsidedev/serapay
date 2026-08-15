import { useAuth } from "@/_core/hooks/useAuth";
import { ActivityJournal } from "@/components/ActivityJournal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSeraPrivy } from "@/contexts/PrivyContext";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { normalizeUsername, validateUsername } from "@shared/profile";
import { Code2, Download, History, Palette, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type ThemeOption = "light" | "dark" | "system";

const themeOptions: Array<{ value: ThemeOption; label: string; copy: string }> = [
  { value: "dark", label: "Dark", copy: "Low-light wallet surface" },
  { value: "light", label: "Light", copy: "High-contrast daytime mode" },
  { value: "system", label: "System", copy: "Follow your device" },
];

export function AccountProfilePanel({ address, onOpenBuild }: { address: string | null; onOpenBuild: () => void }) {
  const { user } = useAuth();
  const { authenticated, configured, exportWallet, login, usernameSuggestion } = useSeraPrivy();
  const { theme, setTheme } = useTheme();
  const [username, setUsername] = useState(user?.username ?? "");
  const normalizedUsername = useMemo(() => normalizeUsername(username), [username]);
  const usernameValidity = validateUsername(normalizedUsername);
  const availabilityInput = useMemo(() => ({ username: normalizedUsername }), [normalizedUsername]);
  const availability = trpc.profile.usernameAvailability.useQuery(availabilityInput, {
    enabled: authenticated && usernameValidity.valid && normalizedUsername !== user?.username,
    retry: false,
  });
  const utils = trpc.useUtils();
  const profileUpdate = trpc.profile.update.useMutation({
    onSuccess: () => utils.auth.me.invalidate(),
  });

  useEffect(() => {
    if (user?.username) setUsername(user.username);
    else if (usernameSuggestion) setUsername(usernameSuggestion);
  }, [user?.username, usernameSuggestion]);

  useEffect(() => {
    if (user?.preferredTheme === "dark" || user?.preferredTheme === "light" || user?.preferredTheme === "system") setTheme?.(user.preferredTheme);
  }, [setTheme, user?.preferredTheme]);

  const saveUsername = async () => {
    if (!authenticated) {
      if (configured) login();
      else toast.error("Set VITE_PRIVY_APP_ID to activate social onboarding.");
      return;
    }
    if (!usernameValidity.valid) {
      toast.error(usernameValidity.message);
      return;
    }
    if (availability.data && !availability.data.available) {
      toast.error("That username is already taken.");
      return;
    }
    try {
      await profileUpdate.mutateAsync({ username: normalizedUsername, embeddedWalletAddress: address ?? undefined });
      toast.success(`@${normalizedUsername} is now your SeraPay username.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update your SeraPay username.");
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
    if (!authenticated || !address) {
      toast.error("Sign in with Privy and create an embedded wallet before exporting it.");
      return;
    }
    try {
      await exportWallet();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Privy could not open the secure wallet-export flow.");
    }
  };

  const status = !authenticated ? "Sign in to claim" : !usernameValidity.valid ? usernameValidity.message : normalizedUsername === user?.username ? "Current username" : availability.isFetching ? "Checking availability…" : availability.data?.available ? "Available" : availability.data ? "Taken" : "Choose a username";

  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-white/[0.08] bg-[#111815] p-5 sm:p-6">
        <div className="flex items-start gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#b3ff3e]/10 text-[#b3ff3e]"><UserRound className="h-4 w-4" /></div><div><p className="text-sm font-medium text-white">SeraPay identity</p><p className="mt-1 text-xs leading-5 text-white/42">Your public handle is derived from your social account, then claimed and protected through your SeraPay profile.</p></div></div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row"><div className="min-w-0 flex-1"><Input value={username} onChange={event => setUsername(event.target.value)} onBlur={() => setUsername(normalizedUsername)} placeholder="ayo_pay" aria-label="SeraPay username" className="h-10 border-white/[0.10] bg-white/[0.04] text-white placeholder:text-white/25" /><p className={cn("mt-2 text-xs", status === "Available" || status === "Current username" ? "text-[#d9ff9b]" : status === "Taken" || !usernameValidity.valid ? "text-amber-200" : "text-white/38")}>{status}</p></div><Button onClick={saveUsername} disabled={profileUpdate.isPending || !usernameValidity.valid || Boolean(availability.data && !availability.data.available)} className="h-10 rounded-xl bg-[#b3ff3e] text-[#0b1a0e] hover:bg-[#c6ff66]">Claim username</Button></div>
      </div>

      <div className="rounded-3xl border border-white/[0.08] bg-[#111815] p-5 sm:p-6"><div className="flex items-start gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.06] text-white/70"><Palette className="h-4 w-4" /></div><div><p className="text-sm font-medium text-white">Appearance</p><p className="mt-1 text-xs leading-5 text-white/42">Your choice is stored locally now and saved to your SeraPay profile when you are authenticated.</p></div></div><div className="mt-5 grid gap-2 sm:grid-cols-3">{themeOptions.map(option => <button key={option.value} onClick={() => selectTheme(option.value)} className={cn("rounded-2xl border p-3 text-left transition", theme === option.value ? "border-[#b3ff3e]/35 bg-[#b3ff3e]/[0.08]" : "border-white/[0.08] bg-white/[0.025] hover:border-white/[0.16]")}><p className={cn("text-sm font-medium", theme === option.value ? "text-[#d9ff9b]" : "text-white/80")}>{option.label}</p><p className="mt-1 text-[11px] leading-4 text-white/40">{option.copy}</p></button>)}</div></div>

      <div className="grid gap-4 lg:grid-cols-2"><div className="rounded-3xl border border-white/[0.08] bg-[#111815] p-5"><div className="flex items-start gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.06] text-white/70"><Download className="h-4 w-4" /></div><div><p className="text-sm font-medium text-white">Embedded wallet management</p><p className="mt-1 text-xs leading-5 text-white/42">Privy handles secure recovery and export in its own protected window. SeraPay never receives your private key or recovery phrase.</p></div></div><Button onClick={requestWalletExport} variant="outline" className="mt-5 h-10 w-full rounded-xl border-white/[0.10] bg-transparent text-xs text-white/75 hover:bg-white/[0.06] hover:text-white">Open secure Privy export</Button></div><div className="rounded-3xl border border-white/[0.08] bg-[#111815] p-5"><div className="flex items-start gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.06] text-white/70"><Code2 className="h-4 w-4" /></div><div><p className="text-sm font-medium text-white">Developer tools</p><p className="mt-1 text-xs leading-5 text-white/42">Stage a local mini-app in a contained wallet shell, then run the real manifest and reachability checks before submitting.</p></div></div><Button onClick={onOpenBuild} variant="outline" className="mt-5 h-10 w-full rounded-xl border-white/[0.10] bg-transparent text-xs text-white/75 hover:bg-white/[0.06] hover:text-white">Open developer suite</Button></div></div>

      <details className="rounded-3xl border border-white/[0.08] bg-[#111815] p-5"><summary className="flex cursor-pointer list-none items-center gap-3 text-sm font-medium text-white"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.06] text-white/70"><History className="h-4 w-4" /></span>Activity history <Badge className="ml-auto border-white/[0.08] bg-white/[0.04] text-white/45 hover:bg-white/[0.04]">Wallet & Sera</Badge></summary><div className="mt-5 border-t border-white/[0.07] pt-5"><ActivityJournal address={address} isAuthenticated={authenticated} /></div></details>
    </section>
  );
}
